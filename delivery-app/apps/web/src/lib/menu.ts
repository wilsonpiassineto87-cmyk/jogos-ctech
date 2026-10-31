import "server-only";
import { revalidatePath } from "next/cache";
import { getMenu } from "@/features/stores/queries";
import { forget, memo } from "./memo";

const key = (storeId: string) => `menu:${storeId}`;

/**
 * Cardápio público guardado 20 s na memória do Worker (4 consultas a menos por visita).
 * Preço e disponibilidade são conferidos de novo no banco ao calcular e criar o pedido.
 */
export const getPublicMenu = (storeId: string) => memo(key(storeId), 20_000, () => getMenu(storeId));

/** Depois de mudar produto, categoria, foto ou complemento: o cardápio público mostra na hora. */
export function refreshPublicMenu(storeId: string) {
  forget(key(storeId));
  revalidatePath("/");
}
