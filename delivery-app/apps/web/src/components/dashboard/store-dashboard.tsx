import { formatCents } from "@delivery/core";
import { ArrowDownRight, ArrowUpRight, Bike, ChefHat, Clock, Minus } from "lucide-react";
import Link from "@/components/shared/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PERIODS, type Dashboard, type Period } from "@/lib/dashboard";
import { ORDER_STATUS_LABEL, formatDateTime } from "@/lib/order-status";
import { BarChart } from "./bar-chart";

const COMPARE_LABEL: Record<Period, string> = { hoje: "ontem", "7d": "7 dias anteriores", "30d": "30 dias anteriores" };

/** Painel da loja: usado no painel do dono e na visão geral do administrador. */
export function StoreDashboard({
  data,
  periodHref,
  ordersHref,
  historyHref,
}: {
  data: Dashboard;
  periodHref: (period: Period) => string;
  ordersHref: string;
  historyHref: string;
}) {
  const compare = COMPARE_LABEL[data.period];
  const brl = (cents: number) => formatCents(cents);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return (
    <div className="space-y-6">
      {/* Filtro de período, numa linha acima de tudo. */}
      <nav className="inline-flex rounded-lg border bg-card p-1 text-sm" aria-label="Período">
        {(Object.keys(PERIODS) as Period[]).map((p) => (
          <Link
            key={p}
            href={periodHref(p)}
            aria-current={p === data.period ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium",
              p === data.period ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {PERIODS[p].label}
          </Link>
        ))}
      </nav>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumo">
        <Kpi label="Vendas" value={brl(data.revenue)} change={data.revenueChange} compare={compare} />
        <Kpi label="Pedidos" value={String(data.orders)} change={data.ordersChange} compare={compare} />
        <Kpi
          label="Ticket médio"
          value={brl(data.ticket)}
          change={data.prevTicket > 0 ? (data.ticket - data.prevTicket) / data.prevTicket : null}
          compare={compare}
        />
        <Kpi
          label="Recusados / cancelados"
          value={String(data.cancelled)}
          hint={data.cancelled > 0 ? `${Math.round(data.cancelledRate * 100)}% dos pedidos` : "Nenhum no período"}
        />
      </section>

      <section aria-label="Agora" className="grid gap-3 sm:grid-cols-3">
        <LiveCard href={ordersHref} icon={<Clock />} label="Esperando aceitar" value={data.live.waiting} urgent={data.live.waiting > 0} />
        <LiveCard href={ordersHref} icon={<ChefHat />} label="Em preparo" value={data.live.kitchen} />
        <LiveCard href={ordersHref} icon={<Bike />} label="Pronto / a caminho" value={data.live.route} />
      </section>

      <section className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">{data.period === "hoje" ? "Vendas por hora (hoje)" : `Vendas por dia (${PERIODS[data.period].label})`}</h2>
          <p className="text-sm text-muted-foreground">Taxas de entrega no período: {brl(data.deliveryFees)}</p>
        </div>
        <BarChart
          bars={data.timeline}
          format={brl}
          unit={(b) => plural(b.count, "pedido", "pedidos")}
          caption="Vendas em reais ao longo do período"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {data.peakHours && (
          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-2 font-semibold">Horários de pico</h2>
            <BarChart
              bars={data.peakHours}
              format={(n) => plural(n, "pedido", "pedidos")}
              caption="Quantidade de pedidos por hora do dia"
            />
          </section>
        )}

        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">Mais vendidos</h2>
          {data.top.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem vendas no período.</p>
          ) : (
            <ol className="space-y-3 text-sm">
              {data.top.map((t, i) => (
                <li key={t.name}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      <span className="mr-2 text-muted-foreground tabular-nums">{i + 1}.</span>
                      {t.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {t.quantity} un. · {brl(t.value)}
                    </span>
                  </div>
                  <Meter value={t.quantity} max={data.top[0]!.quantity} />
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">Formas de pagamento</h2>
          {data.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem vendas no período.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {data.payments.map((p) => (
                <li key={p.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span>{p.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {plural(p.count, "pedido", "pedidos")} · {brl(p.value)}
                    </span>
                  </div>
                  <Meter value={p.value} max={data.revenue} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cn("rounded-xl border bg-card p-4", !data.peakHours && "lg:col-span-2")}>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Últimos pedidos</h2>
            <Link href={historyHref} className="text-sm font-medium text-primary hover:underline">
              Ver histórico
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>
          ) : (
            <ul className="divide-y text-sm">
              {data.recent.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="font-semibold">#{o.code}</span>
                  <span className="min-w-0 flex-1 truncate">{o.customer.name}</span>
                  <span className="text-muted-foreground">{formatDateTime(o.createdAt)}</span>
                  <span className="font-medium tabular-nums">{brl(o.totalCents)}</span>
                  <Badge variant="outline">{ORDER_STATUS_LABEL[o.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, change, compare, hint }: { label: string; value: string; change?: number | null; compare?: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint !== undefined ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : change === null || change === undefined ? (
        <p className="mt-1 text-xs text-muted-foreground">Sem base para comparar com {compare}</p>
      ) : (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Trend change={change} />
          <span>vs. {compare}</span>
        </p>
      )}
    </div>
  );
}

function Trend({ change }: { change: number }) {
  const pct = Math.round(change * 100);
  if (pct === 0)
    return (
      <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
        <Minus className="size-3.5" />
        igual
      </span>
    );
  const up = pct > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-semibold", up ? "text-success" : "text-destructive")}>
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}

function LiveCard({ href, icon, label, value, urgent }: { href: string; icon: React.ReactNode; label: string; value: number; urgent?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary [&_svg]:size-5",
        urgent && "border-primary bg-accent/60",
      )}
    >
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full bg-muted", urgent && "bg-primary text-primary-foreground")}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold leading-none tabular-nums">{value}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}

function Meter({ value, max }: { value: number; max: number }) {
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className="h-full rounded-full bg-primary" style={{ width: `${max > 0 ? Math.max((value / max) * 100, 2) : 0}%` }} />
    </div>
  );
}
