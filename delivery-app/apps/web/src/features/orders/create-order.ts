import "server-only";
import { generateOrderCode } from "@delivery/core";
import { Prisma } from "@delivery/db";
import type { CreateOrderInput } from "@delivery/validators";
import { HttpError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { channels, publish } from "@/lib/realtime";
import { getDefaultGateway } from "@/features/payments/gateway";
import { buildQuote } from "./quote";

type Customer = { id: string; email: string; name: string };

const isUniqueViolation = (e: unknown, field: string) =>
  e instanceof Prisma.PrismaClientKnownRequestError &&
  e.code === "P2002" &&
  String(e.meta?.target ?? "").includes(field);

/**
 * Cria o pedido com os valores recalculados no servidor.
 * - `idempotencyKey` (header Idempotency-Key) evita pedido/cobrança duplicados em retry.
 * - Dinheiro na entrega vai direto para PLACED; online fica em PENDING_PAYMENT até o webhook.
 * - A chamada ao gateway acontece FORA da transação do banco.
 */
export async function createOrder(customer: Customer, input: CreateOrderInput, idempotencyKey: string) {
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey }, select: { orderId: true } });
  if (existing) return getCreatedOrder(existing.orderId);

  const { quote, store, address } = await buildQuote(customer.id, input);
  // Pago na entrega (dinheiro ou maquininha): vai direto para a loja, sem gateway.
  const isCash = input.paymentMethod === "CASH" || (input.payOnDelivery === true && input.paymentMethod !== "PIX");
  if (input.paymentMethod === "CASH" && input.changeForCents !== undefined && input.changeForCents < quote.totalCents) {
    throw new HttpError(422, "O troco deve ser maior que o total", "INVALID_CHANGE");
  }

  const status = isCash ? "PLACED" : "PENDING_PAYMENT";
  let order: { id: string; paymentId: string } | undefined;

  for (let attempt = 0; !order && attempt < 3; attempt++) {
    try {
      const created = await prisma.order.create({
        data: {
          code: generateOrderCode(),
          customerId: customer.id,
          storeId: store.id,
          addressId: address.id,
          status,
          placedAt: isCash ? new Date() : null,
          deliveryAddress: {
            street: address.street,
            number: address.number,
            complement: address.complement,
            neighborhood: address.neighborhood,
            city: address.city,
            state: address.state,
            zipCode: address.zipCode,
            reference: address.reference,
            latitude: address.latitude,
            longitude: address.longitude,
          },
          customerNotes: input.customerNotes,
          subtotalCents: quote.subtotalCents,
          deliveryFeeCents: quote.deliveryFeeCents,
          serviceFeeCents: quote.serviceFeeCents,
          discountCents: quote.discountCents,
          totalCents: quote.totalCents,
          commissionBps: quote.commissionBps,
          commissionCents: quote.commissionCents,
          paymentMethod: input.paymentMethod,
          changeForCents: input.paymentMethod === "CASH" ? input.changeForCents : null,
          estimatedDeliveryAt: new Date(Date.now() + (store.prepTimeMinutes + 20) * 60_000),
          items: {
            create: quote.lines.map((l) => ({
              productId: l.productId,
              productName: l.productName,
              unitPriceCents: l.unitPriceCents,
              quantity: l.quantity,
              totalCents: l.totalCents,
              options: l.options,
              notes: l.notes,
            })),
          },
          statusHistory: { create: { toStatus: status, changedById: customer.id } },
          payments: {
            create: {
              provider: isCash ? "OFFLINE" : "MERCADO_PAGO",
              method: input.paymentMethod,
              amountCents: quote.totalCents,
              idempotencyKey,
            },
          },
        },
        select: { id: true, payments: { select: { id: true } } },
      });
      order = { id: created.id, paymentId: created.payments[0]!.id };
    } catch (e) {
      // Requisição concorrente com a mesma chave venceu a corrida.
      if (isUniqueViolation(e, "idempotencyKey")) {
        const winner = await prisma.payment.findUniqueOrThrow({ where: { idempotencyKey } });
        return getCreatedOrder(winner.orderId);
      }
      if (!isUniqueViolation(e, "code")) throw e; // colisão de código curto: tenta de novo
    }
  }
  if (!order) throw new HttpError(500, "Não foi possível gerar o código do pedido", "ORDER_CODE");

  if (isCash) {
    await publish(channels.store(store.id), "order.new", { orderId: order.id });
    return getCreatedOrder(order.id);
  }

  try {
    const result = await getDefaultGateway().createPayment({
      orderId: order.id,
      amountCents: quote.totalCents,
      method: input.paymentMethod as Exclude<CreateOrderInput["paymentMethod"], "CASH">,
      idempotencyKey,
      description: `Pedido ${store.name}`,
      payer: { email: customer.email, name: customer.name },
      cardToken: input.cardToken,
      cardPaymentMethodId: input.cardPaymentMethodId,
      notificationUrl: env.AUTH_URL ? `${env.AUTH_URL}/api/webhooks/mercadopago` : undefined,
    });
    await prisma.payment.update({
      where: { id: order.paymentId },
      data: {
        providerPaymentId: result.providerPaymentId,
        status: result.status,
        pixQrCode: result.pixQrCode,
        pixExpiresAt: result.pixExpiresAt,
        rawResponse: result.raw as object,
      },
    });
  } catch (error) {
    await prisma.payment.update({
      where: { id: order.paymentId },
      data: { status: "FAILED", failureReason: error instanceof Error ? error.message : "erro desconhecido" },
    });
    throw error;
  }

  return getCreatedOrder(order.id);
}

async function getCreatedOrder(orderId: string) {
  return prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      code: true,
      status: true,
      totalCents: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, method: true, pixQrCode: true, pixExpiresAt: true },
      },
    },
  });
}
