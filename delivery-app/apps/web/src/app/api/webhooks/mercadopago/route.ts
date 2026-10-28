import { Prisma } from "@delivery/db";
import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getMercadoPago } from "@/features/payments/gateway";
import { syncPaymentStatus } from "@/features/payments/sync";

// POST /api/webhooks/mercadopago
// Em produção, grave o evento e processe em fila (Inngest/QStash), respondendo 200 imediatamente.
export const POST = apiHandler(async (req) => {
  const gateway = getMercadoPago();
  const rawBody = await req.text();
  const event = await gateway.verifyWebhook({ headers: req.headers, rawBody, url: new URL(req.url) });
  if (!event) return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });

  let stored;
  try {
    stored = await prisma.webhookEvent.create({
      data: { provider: "MERCADO_PAGO", eventId: event.eventId, type: event.type, payload: event.payload as object },
    });
  } catch (e) {
    // Evento repetido: o provedor reenvia até receber 200.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ duplicate: true });
    }
    throw e;
  }

  try {
    if (event.providerPaymentId) await syncPaymentStatus(gateway, event.providerPaymentId);
    await prisma.webhookEvent.update({ where: { id: stored.id }, data: { processedAt: new Date() } });
  } catch (error) {
    await prisma.webhookEvent.update({ where: { id: stored.id }, data: { error: String(error) } });
    throw error; // 500 -> o Mercado Pago tenta de novo
  }

  return NextResponse.json({ ok: true });
});
