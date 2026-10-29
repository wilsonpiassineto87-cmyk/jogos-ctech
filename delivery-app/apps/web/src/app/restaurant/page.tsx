import { redirect } from "next/navigation";
import { getStore } from "@/lib/store";

// Loja única: o painel abre direto nos pedidos dela (o layout de [storeId] confere o acesso).
export default async function RestaurantIndexPage() {
  const store = await getStore();
  redirect(`/restaurant/${store.id}/orders`);
}
