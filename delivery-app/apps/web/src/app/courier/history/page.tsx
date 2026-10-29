import { formatCents } from "@delivery/core";
import { requireCourier } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/order-status";

export const metadata = { title: "Histórico" };

export default async function CourierHistoryPage() {
  const courier = await requireCourier();
  const deliveries = await prisma.delivery.findMany({
    where: { courierId: courier.id, status: "DELIVERED" },
    orderBy: { deliveredAt: "desc" },
    take: 50,
    select: {
      id: true,
      deliveredAt: true,
      courierFeeCents: true,
      distanceMeters: true,
      order: { select: { code: true, deliveryAddress: true } },
    },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
      {deliveries.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Nenhuma entrega concluída ainda.</p>
      ) : (
        <ul className="mt-6 divide-y rounded-xl border">
          {deliveries.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <span>
                #{d.order.code} · {(d.order.deliveryAddress as { neighborhood: string }).neighborhood}
                <span className="block text-muted-foreground">
                  {d.deliveredAt ? formatDateTime(d.deliveredAt) : ""}
                  {d.distanceMeters ? ` · ${(d.distanceMeters / 1000).toFixed(1)} km` : ""}
                </span>
              </span>
              <span className="font-medium tabular-nums">{formatCents(d.courierFeeCents)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
