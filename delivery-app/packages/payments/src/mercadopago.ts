import { createHmac, timingSafeEqual } from "node:crypto";
import {
  PaymentProviderError,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentGateway,
  type PaymentStatus,
  type VerifiedWebhook,
  type WebhookRequest,
} from "./gateway";

const API = "https://api.mercadopago.com";

const STATUS: Record<string, PaymentStatus> = {
  pending: "PENDING",
  in_process: "PROCESSING",
  authorized: "AUTHORIZED",
  approved: "PAID",
  rejected: "FAILED",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
  charged_back: "REFUNDED",
};

type MpPayment = {
  id: number;
  status: string;
  date_of_expiration?: string;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
};

export class MercadoPagoGateway implements PaymentGateway {
  readonly provider = "MERCADO_PAGO" as const;

  constructor(
    private readonly accessToken: string,
    private readonly webhookSecret: string,
  ) {}

  private async request<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
      },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new PaymentProviderError(`Mercado Pago ${res.status} em ${path}`, body);
    return body as T;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const isPix = input.method === "PIX";
    if (!isPix && (!input.cardToken || !input.cardPaymentMethodId)) {
      throw new PaymentProviderError("Pagamento com cartão exige cardToken e cardPaymentMethodId");
    }

    const expiresAt = new Date(Date.now() + (input.pixExpiresInMinutes ?? 30) * 60_000);
    const payment = await this.request<MpPayment>("/v1/payments", {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: JSON.stringify({
        transaction_amount: input.amountCents / 100,
        description: input.description,
        external_reference: input.orderId,
        notification_url: input.notificationUrl,
        payer: { email: input.payer.email, first_name: input.payer.name },
        ...(isPix
          ? { payment_method_id: "pix", date_of_expiration: expiresAt.toISOString() }
          : { token: input.cardToken, payment_method_id: input.cardPaymentMethodId, installments: 1 }),
      }),
    });

    const tx = payment.point_of_interaction?.transaction_data;
    return {
      providerPaymentId: String(payment.id),
      status: STATUS[payment.status] ?? "PENDING",
      pixQrCode: tx?.qr_code,
      pixQrCodeBase64: tx?.qr_code_base64,
      pixExpiresAt: isPix ? new Date(payment.date_of_expiration ?? expiresAt) : undefined,
      raw: payment,
    };
  }

  async getPayment(providerPaymentId: string) {
    const payment = await this.request<MpPayment>(`/v1/payments/${encodeURIComponent(providerPaymentId)}`);
    return { status: STATUS[payment.status] ?? "PENDING", raw: payment };
  }

  async refund(providerPaymentId: string, amountCents?: number): Promise<void> {
    await this.request(`/v1/payments/${encodeURIComponent(providerPaymentId)}/refunds`, {
      method: "POST",
      idempotencyKey: `refund-${providerPaymentId}-${amountCents ?? "total"}`,
      body: JSON.stringify(amountCents ? { amount: amountCents / 100 } : {}),
    });
  }

  /**
   * Header x-signature: "ts=<timestamp>,v1=<hmac>".
   * Manifesto assinado: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
   */
  async verifyWebhook({ headers, rawBody, url }: WebhookRequest): Promise<VerifiedWebhook | null> {
    const signature = headers.get("x-signature") ?? "";
    const requestId = headers.get("x-request-id") ?? "";
    const parts = Object.fromEntries(signature.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
    const { ts, v1 } = parts;
    if (!ts || !v1) return null;

    const payload = JSON.parse(rawBody) as { id?: string | number; type?: string; action?: string; data?: { id?: string } };
    const dataId = (url.searchParams.get("data.id") ?? payload.data?.id ?? "").toString().toLowerCase();

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac("sha256", this.webhookSecret).update(manifest).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(v1);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    return {
      eventId: String(payload.id ?? `${dataId}:${ts}`),
      type: payload.action ?? payload.type ?? "unknown",
      providerPaymentId: payload.type === "payment" && dataId ? dataId : null,
      payload,
    };
  }
}
