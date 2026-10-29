import { formatCents } from "@delivery/core";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Relatórios" };

function startOfDaySP(daysAgo = 0): Date {
  // Meia-noite em São Paulo (UTC-3, sem horário de verão).
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  now.setUTCHours(0, 0, 0, 0);
  return new Date(now.getTime() + 3 * 60 * 60 * 1000 - daysAgo * 24 * 60 * 60 * 1000);
}

export default async function StoreReportsPage() {
  const store = await getStore();
  const periods = [
    { label: "Hoje", since: startOfDaySP() },
    { label: "Últimos 7 dias", since: startOfDaySP(6) },
    { label: "Últimos 30 dias", since: startOfDaySP(29) },
  ];

  const stats = await Promise.all(
    periods.map(async (p) => {
      const [delivered, cancelled] = await Promise.all([
        prisma.order.aggregate({
          where: { storeId: store.id, status: "DELIVERED", createdAt: { gte: p.since } },
          _count: true,
          _sum: { subtotalCents: true, deliveryFeeCents: true },
        }),
        prisma.order.count({ where: { storeId: store.id, status: { in: ["CANCELLED", "REJECTED"] }, createdAt: { gte: p.since } } }),
      ]);
      const revenue = delivered._sum.subtotalCents ?? 0;
      return { ...p, count: delivered._count, revenue, fees: delivered._sum.deliveryFeeCents ?? 0, cancelled };
    }),
  );

  const top = await prisma.orderItem.groupBy({
    by: ["productName"],
    where: { order: { storeId: store.id, status: "DELIVERED", createdAt: { gte: periods[2]!.since } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{formatCents(s.revenue)}</CardTitle>
              <CardDescription>
                {s.count} pedidos entregues · ticket médio {formatCents(s.count ? Math.round(s.revenue / s.count) : 0)}
              </CardDescription>
              <CardDescription>
                Taxas de entrega {formatCents(s.fees)} · {s.cancelled} cancelados/recusados
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">Mais vendidos (30 dias)</h2>
        {top.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Ainda sem pedidos entregues.</p>
        ) : (
          <ol className="mt-2 space-y-1 text-sm">
            {top.map((t) => (
              <li key={t.productName} className="flex justify-between">
                <span>{t.productName}</span>
                <span className="tabular-nums text-muted-foreground">{t._sum.quantity} un.</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
