import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { requireStoreMember } from "@/lib/authz";
import { acceptOrder } from "@/features/orders/status";

type Ctx = { params: Promise<{ storeId: string; orderId: string }> };

// POST /api/v1/merchant/stores/:storeId/orders/:orderId/accept
export const POST = apiHandler(async (_req, { params }: Ctx) => {
  const { storeId, orderId } = await params;
  const { user } = await requireStoreMember(storeId);
  await acceptOrder({ orderId, storeId, userId: user.id });
  return NextResponse.json({ orderId, status: "ACCEPTED" });
});
