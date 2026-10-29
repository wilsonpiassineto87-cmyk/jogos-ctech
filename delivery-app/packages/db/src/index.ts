import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client/index.js";
// Variante para runtimes sem disco (Cloudflare Workers), carregada sob demanda:
// lê o compilador de consultas como WebAssembly.
import loadWorkersPrismaClient from "./workers-client.cjs";

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

  // A variante Node procura arquivos no disco; no Workers usamos a variante wasm, de mesma API.
  const Client = isWorkers ? loadWorkersPrismaClient() : PrismaClient;
  return new Client({
    adapter: new PrismaPg({ connectionString, maxUses: options.maxUses }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export * from "../generated/client/index.js";
