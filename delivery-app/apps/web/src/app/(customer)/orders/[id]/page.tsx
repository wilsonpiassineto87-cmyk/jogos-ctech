import { canTransition, formatCents } from "@delivery/core";
import { Check } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { guard, requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { FINAL_ORDER_STATUSES, ORDER_STATUS_LABEL, ORDER_STEPS, PAYMENT_LABEL, formatDateTime } from "@/lib/order-status";
import { cancelOrderAction } from "@/features/orders/customer-actions";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Acompanhar pedido" };

export default async function OrderTrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const user = await guard(requireUser, `/orders/${id}`);

  // customerId no WHERE: cada cliente só vê os próprios pedidos.
  const order = await prisma.order.findFirst({
    where: { id, customerId: user.id },
    select: {
      id: true,
      code: true,
      status: true,
      createdAt: true,
      estimatedDeliveryAt: true,
      deliveryAddress: true,
      customerNotes: true,
      subtotalCents: true,
      deliveryFeeCents: true,
      serviceFeeCents: true,
      discountCents: true,
      totalCents: true,
      paymentMethod: true,
      changeForCents: true,
      cancelReason: true,
      store: { select: { name: true, phone: true } },
      items: { select: { id: true, productName: true, quantity: true, totalCents: true, options: true, notes: true } },
      statusHistory: { orderBy: { createdAt: "asc" }, select: { toStatus: true, createdAt: true } },
      delivery: { select: { confirmationCode: true, status: true, courier: { select: { name: true } } } },
      payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, pixQrCode: true, pixExpiresAt: true } },
    },
  });
  if (!order) notFound();

  const isFinal = FINAL_ORDER_STATUSES.includes(order.status);
  const reached = new Map(order.statusHistory.map((h) => [h.toStatus, h.createdAt]));
  const currentStep = ORDER_STEPS.indexOf(order.status);
  const address = order.deliveryAddress as { street: string; number: string; complement?: string; neighborhood: string; city: string };
  const payment = order.payments[0];
  const cancel = cancelOrderAction.bind(null, order.id);

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      {!isFinal && <AutoRefresh intervalMs={10_000} />}

      <div>
        <p className="text-sm text-muted-foreground">
          Pedido #{order.code} · {formatDateTime(order.createdAt)}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{ORDER_STATUS_LABEL[order.status]}</h1>
        {!isFinal && order.estimatedDeliveryAt && (
          <p className="mt-1 text-muted-foreground">Previsão de entrega: {formatDateTime(order.estimatedDeliveryAt).split(" ")[1]}</p>
        )}
        {order.cancelReason && <p className="mt-2 text-sm text-destructive">Motivo: {order.cancelReason}</p>}
      </div>
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {order.status === "PENDING_PAYMENT" && payment?.pixQrCode && (
        <section className="rounded-xl border p-4">
          <h2 className="font-semibold">Pague com Pix</h2>
          <p className="mt-1 text-sm text-muted-foreground">Copie o código e cole no app do seu banco.</p>
          <textarea readOnly value={payment.pixQrCode} rows={4} className="mt-3 w-full rounded-md border bg-muted p-2 font-mono text-xs" />
        </section>
      )}

      {order.delivery && ["ASSIGNED", "AT_STORE", "PICKED_UP"].includes(order.delivery.status) && (
        <section className="rounded-xl border border-primary/40 bg-accent/50 p-4">
          <p className="text-sm">
            {order.delivery.courier ? `${order.delivery.courier.name} vai entregar seu pedido.` : "Procurando entregador."}
          </p>
          <p className="mt-2 text-sm">Informe este código ao receber:</p>
          <p className="mt-1 text-3xl font-bold tracking-[0.3em] tabular-nums">{order.delivery.confirmationCode}</p>
        </section>
      )}

      {!["CANCELLED", "REJECTED", "PENDING_PAYMENT"].includes(order.status) && (
        <ol className="space-y-3">
          {ORDER_STEPS.map((step, i) => {
            const done = i <= currentStep;
            return (
              <li key={step} className="flex items-center gap-3">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                    done ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                <span className={done ? "font-medium" : "text-muted-foreground"}>{ORDER_STATUS_LABEL[step]}</span>
                {reached.get(step) && (
                  <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(reached.get(step)!).split(" ")[1]}</span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <section className="rounded-xl border">
        <h2 className="border-b px-4 py-3 font-semibold">{order.store.name}</h2>
        <ul className="divide-y text-sm">
          {order.items.map((item) => {
            const options = (item.options as { name: string }[] | null) ?? [];
            return (
              <li key={item.id} className="flex justify-between gap-3 px-4 py-3">
                <span>
                  {item.quantity}× {item.productName}
                  {options.length > 0 && <span className="block text-muted-foreground">{options.map((o) => o.name).join(", ")}</span>}
                  {item.notes && <span className="block text-muted-foreground">Obs.: {item.notes}</span>}
                </span>
                <span className="tabular-nums">{formatCents(item.totalCents)}</span>
              </li>
            );
          })}
        </ul>
        <div className="space-y-1 border-t px-4 py-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCents(order.subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Entrega</span>
            <span>{order.deliveryFeeCents === 0 ? "Grátis" : formatCents(order.deliveryFeeCents)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCents(order.totalCents)}</span>
          </div>
          <p className="pt-1 text-muted-foreground">
            {PAYMENT_LABEL[order.paymentMethod]}
            {order.changeForCents ? ` · troco para ${formatCents(order.changeForCents)}` : ""}
          </p>
        </div>
      </section>

      <section className="rounded-xl border p-4 text-sm">
        <h2 className="font-semibold">Entrega em</h2>
        <p className="mt-1 text-muted-foreground">
          {address.street}, {address.number}
          {address.complement ? ` – ${address.complement}` : ""} · {address.neighborhood}, {address.city}
        </p>
        {order.customerNotes && <p className="mt-2">Obs.: {order.customerNotes}</p>}
      </section>

      <div className="flex flex-wrap gap-3">
        {canTransition(order.status, "CANCELLED", "CUSTOMER") && (
          <form action={cancel}>
            <SubmitButton variant="outline" pendingText="Cancelando...">
              Cancelar pedido
            </SubmitButton>
          </form>
        )}
        {order.store.phone && (
          <Button asChild variant="ghost">
            <a href={`tel:${order.store.phone}`}>Ligar para a loja</a>
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/orders">Meus pedidos</Link>
        </Button>
      </div>
    </div>
  );
}
