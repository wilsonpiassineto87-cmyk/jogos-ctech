# Delivery — loja única

App de delivery para uma loja: portais do Cliente, da Loja, do Entregador (PWA) e Admin.
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

Usuários do seed (senha `SEED_PASSWORD`; padrão `delivery123` só no banco local).
No site publicado, a senha é outra, aleatória, guardada em `SEED_PASSWORD` no arquivo
`.env.supabase.local` (fora do git):

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

O app atende **uma loja** (`STORE_SLUG`); o banco continua multi-loja.

- **Cliente:** cardápio na página inicial, complementos (tamanho, borda...), carrinho, checkout com
  endereço (CEP pelo ViaCEP, coordenadas pelo OpenStreetMap), pagamento na entrega (dinheiro com troco
  ou maquininha) ou Pix (se o Mercado Pago estiver configurado), acompanhamento com linha do tempo e PIN
  de entrega, histórico e endereços.
- **Loja** (`/restaurant`): painel de pedidos com aviso sonoro (aceitar, recusar, preparo, pronto),
  pausar a loja, cardápio (produtos, categorias, esgotado), configurações (taxa de entrega, raio,
  pedido mínimo), relatórios e avaliações.
- **Entregador** (`/courier`): online/offline, corridas disponíveis (só o bairro antes de aceitar),
  aceite atômico, rota no Google Maps, coleta e confirmação com o PIN, histórico e ganhos.
- **Admin** (`/admin`): visão geral, pedidos, aprovar entregadores, dar acesso à loja e tornar
  usuário entregador (tudo registrado no `AuditLog`).
- Telas atualizam sozinhas a cada 5–10 s (o tempo real via Pusher fica pronto para quando houver chave).

Ainda não tem tela: edição de complementos e de horários de funcionamento, avaliação pelo cliente.
