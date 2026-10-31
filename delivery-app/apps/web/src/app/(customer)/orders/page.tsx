import { formatCents } from "@delivery/core";
import Link from "@/components/shared/link";
import { guard, requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { FINAL_ORDER_STATUSES, ORDER_STATUS_LABEL, formatDateTime } from "@/lib/order-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Meus pedidos" };

export default async function OrdersPage() {
  const user = await guard(requireUser, "/orders");
  const orders = await prisma.order.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      code: true,
      status: true,
      totalCents: true,
      createdAt: true,
      items: { select: { quantity: true, productName: true } },
    },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Meus pedidos</h1>
      {orders.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">Você ainda não fez nenhum pedido.</p>
          <Button asChild className="mt-4">
            <Link href="/">Ver cardápio</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className="block rounded-xl border p-4 hover:bg-accent/50">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    #{order.code} · {formatDateTime(order.createdAt)}
                  </span>
                  <Badge variant={FINAL_ORDER_STATUSES.includes(order.status) ? "secondary" : "default"}>
                    {ORDER_STATUS_LABEL[order.status]}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-1 text-sm">
                  {order.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}
                </p>
                <p className="mt-1 font-medium">{formatCents(order.totalCents)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
