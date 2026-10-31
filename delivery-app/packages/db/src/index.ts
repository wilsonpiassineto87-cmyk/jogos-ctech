import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { SUPABASE_CA } from "./supabase-ca";

/**
 * Cria um PrismaClient que fala com o Postgres pelo driver `pg` (driver adapter).
 * No Supabase a conexão usa TLS e confere o certificado do servidor com a CA do Supabase.
 */
export function createPrismaClient(options: { connectionString?: string } = {}) {
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definida");

  const url = new URL(connectionString);
  const isSupabase = /\.supabase\.(com|co)$/.test(url.hostname);
  if (isSupabase) {
    // Parâmetros de SSL na URL substituiriam a configuração abaixo (e a CA).
    for (const key of ["sslmode", "sslcert", "sslrootcert", "sslaccept", "pgbouncer"]) url.searchParams.delete(key);
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url.toString(),
      ssl: isSupabase ? { ca: SUPABASE_CA } : undefined,
      // Funções serverless: poucas conexões por instância; o pooler do Supabase faz o resto.
      max: isSupabase ? 3 : undefined,
    }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export * from "@prisma/client";
