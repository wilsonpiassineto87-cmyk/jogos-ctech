import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireCourier } from "@/lib/authz";
import { acceptDelivery } from "@/features/courier/service";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/v1/courier/deliveries/:id/accept — o primeiro entregador que aceitar fica com a corrida.
export const POST = apiHandler(async (_req, { params }: Ctx) => {
  const { id } = await params;
  const courier = await requireCourier();
  await acceptDelivery(courier, id);
  return NextResponse.json({ deliveryId: id, status: "ASSIGNED" });
});
