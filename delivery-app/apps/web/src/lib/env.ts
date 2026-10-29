import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Falha na inicialização se faltar variável obrigatória; segredos nunca vão para o client.
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Obrigatória no Node; no Cloudflare Workers a conexão vem do binding HYPERDRIVE.
    DATABASE_URL: z.url().optional(),
    AUTH_SECRET: z.string().min(16),
    AUTH_URL: z.url().optional(),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
    MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    PUSHER_APP_ID: z.string().optional(),
    PUSHER_SECRET: z.string().optional(),
    REDIS_URL: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
    NEXT_PUBLIC_PUSHER_CLUSTER: z.string().default("sa1"),
    NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
