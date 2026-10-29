"use server";

import { runAction } from "@/lib/action";
import { requireUser } from "@/lib/authz";
import { transitionOrder } from "./status";

/** Cliente cancela o próprio pedido (a máquina de estados só permite antes da loja aceitar). */
export async function cancelOrderAction(orderId: string): Promise<void> {
  const user = await requireUser();
  await runAction(`/orders/${orderId}`, () =>
    transitionOrder({
      orderId,
      to: "CANCELLED",
      actor: "CUSTOMER",
      userId: user.id,
      scope: { customerId: user.id },
      note: "Cancelado pelo cliente",
    }),
  );
}
