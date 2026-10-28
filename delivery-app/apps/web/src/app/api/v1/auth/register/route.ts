import { registerSchema } from "@delivery/validators";
import { NextResponse } from "next/server";
import { apiHandler, parseJson } from "@/lib/api";
import { registerCustomer } from "@/features/auth/register";

// TODO: rate limit por IP (Upstash Ratelimit) antes de ir para produção.
export const POST = apiHandler(async (req) => {
  const input = await parseJson(req, registerSchema);
  const user = await registerCustomer(input);
  return NextResponse.json(user, { status: 201 });
});
