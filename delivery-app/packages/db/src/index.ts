import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
// Variante para runtimes sem disco (Cloudflare Workers): carrega o compilador de
// consultas como WebAssembly. Importá-la no Node é seguro, pois o wasm só é lido
// quando um client é criado.
import { PrismaClient as WorkersPrismaClient } from "./workers-client.cjs";

const isWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

/**
 * Cria um PrismaClient que fala com o Postgres pelo driver `pg` (driver adapter).
 * Funciona no Node e no Cloudflare Workers. Quem chama decide o ciclo de vida:
 * no Workers, um client por requisição com `maxUses: 1` (conexões não podem ser
 * reaproveitadas entre requisições); no Node, uma instância compartilhada.
 */
export function createPrismaClient(options: { connectionString?: string; maxUses?: number } = {}) {
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definida");

  // O OpenNext empacota a variante Node do @prisma/client (que procura arquivos no
  // disco); no Workers usamos explicitamente a variante wasm, de mesma API.
  const Client = isWorkers ? (WorkersPrismaClient as unknown as typeof PrismaClient) : PrismaClient;
  return new Client({
    adapter: new PrismaPg({ connectionString, maxUses: options.maxUses }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export * from "@prisma/client";
