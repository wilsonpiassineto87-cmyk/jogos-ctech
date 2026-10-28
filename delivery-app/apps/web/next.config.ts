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

const nextConfig: NextConfig = {
  // Pacotes internos são publicados como TypeScript e compilados pelo Next.
  transpilePackages: ["@delivery/core", "@delivery/db", "@delivery/payments", "@delivery/validators"],
  serverExternalPackages: ["@node-rs/argon2"],
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // TODO: domínio do bucket de imagens (S3 / R2 / UploadThing)
      { protocol: "https", hostname: "**.r2.dev" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
