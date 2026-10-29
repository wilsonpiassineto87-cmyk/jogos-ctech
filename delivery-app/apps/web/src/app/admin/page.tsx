import { formatCents } from "@delivery/core";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Visão geral" };

export default async function AdminHomePage() {
  const store = await getStore();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [delivered, active, couriersOnline, pendingCouriers, customers] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "DELIVERED", deliveredAt: { gte: since } },
      _count: true,
      _sum: { totalCents: true },
    }),
    prisma.order.count({ where: { status: { in: ["PLACED", "ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] } } }),
    prisma.courierProfile.count({ where: { status: "APPROVED", isOnline: true } }),
    prisma.courierProfile.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.user.count({ where: { roles: { has: "CUSTOMER" }, deletedAt: null } }),
  ]);

  const kpis = [
    { label: "Vendas (24h)", value: formatCents(delivered._sum.totalCents ?? 0), hint: `${delivered._count} pedidos entregues` },
    { label: "Pedidos em andamento", value: String(active), hint: store.isOpen ? "Loja recebendo pedidos" : "Loja pausada" },
    { label: "Entregadores online", value: String(couriersOnline), hint: `${pendingCouriers} aguardando aprovação` },
    { label: "Clientes cadastrados", value: String(customers), hint: " " },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">{store.name} · visão geral</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <p className="mt-6 text-sm text-muted-foreground">
        Cardápio, taxa de entrega e horários ficam no{" "}
        <Link href="/restaurant" className="text-primary hover:underline">
          painel da loja
        </Link>
        .
      </p>
    </section>
  );
}
