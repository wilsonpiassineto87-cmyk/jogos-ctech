import "server-only";
import { redirect } from "next/navigation";
import { requireStoreMember } from "@/lib/authz";
import { getStore } from "@/lib/store";

/** Membro da loja (o storeId vem do servidor, nunca do formulário). */
export async function storeMember(minRole: "STAFF" | "MANAGER" = "STAFF") {
  const store = await getStore();
  const { user } = await requireStoreMember(store.id, minRole);
  return { store, user, base: `/restaurant/${store.id}` };
}

export function failTo(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export const formText = (form: FormData, key: string) => String(form.get(key) ?? "");
