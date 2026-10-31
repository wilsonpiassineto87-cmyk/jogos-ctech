import { Bike, UserCheck, Users } from "lucide-react";
import Link from "@/components/shared/link";
import { prisma } from "@/lib/db";
import { getDashboard, parsePeriod, type Period } from "@/lib/dashboard";
import { getStore } from "@/lib/store";
import { StoreDashboard } from "@/components/dashboard/store-dashboard";
import { AutoRefresh } from "@/components/shared/auto-refresh";

export const dynamic = "force-dynamic";
export const metadata = { title: "Visão geral" };

export default async function AdminHomePage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { periodo } = await searchParams;
  const period = parsePeriod(periodo);
  const store = await getStore();
  const [data, couriersOnline, pendingCouriers, customers] = await Promise.all([
    getDashboard(store.id, period),
    prisma.courierProfile.count({ where: { status: "APPROVED", isOnline: true } }),
    prisma.courierProfile.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.user.count({ where: { roles: { has: "CUSTOMER" }, deletedAt: null } }),
  ]);
  const periodHref = (p: Period) => `/admin${p === "hoje" ? "" : `?periodo=${p}`}`;

  const people = [
    { href: "/admin/couriers", icon: <Bike />, label: "Entregadores online", value: couriersOnline },
    {
      href: "/admin/couriers",
      icon: <UserCheck />,
      label: "Entregadores aguardando aprovação",
      value: pendingCouriers,
      urgent: pendingCouriers > 0,
    },
    { href: "/admin/users", icon: <Users />, label: "Clientes cadastrados", value: customers },
  ];

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <AutoRefresh intervalMs={60_000} />
      <h1 className="text-2xl font-bold tracking-tight">{store.name} · visão geral</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {people.map((p) => (
          <Link
            key={p.label}
            href={p.href}
            className={`flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary [&_svg]:size-5 ${p.urgent ? "border-primary bg-accent/60" : ""}`}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">{p.icon}</span>
            <span>
              <span className="block text-2xl font-bold leading-none tabular-nums">{p.value}</span>
              <span className="text-sm text-muted-foreground">{p.label}</span>
            </span>
          </Link>
        ))}
      </div>
      <StoreDashboard data={data} periodHref={periodHref} ordersHref="/admin/orders" historyHref="/admin/orders" />
      <p className="text-sm text-muted-foreground">
        Cardápio, taxa de entrega, cidades atendidas e horários ficam no{" "}
        <Link href="/restaurant" className="text-primary hover:underline">
          painel da loja
        </Link>
        .
      </p>
    </section>
  );
}
