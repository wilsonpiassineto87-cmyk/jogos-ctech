import "server-only";
import { createPrismaClient, type PrismaClient } from "@delivery/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";

// No Cloudflare Workers o banco é acessado pelo Hyperdrive (pool de conexões da
// Cloudflare, que valida o certificado do Supabase). Uma conexão aberta em uma
// requisição não pode ser usada em outra: um client por requisição (React `cache`).
// No Node (next dev / testes), usa DATABASE_URL e reaproveita uma instância.
const isWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

// O pool nasce e morre com a requisição (cache), então pode reaproveitar conexões entre
// as consultas da mesma página; `maxUses: 1` abriria uma conexão nova a cada consulta.
const perRequest = cache(() => {
  const { env } = getCloudflareContext();
  return createPrismaClient({ connectionString: env.HYPERDRIVE.connectionString });
});
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrisma(): PrismaClient {
  if (isWorkers) return perRequest();
  return (globalForPrisma.prisma ??= createPrismaClient());
}

/** Use como um PrismaClient normal; a instância certa é escolhida a cada acesso. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
