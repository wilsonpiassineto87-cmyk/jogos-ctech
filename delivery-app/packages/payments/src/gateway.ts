// Contrato comum aos provedores. O resto do sistema só conhece esta interface.

// Espelha o enum PaymentStatus do Prisma.
export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type OnlinePaymentMethod = "PIX" | "CREDIT_CARD" | "DEBIT_CARD";

export type CreatePaymentInput = {
  orderId: string;
  amountCents: number;
  method: OnlinePaymentMethod;
  /** Mesmo valor de Payment.idempotencyKey: o provedor não cobra duas vezes. */
  idempotencyKey: string;
  description: string;
  payer: { email: string; name?: string };
  /** Token gerado no navegador (Bricks / Elements). Dados do cartão nunca chegam ao servidor. */
  cardToken?: string;
  /** Bandeira retornada pelo Brick do Mercado Pago (visa, master...). */
  cardPaymentMethodId?: string;
  notificationUrl?: string;
  pixExpiresInMinutes?: number;
};

export type CreatePaymentResult = {
  providerPaymentId: string;
  status: PaymentStatus;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  pixExpiresAt?: Date;
  /** Stripe: usado pelo Elements para confirmar o pagamento no navegador. */
  clientSecret?: string;
  raw: unknown;
};

export type VerifiedWebhook = {
  /** Id do evento no provedor, para deduplicar em WebhookEvent. */
  eventId: string;
  type: string;
  /** Id do pagamento afetado; consulte o status atual com getPayment. */
  providerPaymentId: string | null;
  payload: unknown;
};

export type WebhookRequest = { headers: Headers; rawBody: string; url: URL };

export interface PaymentGateway {
  readonly provider: "STRIPE" | "MERCADO_PAGO";
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPayment(providerPaymentId: string): Promise<{ status: PaymentStatus; raw: unknown }>;
  refund(providerPaymentId: string, amountCents?: number): Promise<void>;
  /** Retorna null se a assinatura for inválida. */
  verifyWebhook(req: WebhookRequest): Promise<VerifiedWebhook | null>;
}

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
