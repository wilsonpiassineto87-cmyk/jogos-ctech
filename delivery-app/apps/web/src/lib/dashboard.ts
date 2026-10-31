import "server-only";
import type { OrderStatus } from "@delivery/core";
import { prisma } from "./db";
import { PAYMENT_LABEL } from "./order-status";

export const PERIODS = {
  hoje: { label: "Hoje", days: 1 },
  "7d": { label: "7 dias", days: 7 },
  "30d": { label: "30 dias", days: 30 },
} as const;
export type Period = keyof typeof PERIODS;

export const parsePeriod = (value?: string): Period => (value && value in PERIODS ? (value as Period) : "hoje");

const DAY = 24 * 60 * 60 * 1000;
// Horário de Brasília (UTC-3, sem horário de verão): a "data local" é o instante menos 3 h.
const OFFSET = 3 * 60 * 60 * 1000;
const local = (d: Date) => new Date(d.getTime() - OFFSET);

/** Meia-noite (horário de Brasília) de `daysAgo` dias atrás. */
function startOfDay(daysAgo = 0): Date {
  const now = local(new Date());
  now.setUTCHours(0, 0, 0, 0);
  return new Date(now.getTime() + OFFSET - daysAgo * DAY);
}

const CANCELLED: OrderStatus[] = ["REJECTED", "CANCELLED"];
const IN_PROGRESS = { waiting: ["PLACED"], kitchen: ["ACCEPTED", "PREPARING"], route: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] } as const;

export type Bar = { key: string; label: string; value: number; count: number };

/**
 * Números do painel da loja. Vendas = pedidos do período que não foram recusados nem
 * cancelados (inclui os que ainda estão em andamento). Compara com o período anterior
 * do mesmo tamanho.
 */
export async function getDashboard(storeId: string, period: Period) {
  const days = PERIODS[period].days;
  const since = startOfDay(days - 1);
  const prevSince = new Date(since.getTime() - days * DAY);
  const base = { storeId, status: { not: "PENDING_PAYMENT" as const } };

  const [orders, previous, live, top, recent] = await Promise.all([
    prisma.order.findMany({
      where: { ...base, createdAt: { gte: since } },
      select: { createdAt: true, status: true, totalCents: true, deliveryFeeCents: true, paymentMethod: true },
    }),
    prisma.order.findMany({
      where: { ...base, createdAt: { gte: prevSince, lt: since } },
      select: { status: true, totalCents: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { storeId, status: { in: [...IN_PROGRESS.waiting, ...IN_PROGRESS.kitchen, ...IN_PROGRESS.route] } },
      _count: true,
    }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: { ...base, status: { notIn: [...CANCELLED, "PENDING_PAYMENT"] }, createdAt: { gte: since } } },
      _sum: { quantity: true, totalCents: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.order.findMany({
      where: base,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, code: true, status: true, createdAt: true, totalCents: true, customer: { select: { name: true } } },
    }),
  ]);

  const sold = orders.filter((o) => !CANCELLED.includes(o.status));
  const prevSold = previous.filter((o) => !CANCELLED.includes(o.status));
  const sum = (list: { totalCents: number }[]) => list.reduce((s, o) => s + o.totalCents, 0);
  const revenue = sum(sold);
  const prevRevenue = sum(prevSold);
  const cancelled = orders.length - sold.length;

  // Gráfico principal: por hora (hoje) ou por dia (7/30 dias).
  const timeline: Bar[] =
    period === "hoje"
      ? byHour(sold, false)
      : Array.from({ length: days }, (_, i) => {
          const day = local(new Date(since.getTime() + i * DAY));
          const key = day.toISOString().slice(0, 10);
          const label = `${String(day.getUTCDate()).padStart(2, "0")}/${String(day.getUTCMonth() + 1).padStart(2, "0")}`;
          return { key, label, value: 0, count: 0 };
        });
  if (period !== "hoje") {
    const index = new Map(timeline.map((b) => [b.key, b]));
    for (const o of sold) {
      const bar = index.get(local(o.createdAt).toISOString().slice(0, 10));
      if (bar) (bar.value += o.totalCents), (bar.count += 1);
    }
  }

  const payments = new Map<string, { label: string; count: number; value: number }>();
  for (const o of sold) {
    const label = PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod;
    const entry = payments.get(label) ?? { label, count: 0, value: 0 };
    entry.count += 1;
    entry.value += o.totalCents;
    payments.set(label, entry);
  }

  const liveCount = (statuses: readonly string[]) =>
    live.filter((g) => statuses.includes(g.status)).reduce((s, g) => s + g._count, 0);

  return {
    period,
    revenue,
    revenueChange: change(revenue, prevRevenue),
    orders: sold.length,
    ordersChange: change(sold.length, prevSold.length),
    ticket: sold.length ? Math.round(revenue / sold.length) : 0,
    prevTicket: prevSold.length ? Math.round(prevRevenue / prevSold.length) : 0,
    deliveryFees: sold.reduce((s, o) => s + o.deliveryFeeCents, 0),
    cancelled,
    cancelledRate: orders.length ? cancelled / orders.length : 0,
    live: {
      waiting: liveCount(IN_PROGRESS.waiting),
      kitchen: liveCount(IN_PROGRESS.kitchen),
      route: liveCount(IN_PROGRESS.route),
    },
    timeline,
    // Horários de pico só fazem sentido somando vários dias.
    peakHours: period === "hoje" ? null : byHour(sold, true),
    top: top.map((t) => ({ name: t.productName, quantity: t._sum.quantity ?? 0, value: t._sum.totalCents ?? 0 })),
    payments: [...payments.values()].sort((a, b) => b.value - a.value),
    recent,
  };
}

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

/** Variação em relação ao período anterior; null quando não havia base para comparar. */
function change(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null;
}

/** Barras por hora do dia. Sem pedidos, mostra o horário comercial (10h–23h). */
function byHour(orders: { createdAt: Date; totalCents: number }[], countOnly: boolean): Bar[] {
  const hours = orders.map((o) => local(o.createdAt).getUTCHours());
  const first = Math.min(10, ...hours);
  const last = Math.max(23, ...hours);
  const bars = Array.from({ length: last - first + 1 }, (_, i) => {
    const h = first + i;
    return { key: String(h), label: `${h}h`, value: 0, count: 0 };
  });
  orders.forEach((o, i) => {
    const bar = bars[hours[i]! - first]!;
    bar.count += 1;
    bar.value += countOnly ? 1 : o.totalCents;
  });
  return bars;
}
