import { formatCents } from "@delivery/core";
import { requireCourier } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Ganhos" };

export default async function CourierEarningsPage() {
  const courier = await requireCourier();
  const day = 24 * 60 * 60 * 1000;
  const periods = [
    { label: "Últimas 24h", since: new Date(Date.now() - day) },
    { label: "Últimos 7 dias", since: new Date(Date.now() - 7 * day) },
    { label: "Últimos 30 dias", since: new Date(Date.now() - 30 * day) },
  ];
  const totals = await Promise.all(
    periods.map((p) =>
      prisma.delivery.aggregate({
        where: { courierId: courier.id, status: "DELIVERED", deliveredAt: { gte: p.since } },
        _count: true,
        _sum: { courierFeeCents: true },
      }),
    ),
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Ganhos</h1>
      <div className="mt-6 grid gap-4">
        {periods.map((p, i) => (
          <Card key={p.label}>
            <CardHeader>
              <CardDescription>{p.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{formatCents(totals[i]!._sum.courierFeeCents ?? 0)}</CardTitle>
              <CardDescription>{totals[i]!._count} entregas</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
