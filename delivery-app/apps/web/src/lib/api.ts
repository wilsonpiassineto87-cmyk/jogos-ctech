import "server-only";
import { InvalidTransitionError, PricingError } from "@delivery/core";
import { PaymentProviderError } from "@delivery/payments";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Dados inválidos", code: "VALIDATION", issues: error.issues }, { status: 422 });
  }
  if (error instanceof PricingError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
  }
  if (error instanceof InvalidTransitionError) {
    return NextResponse.json({ error: error.message, code: "INVALID_TRANSITION" }, { status: 409 });
  }
  if (error instanceof PaymentProviderError) {
    console.error(error, error.details);
    return NextResponse.json({ error: "Falha no provedor de pagamento", code: "PAYMENT_PROVIDER" }, { status: 502 });
  }
  console.error(error);
  return NextResponse.json({ error: "Erro interno", code: "INTERNAL" }, { status: 500 });
}

/** Envolve um Route Handler convertendo exceções conhecidas em respostas JSON. */
export function apiHandler<Ctx>(fn: (req: NextRequest, ctx: Ctx) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export async function parseJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const body: unknown = await req.json().catch(() => {
    throw new HttpError(400, "JSON inválido", "BAD_JSON");
  });
  return schema.parse(body);
}

export function parseQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}
