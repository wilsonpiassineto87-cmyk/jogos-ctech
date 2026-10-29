import { formatCents } from "@delivery/core";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCourier } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/order-status";
import { arrivedAction, completeDeliveryAction, pickedUpAction } from "@/features/courier/actions";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Corrida" };

const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export default async function CourierDeliveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const courier = await requireCourier();

  // courierId no WHERE: o endereço completo do cliente só aparece para quem aceitou a corrida.
  const delivery = await prisma.delivery.findFirst({
    where: { id, courierId: courier.id },
    select: {
      id: true,
      status: true,
      courierFeeCents: true,
      pickupLatitude: true,
      pickupLongitude: true,
      dropoffLatitude: true,
      dropoffLongitude: true,
      order: {
        select: {
          code: true,
          status: true,
          totalCents: true,
          paymentMethod: true,
          changeForCents: true,
          customerNotes: true,
          deliveryAddress: true,
          customer: { select: { name: true, phone: true } },
          store: { select: { name: true, street: true, number: true, neighborhood: true, phone: true } },
          items: { select: { quantity: true, productName: true } },
          payments: { orderBy: { createdAt: "desc" }, take: 1, select: { provider: true } },
        },
      },
    },
  });
  if (!delivery) notFound();

  const { order } = delivery;
  const address = order.deliveryAddress as {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    reference?: string;
  };
  const collect = order.payments[0]?.provider === "OFFLINE";
  const done = delivery.status === "DELIVERED";

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-6">
      {!done && <AutoRefresh intervalMs={10_000} />}
      <div>
        <p className="text-sm text-muted-foreground">
          Pedido #{order.code} · ganho {formatCents(delivery.courierFeeCents)}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{done ? "Entrega concluída 🎉" : ORDER_STATUS_LABEL[order.status]}</h1>
      </div>
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <section className="rounded-xl border p-4 text-sm">
        <p className="text-xs font-medium uppercase text-muted-foreground">1. Retirar em</p>
        <p className="mt-1 font-semibold">{order.store.name}</p>
        <p className="text-muted-foreground">
          {order.store.street}, {order.store.number} · {order.store.neighborhood}
        </p>
        <a
          href={mapsLink(delivery.pickupLatitude, delivery.pickupLongitude)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
        >
          Abrir rota no mapa <ExternalLink className="size-3.5" />
        </a>
        <ul className="mt-3 text-muted-foreground">
          {order.items.map((i, n) => (
            <li key={n}>
              {i.quantity}× {i.productName}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border p-4 text-sm">
        <p className="text-xs font-medium uppercase text-muted-foreground">2. Entregar para</p>
        <p className="mt-1 font-semibold">{order.customer.name}</p>
        <p className="text-muted-foreground">
          {address.street}, {address.number}
          {address.complement ? ` – ${address.complement}` : ""} · {address.neighborhood}
        </p>
        {address.reference && <p className="text-muted-foreground">Referência: {address.reference}</p>}
        {order.customerNotes && <p className="mt-2">Obs.: {order.customerNotes}</p>}
        <div className="mt-2 flex flex-wrap gap-4">
          <a
            href={mapsLink(delivery.dropoffLatitude, delivery.dropoffLongitude)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Abrir rota no mapa <ExternalLink className="size-3.5" />
          </a>
          {order.customer.phone && !done && (
            <a href={`tel:${order.customer.phone}`} className="text-primary hover:underline">
              Ligar para o cliente
            </a>
          )}
        </div>
        <p className="mt-3 font-medium">
          {collect
            ? `Cobrar ${formatCents(order.totalCents)} · ${PAYMENT_LABEL[order.paymentMethod]}${
                order.changeForCents ? ` (troco para ${formatCents(order.changeForCents)})` : ""
              }`
            : "Pedido já pago online"}
        </p>
      </section>

      {delivery.status === "ASSIGNED" && (
        <form action={arrivedAction.bind(null, delivery.id)}>
          <SubmitButton size="lg" className="w-full">
            Cheguei na loja
          </SubmitButton>
        </form>
      )}
      {(delivery.status === "ASSIGNED" || delivery.status === "AT_STORE") && (
        <form action={pickedUpAction.bind(null, delivery.id)}>
          <SubmitButton size="lg" variant={delivery.status === "AT_STORE" ? "default" : "outline"} className="w-full">
            {order.status === "READY_FOR_PICKUP" ? "Peguei o pedido" : "Peguei o pedido (aguardando a loja ficar pronta)"}
          </SubmitButton>
        </form>
      )}
      {delivery.status === "PICKED_UP" && (
        <form action={completeDeliveryAction.bind(null, delivery.id)} className="space-y-3 rounded-xl border p-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Código de 4 dígitos informado pelo cliente
            <input
              name="pin"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              required
              autoComplete="off"
              className="h-12 rounded-md border bg-background px-3 text-center text-2xl tracking-[0.5em] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </label>
          <SubmitButton size="lg" className="w-full" pendingText="Confirmando...">
            Confirmar entrega
          </SubmitButton>
        </form>
      )}
      {done && (
        <Button asChild size="lg" className="w-full">
          <Link href="/courier">Ver novas corridas</Link>
        </Button>
      )}
    </div>
  );
}
