import "server-only";
import {
  assertTransition,
  courierFeeCents,
  distanceKm,
  generateDeliveryPin,
  type OrderActor,
  type OrderStatus,
} from "@delivery/core";
import { HttpError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { channels, publish } from "@/lib/realtime";
import { getPlatformSettings } from "./quote";

const TIMESTAMP: Partial<Record<OrderStatus, "acceptedAt" | "readyAt" | "deliveredAt" | "cancelledAt">> = {
  ACCEPTED: "acceptedAt",
  READY_FOR_PICKUP: "readyAt",
  DELIVERED: "deliveredAt",
  CANCELLED: "cancelledAt",
  REJECTED: "cancelledAt",
};

/**
 * Muda o status de um pedido validando a transição e quem a faz. O status atual vai
 * no WHERE, então duas ações simultâneas não avançam o pedido duas vezes.
 * `scope` restringe a busca (ex.: storeId da loja, customerId do cliente).
 */
export async function transitionOrder(args: {
  orderId: string;
  to: OrderStatus;
  actor: OrderActor;
  userId: string | null;
  scope?: { storeId?: string; customerId?: string };
  note?: string;
}) {
  const order = await prisma.order.findFirst({
    where: { id: args.orderId, ...args.scope },
    select: { status: true, storeId: true },
  });
  if (!order) throw new HttpError(404, "Pedido não encontrado", "NOT_FOUND");
  assertTransition(order.status, args.to, args.actor);

  const stamp = TIMESTAMP[args.to];
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: args.orderId, status: order.status },
      data: {
        status: args.to,
        ...(stamp ? { [stamp]: new Date() } : {}),
        ...(args.to === "CANCELLED" || args.to === "REJECTED" ? { cancelReason: args.note } : {}),
      },
    });
    if (count === 0) throw new HttpError(409, "O pedido mudou de status, recarregue a página", "STALE_ORDER");
    await tx.orderStatusHistory.create({
      data: { orderId: args.orderId, fromStatus: order.status, toStatus: args.to, changedById: args.userId, note: args.note },
    });
    // Pedido encerrado antes da entrega: a corrida deixa de estar disponível.
    if (args.to === "CANCELLED" || args.to === "REJECTED") {
      await tx.delivery.updateMany({
        where: { orderId: args.orderId, status: { in: ["WAITING_COURIER", "ASSIGNED", "AT_STORE"] } },
        data: { status: "CANCELLED" },
      });
    }
  });

  await Promise.all([
    publish(channels.order(args.orderId), "order.status_changed", { status: args.to }),
    publish(channels.store(order.storeId), "order.status_changed", { orderId: args.orderId, status: args.to }),
  ]);
}

/** Loja aceita o pedido: muda o status e cria a corrida (com PIN) para os entregadores. */
export async function acceptOrder(args: { orderId: string; storeId: string; userId: string }) {
  const order = await prisma.order.findFirst({
    where: { id: args.orderId, storeId: args.storeId },
    select: { status: true, deliveryAddress: true, store: { select: { latitude: true, longitude: true } } },
  });
  if (!order) throw new HttpError(404, "Pedido não encontrado", "NOT_FOUND");
  assertTransition(order.status, "ACCEPTED", "STORE");

  const settings = await getPlatformSettings();
  const dropoff = order.deliveryAddress as { latitude: number; longitude: number };
  const km = distanceKm(order.store, dropoff);

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: args.orderId, storeId: args.storeId, status: order.status },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    if (count === 0) throw new HttpError(409, "O pedido mudou de status, recarregue a página", "STALE_ORDER");

    await tx.orderStatusHistory.create({
      data: { orderId: args.orderId, fromStatus: order.status, toStatus: "ACCEPTED", changedById: args.userId },
    });
    await tx.delivery.create({
      data: {
        orderId: args.orderId,
        pickupLatitude: order.store.latitude,
        pickupLongitude: order.store.longitude,
        dropoffLatitude: dropoff.latitude,
        dropoffLongitude: dropoff.longitude,
        distanceMeters: Math.round(km * 1000),
        courierFeeCents: courierFeeCents(settings.courierBaseFeeCents, settings.courierFeePerKmCents, km),
        confirmationCode: generateDeliveryPin(),
      },
    });
  });

  await publish(channels.order(args.orderId), "order.status_changed", { status: "ACCEPTED" });
}
