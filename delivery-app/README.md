# [Nome do Seu App]

Delivery multi-tenant: portais do Cliente, Restaurante, Entregador (PWA) e Super Admin.
Decisões de arquitetura, rotas e práticas de segurança: [ARQUITETURA.md](ARQUITETURA.md).

## Stack

Next.js 15 (App Router) · React 19 · Tailwind CSS 4 + shadcn/ui · Zustand · Auth.js v5 ·
PostgreSQL + Prisma · Pusher (tempo real) · Mercado Pago / Stripe · Turborepo + pnpm.

## Estrutura

```
apps/web               Next.js com os 4 portais e a API (/api/v1)
packages/db            schema Prisma, migrations, seed e PrismaClient
packages/core          regras de negócio puras (preço, taxas, etapas do pedido, horários) + testes
packages/validators    schemas zod compartilhados entre front e back
packages/payments      interface PaymentGateway + Mercado Pago e Stripe
packages/config        tsconfig base
```

## Rodando localmente

Pré-requisitos: Node 20+, pnpm (`corepack enable`) e Docker (ou um Postgres gerenciado, como Neon/Supabase).

```bash
pnpm install
cp .env.example .env          # preencha AUTH_SECRET (npx auth secret)
docker compose up -d          # Postgres + Redis
pnpm db:migrate               # cria as tabelas (e roda o seed)
pnpm dev                      # http://localhost:3000
```

Usuários do seed (senha `SEED_PASSWORD`, padrão `delivery123`):

| E-mail | Portal |
|---|---|
| `cliente@delivery.test` | Cliente (`/`) |
| `loja@delivery.test` | Restaurante (`/restaurant`) |
| `entregador@delivery.test` | Entregador (`/courier`) |
| `admin@delivery.test` | Super Admin (`/admin`) |

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Gera o Prisma Client e sobe o Next.js |
| `pnpm build` | Build de produção |
| `pnpm typecheck` | TypeScript em todos os pacotes |
| `pnpm test` | Testes (Vitest) das regras de negócio |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:seed` | Popula dados de desenvolvimento |
| `pnpm db:studio` | Prisma Studio |

## Deploy (Cloudflare Workers)

Produção: https://delivery-app.wilsonpiassineto87.workers.dev

- Build e deploy automáticos pelo **Workers Builds** a cada push na branch `delivery-app`
  (o build roda no Linux da Cloudflare; o OpenNext não é compatível com build no Windows).
  - Path: `delivery-app`
  - Build: `pnpm --filter @delivery/db db:generate && pnpm --filter @delivery/web exec opennextjs-cloudflare build`
  - Deploy: `pnpm --filter @delivery/web exec opennextjs-cloudflare deploy`
  - Variável de build: `SKIP_ENV_VALIDATION=1`
- Banco: Supabase, acessado pelo **Hyperdrive** `delivery-db` (binding `HYPERDRIVE` em
  `apps/web/wrangler.jsonc`), com `sslmode=verify-full` e a CA em `certs/supabase-ca-2021.crt`.
- Segredos do Worker: `AUTH_SECRET` (`wrangler secret put AUTH_SECRET`).
- Migrations no Supabase: rode `prisma migrate deploy` com `DATABASE_URL`/`DIRECT_URL`
  apontando para o *session pooler* (porta 5432), guardado em `.env.supabase.local` (fora do git).

## O que já está implementado

- Autenticação (e-mail/senha com argon2, Google opcional) e proteção de rotas por role.
- Autorização centralizada em `apps/web/src/lib/authz.ts` (role, membro da loja, entregador aprovado).
- Catálogo de lojas por proximidade e página de cardápio.
- `POST /api/v1/checkout/quote` e `POST /api/v1/orders`: preço recalculado no servidor, idempotência, Pix via Mercado Pago.
- Webhook do Mercado Pago com verificação de assinatura e deduplicação.
- Aceite do pedido pela loja (cria a entrega com PIN) e aceite atômico da corrida pelo entregador.
- Carrinho com Zustand (persistido no navegador).

As demais telas estão como páginas provisórias que listam o que falta implementar.
