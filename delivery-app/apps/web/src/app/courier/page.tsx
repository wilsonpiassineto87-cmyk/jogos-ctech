import { formatCents } from "@delivery/core";
import Link from "@/components/shared/link";
import { requireCourier } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { acceptDeliveryAction, toggleOnlineAction } from "@/features/courier/actions";
import { getActiveDelivery } from "@/features/courier/service";
import { InstallBanner } from "@/components/pwa/install-banner";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/shared/submit-button";

export const metadata = { title: "Corridas" };

export default async function CourierHomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const courier = await requireCourier();
  const [active, available] = await Promise.all([
    getActiveDelivery(courier.id),
    courier.courier.isOnline
      ? prisma.delivery.findMany({
          where: { status: "WAITING_COURIER", order: { status: { notIn: ["CANCELLED", "REJECTED"] } } },
          orderBy: { createdAt: "asc" },
          take: 20,
          select: {
            id: true,
            distanceMeters: true,
            courierFeeCents: true,
            order: { select: { code: true, status: true, deliveryAddress: true, store: { select: { name: true, neighborhood: true } } } },
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      <AutoRefresh intervalMs={15_000} />
      <InstallBanner appName="Sorveteria do Bairro" />
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <section className="flex items-center justify-between gap-4 rounded-xl border p-4">
        <div>
          <p className="font-semibold">{courier.courier.isOnline ? "Você está online" : "Você está offline"}</p>
          <p className="text-sm text-muted-foreground">
            {courier.courier.isOnline ? "Novas corridas aparecem abaixo." : "Fique online para ver as corridas."}
          </p>
        </div>
        <form action={toggleOnlineAction}>
          <SubmitButton variant={courier.courier.isOnline ? "outline" : "default"}>
            {courier.courier.isOnline ? "Ficar offline" : "Ficar online"}
          </SubmitButton>
        </form>
      </section>

      {active && (
        <Link href={`/courier/delivery/${active.id}`} className="block rounded-xl border border-primary bg-accent/50 p-4">
          <p className="font-semibold">Você tem uma corrida em andamento</p>
          <p className="text-sm text-primary">Abrir corrida →</p>
        </Link>
      )}

      {courier.courier.isOnline && (
        <section>
          <h2 className="font-semibold">Corridas disponíveis</h2>
          {available.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhuma corrida no momento. Esta tela atualiza sozinha.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {available.map((d) => {
                // Antes de aceitar, só o bairro do cliente (LGPD): endereço completo aparece depois.
                const neighborhood = (d.order.deliveryAddress as { neighborhood: string }).neighborhood;
                return (
                  <li key={d.id} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">{formatCents(d.courierFeeCents)}</span>
                      <Badge variant="outline">{ORDER_STATUS_LABEL[d.order.status]}</Badge>
                    </div>
                    <p className="mt-2 text-sm">
                      {d.order.store.name} ({d.order.store.neighborhood}) → {neighborhood}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pedido #{d.order.code}
                      {d.distanceMeters ? ` · ${(d.distanceMeters / 1000).toFixed(1)} km` : ""}
                    </p>
                    <form action={acceptDeliveryAction.bind(null, d.id)} className="mt-3">
                      <SubmitButton className="w-full" disabled={!!active} pendingText="Aceitando...">
                        Aceitar corrida
                      </SubmitButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
