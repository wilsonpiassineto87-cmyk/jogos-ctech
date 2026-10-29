import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Cria um PrismaClient que fala com o Postgres pelo driver `pg` (driver adapter).
 * Funciona no Node e no Cloudflare Workers. Quem chama decide o ciclo de vida:
 * no Workers, um client por requisição com `maxUses: 1` (conexões não podem ser
 * reaproveitadas entre requisições); no Node, uma instância compartilhada.
 */
export function createPrismaClient(options: { connectionString?: string; maxUses?: number } = {}) {
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definida");

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, maxUses: options.maxUses }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export * from "@prisma/client";
