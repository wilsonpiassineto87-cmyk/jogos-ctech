import { formatCents, type OrderStatus } from "@delivery/core";
import type { Prisma } from "@delivery/db";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, formatDateTime } from "@/lib/order-status";
import Link from "@/components/shared/link";
import { PrintOrderButtons } from "@/components/receipt/print-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Histórico de pedidos" };

const PAGE_SIZE = 20;
const STATUS_FILTERS: { value: string; label: string; statuses?: OrderStatus[] }[] = [
  { value: "", label: "Todos" },
  { value: "andamento", label: "Em andamento", statuses: ["PLACED", "ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] },
  { value: "entregues", label: "Entregues", statuses: ["DELIVERED"] },
  { value: "cancelados", label: "Recusados / cancelados", statuses: ["REJECTED", "CANCELLED"] },
];
const input =
  "h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

const dayStart = (day: string) => new Date(`${day}T00:00:00-03:00`);

/** Todos os pedidos da loja (ficam salvos no banco), com busca e reimpressão. */
export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; data?: string; pagina?: string }>;
}) {
  const query = await searchParams;
  const store = await getStore();
  const q = query.q?.trim().slice(0, 60) ?? "";
  const filter = STATUS_FILTERS.find((f) => f.value === query.status) ?? STATUS_FILTERS[0]!;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(query.data ?? "") ? query.data! : "";
  const page = Math.max(1, Number.parseInt(query.pagina ?? "1", 10) || 1);

  const where: Prisma.OrderWhereInput = {
    storeId: store.id,
    status: filter.statuses ? { in: filter.statuses } : { not: "PENDING_PAYMENT" },
    ...(q && {
      OR: [
        { code: { contains: q.replace(/^#/, ""), mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
        { customer: { phone: { contains: q.replace(/\D/g, "") || q } } },
      ],
    }),
    // Dia no horário de Brasília (UTC-3).
    ...(day && { createdAt: { gte: dayStart(day), lt: new Date(dayStart(day).getTime() + 24 * 60 * 60 * 1000) } }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        code: true,
        status: true,
        createdAt: true,
        totalCents: true,
        paymentMethod: true,
        customer: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageUrl = (n: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filter.value) params.set("status", filter.value);
    if (day) params.set("data", day);
    if (n > 1) params.set("pagina", String(n));
    const s = params.toString();
    return `/restaurant/${store.id}/orders/history${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold tracking-tight">Histórico de pedidos</h1>
        <Link href={`/restaurant/${store.id}/orders`} className="text-sm font-medium text-primary hover:underline">
          Voltar aos pedidos de agora
        </Link>
      </div>

      <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input name="q" defaultValue={q} placeholder="Nº do pedido, nome ou telefone" className={input} />
        <select name="status" defaultValue={filter.value} className={input}>
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <input type="date" name="data" defaultValue={day} className={input} aria-label="Dia" />
        <Button type="submit" className="h-10">
          Buscar
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        {total === 0 ? "Nenhum pedido encontrado." : `${total} pedido${total === 1 ? "" : "s"}`}
      </p>

      <ul className="mt-3 space-y-3">
        {orders.map((order) => (
          <li key={order.id} className="rounded-xl border bg-card p-4 text-sm shadow-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold">#{order.code}</span>
              <span className="text-muted-foreground">{formatDateTime(order.createdAt)}</span>
              <Badge variant="outline" className="ml-auto">
                {ORDER_STATUS_LABEL[order.status]}
              </Badge>
            </div>
            <p className="mt-1">
              {order.customer.name} · {order._count.items} {order._count.items === 1 ? "item" : "itens"} ·{" "}
              <span className="font-medium">{formatCents(order.totalCents)}</span> · {PAYMENT_LABEL[order.paymentMethod]}
            </p>
            <div className="mt-3">
              <PrintOrderButtons orderId={order.id} compact />
            </div>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between gap-3 text-sm" aria-label="Páginas">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageUrl(page - 1)}>Anteriores</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageUrl(page + 1)}>Mais antigos</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
