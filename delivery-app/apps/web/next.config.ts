import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

// O .env fica na raiz do monorepo, compartilhado com packages/db.
loadEnv({ path: path.join(process.cwd(), "../../.env"), quiet: true });

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Geolocalização liberada só para o próprio site (PWA do entregador e checkout).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // TODO: Content-Security-Policy com nonce quando os domínios de mapa/pagamento estiverem definidos.
];

/** dist/index.js do pg-cloudflare na pasta do pnpm (o pacote não exporta esse caminho). */
function pgCloudflareEntry(): string {
  const store = path.join(process.cwd(), "../../node_modules/.pnpm");
  const dir = fs.readdirSync(store).find((name) => name.startsWith("pg-cloudflare@"));
  if (!dir) throw new Error("pg-cloudflare não encontrado em node_modules/.pnpm");
  return path.join(store, dir, "node_modules/pg-cloudflare/dist/index.js");
}

const nextConfig: NextConfig = {
  // Pacotes internos são publicados como TypeScript e compilados pelo Next.
  transpilePackages: ["@delivery/core", "@delivery/db", "@delivery/payments", "@delivery/validators"],
  // O runtime do Prisma fica fora do bundle do webpack (o OpenNext o empacota para o Workers).
  serverExternalPackages: ["@prisma/client"],
  poweredByHeader: false,
  // Client gerado pelo Prisma (packages/db/generated/client), inclusive a variante wasm.
  outputFileTracingIncludes: {
    "*": ["../../packages/db/generated/client/**/*"],
  },
  // O wrangler instala o sharp (nativo) e o Next o incluiria no bundle do servidor,
  // quebrando o build para o Workers. As imagens já são servidas sem otimização.
  outputFileTracingExcludes: {
    "*": ["**/node_modules/sharp/**", "**/node_modules/@img/**", "**/.pnpm/sharp@*/**", "**/.pnpm/@img+*/**"],
  },
  images: {
    // O otimizador de imagens do Next usa o sharp (nativo), que não roda no Workers.
    // TODO: usar Cloudflare Images (binding IMAGES) quando houver fotos de produtos.
    unoptimized: true,
    remotePatterns: [
      // TODO: domínio do bucket de imagens (S3 / R2 / UploadThing)
      { protocol: "https", hostname: "**.r2.dev" },
    ],
  },
  webpack(config, { isServer }) {
    // O client gerado pelo Prisma fica como require externo (caminho absoluto):
    // - a variante Node lê arquivos relativos à própria pasta, o que quebra se empacotada;
    // - a variante wasm (Workers) importa um .wasm que o webpack não lê.
    // O OpenNext/wrangler empacota esses arquivos no deploy.
    if (isServer) {
      // O pg só usa o pg-cloudflare quando roda no Workers, mas o webpack resolve o
      // pacote com as condições do Node e pega a versão vazia (dist/empty.js); aí a
      // conexão falha com "CloudflareSocket is not a constructor". Força a versão real.
      config.resolve.alias["pg-cloudflare$"] = pgCloudflareEntry();
      // Módulo embutido do Workers. O `.catch` faz o esbuild do OpenNext manter o import
      // sem tentar resolvê-lo (sem ele, "Could not resolve cloudflare:sockets").
      config.externals.push({
        "cloudflare:sockets": "var import('cloudflare:sockets').catch((error) => { throw error; })",
      });
      config.externals.push(
        (
          { context, request }: { context?: string; request?: string },
          callback: (error?: Error, result?: string) => void,
        ) => {
          const target = context && request?.startsWith(".") ? path.resolve(context, request) : "";
          if (/[\\/]packages[\\/]db[\\/]generated[\\/]client[\\/]/.test(target)) {
            return callback(undefined, `commonjs ${target.replace(/\\/g, "/")}`);
          }
          callback();
        },
      );
    }
    return config;
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
