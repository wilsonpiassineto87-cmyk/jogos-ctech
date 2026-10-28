import { prisma } from "@/lib/db";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Visão geral" };

export default async function AdminHomePage() {
  const [stores, pendingStores, couriers, pendingCouriers, ordersToday] = await Promise.all([
    prisma.store.count({ where: { status: "ACTIVE" } }),
    prisma.store.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.courierProfile.count({ where: { status: "APPROVED" } }),
    prisma.courierProfile.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.order.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ]);

  const kpis = [
    { label: "Lojas ativas", value: stores, hint: `${pendingStores} aguardando aprovação` },
    { label: "Entregadores aprovados", value: couriers, hint: `${pendingCouriers} aguardando aprovação` },
    { label: "Pedidos hoje", value: ordersToday, hint: "desde 00:00 (fuso do servidor)" },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Visão geral</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader>
              <CardDescription>{k.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{k.value}</CardTitle>
              <CardDescription>{k.hint}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
