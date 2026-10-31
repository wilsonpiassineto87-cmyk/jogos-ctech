import { formatCents } from "@delivery/core";
import { prisma } from "@/lib/db";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, formatDateTime, formatTime } from "@/lib/order-status";
import { PrintOrderButtons } from "@/components/receipt/print-buttons";
import { NewOrderAlert } from "@/components/restaurant/new-order-alert";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Pedidos" };

export default async function AdminOrdersPage() {
  const [orders, placed] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        code: true,
        status: true,
        createdAt: true,
        totalCents: true,
        paymentMethod: true,
        customer: { select: { name: true } },
        delivery: { select: { courier: { select: { name: true } } } },
      },
    }),
    // Pedidos esperando a loja aceitar: alimentam o aviso de pedido novo.
    prisma.order.findMany({ where: { status: "PLACED" }, orderBy: { createdAt: "desc" }, select: { id: true, code: true, createdAt: true } }),
  ]);
  const newest = placed[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <AutoRefresh intervalMs={15_000} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold tracking-tight">Pedidos</h1>
        <NewOrderAlert
          pendingCount={placed.length}
          latest={newest ? { id: newest.id, code: newest.code, time: formatTime(newest.createdAt) } : null}
        />
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Pedido</th>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Entregador</th>
              <th className="px-4 py-2 font-medium">Pagamento</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Impressão</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum pedido ainda.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-2 whitespace-nowrap">
                  #{o.code}
                  <span className="block text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</span>
                </td>
                <td className="px-4 py-2">{o.customer.name}</td>
                <td className="px-4 py-2">{o.delivery?.courier?.name ?? "—"}</td>
                <td className="px-4 py-2">{PAYMENT_LABEL[o.paymentMethod]}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCents(o.totalCents)}</td>
                <td className="px-4 py-2">
                  <Badge variant="outline">{ORDER_STATUS_LABEL[o.status]}</Badge>
                </td>
                <td className="px-4 py-2">
                  <div className="w-max">
                    <PrintOrderButtons orderId={o.id} compact />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
