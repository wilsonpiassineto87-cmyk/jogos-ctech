import "server-only";
import { cache } from "react";
import { forget, memo } from "./memo";
import { prisma } from "./db";

const STORE_KEY = "store";

// O app funciona para UMA loja. Ela é escolhida por STORE_SLUG (wrangler.jsonc / .env)
// ou, sem a variável, é a primeira loja cadastrada. O schema continua multi-loja, então
// dá para voltar a ser marketplace sem migrar o banco.
// Guardada 10 s na memória do Worker: toda página lê a loja, e é uma consulta a menos por
// visita. Quem altera a loja chama forgetStore() para a mudança aparecer na hora.
export const getStore = cache(() => memo(STORE_KEY, 10_000, loadStore));

/** Chamar depois de salvar qualquer dado da loja (nome, aberta/pausada, horários, cores). */
export const forgetStore = () => forget(STORE_KEY);

async function loadStore() {
  const slug = process.env.STORE_SLUG;
  const store = await prisma.store.findFirst({
    where: { deletedAt: null, ...(slug ? { slug } : {}) },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      phone: true,
      logoUrl: true,
      bannerUrl: true,
      status: true,
      isOpen: true,
      timezone: true,
      latitude: true,
      longitude: true,
      street: true,
      number: true,
      neighborhood: true,
      city: true,
      state: true,
      zipCode: true,
      deliveryRadiusKm: true,
      minOrderCents: true,
      prepTimeMinutes: true,
      ratingAvg: true,
      ratingCount: true,
      theme: true,
      openingHours: { select: { dayOfWeek: true, opensAt: true, closesAt: true }, orderBy: { dayOfWeek: "asc" } },
    },
  });
  if (!store) throw new Error(slug ? `Loja "${slug}" não encontrada` : "Nenhuma loja cadastrada");
  return store;
}

export type Store = Awaited<ReturnType<typeof getStore>>;
