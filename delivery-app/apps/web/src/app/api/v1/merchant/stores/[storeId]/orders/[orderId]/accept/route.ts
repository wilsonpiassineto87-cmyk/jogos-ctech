import { assertTransition, courierFeeCents, distanceKm, generateDeliveryPin } from "@delivery/core";
import { NextResponse } from "next/server";
import { apiHandler, HttpError } from "@/lib/api";
import { requireStoreMember } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { channels, publish } from "@/lib/realtime";
import { getPlatformSettings } from "@/features/orders/quote";

type Ctx = { params: Promise<{ storeId: string; orderId: string }> };

// POST /api/v1/merchant/stores/:storeId/orders/:orderId/accept
export const POST = apiHandler(async (_req, { params }: Ctx) => {
  const { storeId, orderId } = await params;
  const { user } = await requireStoreMember(storeId);

  // storeId no WHERE: uma loja nunca enxerga pedido de outra (isolamento do tenant).
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: { status: true, deliveryAddress: true, store: { select: { latitude: true, longitude: true } } },
  });
  if (!order) throw new HttpError(404, "Pedido não encontrado", "NOT_FOUND");
  assertTransition(order.status, "ACCEPTED", "STORE");

  const settings = await getPlatformSettings();
  const dropoff = order.deliveryAddress as { latitude: number; longitude: number };
  const km = distanceKm(order.store, dropoff);

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, storeId, status: order.status },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    if (count === 0) throw new HttpError(409, "O pedido mudou de status, recarregue", "STALE_ORDER");

    await tx.orderStatusHistory.create({
      data: { orderId, fromStatus: order.status, toStatus: "ACCEPTED", changedById: user.id },
    });
    await tx.delivery.create({
      data: {
        orderId,
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

  // TODO: publicar "delivery.available" no canal da região (geohash) para os entregadores online.
  await publish(channels.order(orderId), "order.status_changed", { status: "ACCEPTED" });
  return NextResponse.json({ orderId, status: "ACCEPTED" });
});
