import { checkoutQuoteSchema } from "@delivery/validators";
import { NextResponse } from "next/server";
import { apiHandler, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { buildQuote } from "@/features/orders/quote";

// POST /api/v1/checkout/quote — totais oficiais do carrinho, calculados no servidor.
export const POST = apiHandler(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, checkoutQuoteSchema);
  const { quote, distanceKm } = await buildQuote(user.id, input);
  return NextResponse.json({ ...quote, distanceKm });
});
