import { guard, requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getStore } from "@/lib/store";
import { CheckoutClient } from "@/components/customer/checkout-client";

export const metadata = { title: "Finalizar pedido" };

export default async function CheckoutPage() {
  const user = await guard(requireUser, "/checkout");
  const [store, addresses] = await Promise.all([
    getStore(),
    prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: { id: true, label: true, street: true, number: true, complement: true, neighborhood: true, city: true, state: true },
    }),
  ]);

  return (
    <CheckoutClient
      storeId={store.id}
      storeName={store.name}
      addresses={addresses}
      pixEnabled={Boolean(env.MERCADOPAGO_ACCESS_TOKEN && env.MERCADOPAGO_WEBHOOK_SECRET)}
    />
  );
}
