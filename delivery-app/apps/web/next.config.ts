import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

// O .env fica na raiz do monorepo, compartilhado com packages/db.
loadEnv({ path: path.join(process.cwd(), "../../.env"), quiet: true });

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Câmera (foto do produto) e geolocalização liberadas só para o próprio site.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Pacotes internos são publicados como TypeScript e compilados pelo Next.
  transpilePackages: ["@delivery/core", "@delivery/db", "@delivery/payments", "@delivery/validators"],
  // O Prisma lê arquivos da própria pasta (compilador de consultas .wasm): fica fora do bundle.
  serverExternalPackages: ["@prisma/client"],
  // O rastreador de arquivos do Next não percebe esse .wasm (é lido com readFileSync).
  outputFileTracingIncludes: {
    "*": ["../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/query_compiler_bg.wasm"],
  },
  poweredByHeader: false,
  // Fotos de produto vão pelo formulário do painel. O aparelho já reduz para ~100 KB,
  // mas uma foto grande que não deu para reduzir ainda passa do limite padrão de 1 MB.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  // As fotos já chegam reduzidas e são servidas com cache longo; sem otimizador.
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
