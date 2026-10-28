import { createOrderSchema } from "@delivery/validators";
import { NextResponse } from "next/server";
import { apiHandler, HttpError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { createOrder } from "@/features/orders/create-order";

// GET /api/v1/orders?cursor=<id> — pedidos do cliente logado
export const GET = apiHandler(async (req) => {
  const user = await requireUser();
  const cursor = req.nextUrl.searchParams.get("cursor");
  const orders = await prisma.order.findMany({
    where: { customerId: user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      code: true,
      status: true,
      totalCents: true,
      createdAt: true,
      store: { select: { name: true, slug: true, logoUrl: true } },
    },
  });
  const hasMore = orders.length > 20;
  const data = orders.slice(0, 20);
  return NextResponse.json({ data, nextCursor: hasMore ? data.at(-1)!.id : null });
});

// POST /api/v1/orders  (header obrigatório: Idempotency-Key)
export const POST = apiHandler(async (req) => {
  const user = await requireUser();
  const idempotencyKey = req.headers.get("idempotency-key");
  if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 100) {
    throw new HttpError(400, "Header Idempotency-Key obrigatório (16 a 100 caracteres)", "IDEMPOTENCY_KEY");
  }
  const input = await parseJson(req, createOrderSchema);
  // Prefixo com o usuário: a chave de uma pessoa nunca colide com a de outra.
  const order = await createOrder(user, input, `${user.id}:${idempotencyKey}`);
  return NextResponse.json(order, { status: 201 });
});
