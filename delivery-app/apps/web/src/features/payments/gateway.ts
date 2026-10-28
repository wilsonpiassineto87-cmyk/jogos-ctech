import "server-only";
import { MercadoPagoGateway, StripeGateway, type PaymentGateway } from "@delivery/payments";
import { HttpError } from "@/lib/api";
import { env } from "@/lib/env";

let mercadoPago: MercadoPagoGateway | undefined;
let stripe: StripeGateway | undefined;

export function getMercadoPago(): MercadoPagoGateway {
  if (!env.MERCADOPAGO_ACCESS_TOKEN || !env.MERCADOPAGO_WEBHOOK_SECRET) {
    throw new HttpError(503, "Mercado Pago não configurado", "PAYMENTS_DISABLED");
  }
  return (mercadoPago ??= new MercadoPagoGateway(env.MERCADOPAGO_ACCESS_TOKEN, env.MERCADOPAGO_WEBHOOK_SECRET));
}

export function getStripe(): StripeGateway {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    throw new HttpError(503, "Stripe não configurado", "PAYMENTS_DISABLED");
  }
  return (stripe ??= new StripeGateway(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET));
}

/** Provedor padrão para pagamentos online. */
export function getDefaultGateway(): PaymentGateway {
  return getMercadoPago();
}
