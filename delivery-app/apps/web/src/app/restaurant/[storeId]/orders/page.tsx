import { formatCents, type OrderStatus } from "@delivery/core";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, formatDateTime } from "@/lib/order-status";
import { acceptOrderAction, advanceOrderAction, rejectOrderAction, toggleOpenAction } from "@/features/store/actions";
import { NewOrderAlert } from "@/components/restaurant/new-order-alert";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Pedidos" };

const COLUMNS: { title: string; statuses: OrderStatus[] }[] = [
  { title: "Novos", statuses: ["PLACED"] },
  { title: "Em preparo", statuses: ["ACCEPTED", "PREPARING"] },
  { title: "Prontos / em entrega", statuses: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] },
];

const REJECT_REASONS = ["Item em falta", "Loja muito cheia", "Fora da área de entrega", "Loja fechando"];

export default async function StoreOrdersPage() {
  const store = await getStore();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [orders, finishedToday] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: store.id, status: { in: COLUMNS.flatMap((c) => c.statuses) } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        code: true,
        status: true,
        createdAt: true,
        totalCents: true,
        paymentMethod: true,
        changeForCents: true,
        customerNotes: true,
        deliveryAddress: true,
        customer: { select: { name: true, phone: true } },
        items: { select: { id: true, productName: true, quantity: true, options: true, notes: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1, select: { provider: true } },
        delivery: { select: { status: true, courier: { select: { name: true } } } },
      },
    }),
    prisma.order.count({ where: { storeId: store.id, status: "DELIVERED", deliveredAt: { gte: since } } }),
  ]);
  const pending = orders.filter((o) => o.status === "PLACED").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <AutoRefresh intervalMs={8_000} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold tracking-tight">Pedidos</h1>
        <span className="text-sm text-muted-foreground">{finishedToday} entregues nas últimas 24h</span>
        <NewOrderAlert pendingCount={pending} />
        <form action={toggleOpenAction}>
          <Button variant={store.isOpen ? "outline" : "destructive"} size="sm">
            {store.isOpen ? "Loja aberta · pausar" : "Loja pausada · abrir"}
          </Button>
        </form>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const list = orders.filter((o) => column.statuses.includes(o.status));
          return (
            <section key={column.title} className="rounded-xl bg-muted/50 p-3">
              <h2 className="mb-3 flex items-center justify-between px-1 font-semibold">
                {column.title}
                <Badge variant="secondary">{list.length}</Badge>
              </h2>
              <div className="space-y-3">
                {list.length === 0 && <p className="px-1 py-6 text-center text-sm text-muted-foreground">Nenhum pedido</p>}
                {list.map((order) => {
                  const address = order.deliveryAddress as {
                    street: string;
                    number: string;
                    complement?: string;
                    neighborhood: string;
                    reference?: string;
                  };
                  const paid = order.payments[0]?.provider !== "OFFLINE";
                  return (
                    <article key={order.id} className="rounded-lg border bg-card p-4 text-sm shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">#{order.code}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {order.customer.name}
                        {order.customer.phone ? ` · ${order.customer.phone}` : ""}
                      </p>
                      <ul className="mt-3 space-y-1">
                        {order.items.map((item) => {
                          const options = (item.options as { name: string }[] | null) ?? [];
                          return (
                            <li key={item.id}>
                              <span className="font-medium">{item.quantity}×</span> {item.productName}
                              {options.length > 0 && <span className="text-muted-foreground"> ({options.map((o) => o.name).join(", ")})</span>}
                              {item.notes && <span className="block text-xs text-amber-700 dark:text-amber-400">Obs.: {item.notes}</span>}
                            </li>
                          );
                        })}
                      </ul>
                      {order.customerNotes && <p className="mt-2 rounded bg-amber-50 p-2 text-xs dark:bg-amber-950">{order.customerNotes}</p>}
                      <p className="mt-3 text-muted-foreground">
                        {address.street}, {address.number}
                        {address.complement ? ` – ${address.complement}` : ""} · {address.neighborhood}
                      </p>
                      <p className="mt-2 font-medium">
                        {formatCents(order.totalCents)} · {paid ? "pago online" : `cobrar: ${PAYMENT_LABEL[order.paymentMethod]}`}
                        {order.changeForCents ? ` (troco p/ ${formatCents(order.changeForCents)})` : ""}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {order.status === "PLACED" && (
                          <>
                            <form action={acceptOrderAction.bind(null, order.id)}>
                              <Button size="sm">Aceitar</Button>
                            </form>
                            <form action={rejectOrderAction.bind(null, order.id)} className="flex gap-1">
                              <select name="reason" className="h-8 rounded-md border bg-background px-2 text-xs">
                                {REJECT_REASONS.map((r) => (
                                  <option key={r}>{r}</option>
                                ))}
                              </select>
                              <Button size="sm" variant="outline">
                                Recusar
                              </Button>
                            </form>
                          </>
                        )}
                        {order.status === "ACCEPTED" && (
                          <form action={advanceOrderAction.bind(null, order.id, "PREPARING")}>
                            <Button size="sm">Iniciar preparo</Button>
                          </form>
                        )}
                        {order.status === "PREPARING" && (
                          <form action={advanceOrderAction.bind(null, order.id, "READY_FOR_PICKUP")}>
                            <Button size="sm">Pedido pronto</Button>
                          </form>
                        )}
                        {(order.status === "READY_FOR_PICKUP" || order.status === "OUT_FOR_DELIVERY") && (
                          <Badge variant="outline">
                            {order.delivery?.courier
                              ? `${ORDER_STATUS_LABEL[order.status]} · ${order.delivery.courier.name}`
                              : "Aguardando entregador"}
                          </Badge>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
