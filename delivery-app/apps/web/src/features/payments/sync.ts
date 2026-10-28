import "server-only";
import { assertTransition } from "@delivery/core";
import type { PaymentGateway } from "@delivery/payments";
import { prisma } from "@/lib/db";
import { channels, publish } from "@/lib/realtime";

/**
 * Consulta o status ATUAL no provedor (nunca confia só no corpo do webhook)
 * e avança o pedido de PENDING_PAYMENT para PLACED quando o pagamento é aprovado.
 */
export async function syncPaymentStatus(gateway: PaymentGateway, providerPaymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId },
    select: { id: true, status: true, orderId: true, order: { select: { status: true, storeId: true } } },
  });
  if (!payment) return;

  const { status, raw } = await gateway.getPayment(providerPaymentId);
  if (status === payment.status) return;

  const placed = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status, rawResponse: raw as object, paidAt: status === "PAID" ? new Date() : undefined },
    });

    if (status !== "PAID" || payment.order.status !== "PENDING_PAYMENT") return false;
    assertTransition("PENDING_PAYMENT", "PLACED", "SYSTEM");

    // updateMany com o status no WHERE: se dois webhooks chegarem juntos, só um avança.
    const { count } = await tx.order.updateMany({
      where: { id: payment.orderId, status: "PENDING_PAYMENT" },
      data: { status: "PLACED", placedAt: new Date() },
    });
    if (count === 0) return false;

    await tx.orderStatusHistory.create({
      data: { orderId: payment.orderId, fromStatus: "PENDING_PAYMENT", toStatus: "PLACED", note: "Pagamento aprovado" },
    });
    return true;
  });

  if (placed) {
    await Promise.all([
      publish(channels.store(payment.order.storeId), "order.new", { orderId: payment.orderId }),
      publish(channels.order(payment.orderId), "order.status_changed", { status: "PLACED" }),
    ]);
  }
}
