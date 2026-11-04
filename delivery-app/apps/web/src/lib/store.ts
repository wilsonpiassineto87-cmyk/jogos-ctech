import "server-only";
import { cache } from "react";
import { forget, memo } from "./memo";
import { prisma } from "./db";

const STORE_KEY = "store";

// O app funciona para UMA loja. Ela é escolhida por STORE_SLUG (.env / painel da Netlify)
// ou, sem a variável, é a primeira loja cadastrada. O schema continua multi-loja, então
// dá para voltar a ser marketplace sem migrar o banco.
// Guardada 10 s na memória do Worker: toda página lê a loja, e é uma consulta a menos por
// visita. Quem altera a loja chama forgetStore() para a mudança aparecer na hora.
export const getStore = cache(() => memo(STORE_KEY, 10_000, loadStore));

/** Chamar depois de salvar qualquer dado da loja (nome, aberta/pausada, horários, cores). */
export const forgetStore = () => forget(STORE_KEY);

/**
 * Loja lida direto do banco. No site publicado há várias cópias do servidor e forgetStore()
 * só limpa a memória de uma delas: as telas do painel, que mostram o que acabou de ser salvo,
 * usam esta para não exibir o valor antigo por alguns segundos.
 */
export const getFreshStore = cache(loadStore);

/** Só as cores, sempre do banco: consulta pequena, e a cor nova vale na hora em todas as cópias. */
export const getStoreTheme = cache(async () => {
  const store = await prisma.store.findFirst({ ...storeQuery(), select: { theme: true } });
  return store?.theme ?? null;
});

function storeQuery() {
  const slug = process.env.STORE_SLUG;
  return { where: { deletedAt: null, ...(slug ? { slug } : {}) }, orderBy: { createdAt: "asc" as const } };
}

async function loadStore() {
  const slug = process.env.STORE_SLUG;
  const store = await prisma.store.findFirst({
    ...storeQuery(),
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
