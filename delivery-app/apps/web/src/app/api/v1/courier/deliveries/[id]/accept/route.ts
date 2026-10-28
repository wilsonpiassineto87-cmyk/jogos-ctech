import { NextResponse } from "next/server";
import { apiHandler, HttpError } from "@/lib/api";
import { requireCourier } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { channels, publish } from "@/lib/realtime";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/v1/courier/deliveries/:id/accept — o primeiro entregador que aceitar fica com a corrida.
export const POST = apiHandler(async (_req, { params }: Ctx) => {
  const { id } = await params;
  const courier = await requireCourier();

  const active = await prisma.delivery.count({
    where: { courierId: courier.id, status: { in: ["ASSIGNED", "AT_STORE", "PICKED_UP"] } },
  });
  if (active > 0) throw new HttpError(409, "Finalize a corrida atual antes de aceitar outra", "COURIER_BUSY");

  // Aceite atômico: a condição no WHERE garante que só um UPDATE vence.
  const { count } = await prisma.delivery.updateMany({
    where: { id, status: "WAITING_COURIER", courierId: null },
    data: { courierId: courier.id, status: "ASSIGNED", assignedAt: new Date() },
  });
  if (count === 0) throw new HttpError(409, "Corrida já aceita por outro entregador", "DELIVERY_TAKEN");

  const delivery = await prisma.delivery.findUniqueOrThrow({
    where: { id },
    select: { orderId: true, order: { select: { storeId: true } } },
  });

  await Promise.all([
    publish(channels.store(delivery.order.storeId), "delivery.taken", { deliveryId: id, courierName: courier.name }),
    publish(channels.order(delivery.orderId), "order.status_changed", { courierAssigned: true }),
  ]);

  return NextResponse.json({ deliveryId: id, status: "ASSIGNED" });
});
