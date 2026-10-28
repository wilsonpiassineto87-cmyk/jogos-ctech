import Stripe from "stripe";
import {
  PaymentProviderError,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentGateway,
  type PaymentStatus,
  type VerifiedWebhook,
  type WebhookRequest,
} from "./gateway";

const STATUS: Record<Stripe.PaymentIntent.Status, PaymentStatus> = {
  requires_payment_method: "PENDING",
  requires_confirmation: "PENDING",
  requires_action: "PENDING",
  processing: "PROCESSING",
  requires_capture: "AUTHORIZED",
  succeeded: "PAID",
  canceled: "CANCELLED",
};

export class StripeGateway implements PaymentGateway {
  readonly provider = "STRIPE" as const;
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string,
  ) {
    this.stripe = new Stripe(secretKey);
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (input.method === "PIX") throw new PaymentProviderError("Use o Mercado Pago para Pix");

    // O navegador confirma o PaymentIntent com o clientSecret via Stripe Elements.
    const intent = await this.stripe.paymentIntents.create(
      {
        amount: input.amountCents,
        currency: "brl",
        description: input.description,
        receipt_email: input.payer.email,
        metadata: { orderId: input.orderId },
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey: input.idempotencyKey },
    );

    return {
      providerPaymentId: intent.id,
      status: STATUS[intent.status],
      clientSecret: intent.client_secret ?? undefined,
      raw: intent,
    };
  }

  async getPayment(providerPaymentId: string) {
    const intent = await this.stripe.paymentIntents.retrieve(providerPaymentId);
    return { status: STATUS[intent.status], raw: intent };
  }

  async refund(providerPaymentId: string, amountCents?: number): Promise<void> {
    await this.stripe.refunds.create({ payment_intent: providerPaymentId, amount: amountCents });
  }

  async verifyWebhook({ headers, rawBody }: WebhookRequest): Promise<VerifiedWebhook | null> {
    const signature = headers.get("stripe-signature");
    if (!signature) return null;
    try {
      const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
      const object = event.data.object as { object?: string; id?: string };
      return {
        eventId: event.id,
        type: event.type,
        providerPaymentId: object.object === "payment_intent" ? (object.id ?? null) : null,
        payload: event,
      };
    } catch {
      return null;
    }
  }
}
