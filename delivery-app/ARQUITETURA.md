# [Nome do Seu App] — Arquitetura

Web App de delivery multi-tenant com 4 portais: **Cliente**, **Restaurante**, **Entregador (PWA)** e **Super Admin**.

- Schema do banco: [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma)

---

## 0. Decisões de arquitetura

| Tema | Decisão | Motivo |
|---|---|---|
| Repositório | **Monorepo Turborepo + pnpm** | Um app Next.js para os 4 portais, mais pacotes compartilhados (db, validação, regras de negócio, pagamentos). Permite extrair um app separado no futuro sem refatorar. |
| Portais | **Um único app Next.js** com segmentos `/restaurant`, `/courier`, `/admin` (opcionalmente servidos por subdomínio via `middleware.ts`) | Deploy único, auth compartilhada, código de UI reaproveitado. Cada portal tem seu `layout.tsx` e guarda de acesso. |
| Backend | **Route Handlers (`app/api`) + Server Actions** | Server Actions para mutações feitas pela própria UI (formulários do cardápio, painel admin). Route Handlers para o que precisa de URL estável: webhooks, PWA do entregador, app mobile futuro, integrações. |
| Regras de negócio | **`packages/core`** em TypeScript puro | Cálculo de preço/taxas, máquina de estados do pedido e despacho ficam fora do Next.js → testáveis com Vitest e reaproveitáveis. |
| Tempo real | **Pusher/Ably (recomendado na Vercel)** ou **Socket.io em `apps/realtime`** (se hospedar em VPS/Fly/Railway) | Funções serverless não mantêm WebSocket aberto. Socket.io exige um processo Node persistente + adapter Redis para escalar. Abstraia atrás de `lib/realtime.ts` para trocar sem dor. |
| Pagamentos | **Interface `PaymentGateway`** com adaptadores **Mercado Pago** (Pix + cartão, foco Brasil) e **Stripe** | Para o Brasil, o Mercado Pago cobre Pix nativamente e o split para lojas (marketplace). Stripe Connect se houver operação internacional. |
| Fila / jobs | **Inngest, QStash ou BullMQ (Redis)** | Timeout de aceite do pedido, busca de entregador, e-mails, push, recálculo de avaliações. Nunca dentro do request. |
| Cache / geo | **Redis (Upstash)** | Rate limit, posição ao vivo dos entregadores (`GEOADD`/`GEOSEARCH`), locks de despacho. |
| Arquivos | **S3 / Cloudflare R2 / UploadThing** com URL pré-assinada | O upload vai direto do navegador para o storage; o servidor só assina. |
| Mapas | **Mapbox** ou **Google Maps Platform** | Geocoding de endereços no checkout, rota restaurante → cliente, ETA. |

---

## 1. Estrutura de pastas

```
delivery-app/
├── apps/
│   ├── web/                                 # Next.js 14+ (App Router) — os 4 portais
│   │   ├── public/
│   │   │   ├── manifest.webmanifest         # PWA do entregador
│   │   │   ├── icons/
│   │   │   └── sounds/new-order.mp3         # alerta do painel do restaurante
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   └── register/page.tsx
│   │   │   │   │
│   │   │   │   ├── (customer)/              # Portal do Cliente (rotas públicas na raiz)
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── page.tsx             # catálogo de lojas
│   │   │   │   │   ├── search/page.tsx
│   │   │   │   │   ├── category/[slug]/page.tsx
│   │   │   │   │   ├── store/[slug]/page.tsx            # cardápio da loja
│   │   │   │   │   ├── checkout/page.tsx                # endereço + pagamento
│   │   │   │   │   ├── orders/page.tsx                  # histórico
│   │   │   │   │   ├── orders/[id]/page.tsx             # rastreamento em tempo real
│   │   │   │   │   └── account/{profile,addresses}/page.tsx
│   │   │   │   │
│   │   │   │   ├── restaurant/              # Portal do Restaurante
│   │   │   │   │   ├── layout.tsx           # exige role MERCHANT
│   │   │   │   │   ├── page.tsx             # seletor de loja (se for membro de várias)
│   │   │   │   │   ├── onboarding/page.tsx
│   │   │   │   │   └── [storeId]/
│   │   │   │   │       ├── layout.tsx       # exige StoreMember dessa loja
│   │   │   │   │       ├── orders/page.tsx  # painel kanban + som de notificação
│   │   │   │   │       ├── menu/page.tsx    # CRUD de categorias / produtos / complementos
│   │   │   │   │       ├── menu/[productId]/page.tsx
│   │   │   │   │       ├── reviews/page.tsx
│   │   │   │   │       ├── reports/page.tsx
│   │   │   │   │       └── settings/{store,hours,team}/page.tsx
│   │   │   │   │
│   │   │   │   ├── courier/                 # Portal do Entregador (PWA, mobile first)
│   │   │   │   │   ├── layout.tsx           # exige CourierProfile APPROVED
│   │   │   │   │   ├── page.tsx             # online/offline + corridas disponíveis
│   │   │   │   │   ├── onboarding/page.tsx  # documentos, veículo
│   │   │   │   │   ├── delivery/[id]/page.tsx  # mapa, rota, confirmar entrega (PIN)
│   │   │   │   │   ├── history/page.tsx
│   │   │   │   │   └── earnings/page.tsx
│   │   │   │   │
│   │   │   │   ├── admin/                   # Super Admin
│   │   │   │   │   ├── layout.tsx           # exige role ADMIN
│   │   │   │   │   ├── page.tsx             # métricas gerais
│   │   │   │   │   ├── users/page.tsx
│   │   │   │   │   ├── stores/page.tsx      # aprovar / suspender
│   │   │   │   │   ├── stores/[id]/page.tsx # comissão específica
│   │   │   │   │   ├── couriers/page.tsx
│   │   │   │   │   ├── orders/page.tsx
│   │   │   │   │   ├── fees/page.tsx        # DeliveryFeeRule + PlatformSettings
│   │   │   │   │   └── audit-log/page.tsx
│   │   │   │   │
│   │   │   │   ├── api/                     # Route Handlers (ver seção 3)
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── manifest.ts
│   │   │   │   └── not-found.tsx
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── ui/                      # shadcn/ui (gerado pela CLI)
│   │   │   │   ├── shared/                  # Header, Map, Price, StatusBadge...
│   │   │   │   ├── customer/
│   │   │   │   ├── restaurant/
│   │   │   │   ├── courier/
│   │   │   │   └── admin/
│   │   │   │
│   │   │   ├── features/                    # módulos de domínio do lado servidor
│   │   │   │   ├── orders/      { actions.ts, queries.ts, service.ts }
│   │   │   │   ├── menu/        { actions.ts, queries.ts }
│   │   │   │   ├── stores/
│   │   │   │   ├── delivery/    { dispatch.ts, queries.ts }
│   │   │   │   ├── payments/    { checkout.ts, webhook-handlers.ts }
│   │   │   │   └── admin/
│   │   │   │
│   │   │   ├── stores/                      # Zustand (somente estado de cliente)
│   │   │   │   ├── cart-store.ts            # persistido em localStorage, 1 loja por carrinho
│   │   │   │   ├── address-store.ts
│   │   │   │   └── courier-store.ts         # online/offline, corrida ativa
│   │   │   │
│   │   │   ├── hooks/                       # useOrderChannel, useGeolocation, useNewOrderSound...
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts                  # Auth.js v5 (config + helpers)
│   │   │   │   ├── authz.ts                 # requireRole, requireStoreMember, requireCourier
│   │   │   │   ├── db.ts                    # re-export do @app/db
│   │   │   │   ├── realtime.ts              # publish/subscribe (Pusher ou Socket.io)
│   │   │   │   ├── rate-limit.ts
│   │   │   │   ├── storage.ts               # URLs pré-assinadas
│   │   │   │   ├── maps.ts
│   │   │   │   └── env.ts                   # validação das variáveis com zod (@t3-oss/env-nextjs)
│   │   │   ├── middleware.ts                # sessão, subdomínios, redirecionamentos por role
│   │   │   └── worker/sw.ts                 # service worker (Serwist): push + offline
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── realtime/                            # (opcional) servidor Socket.io
│       ├── src/
│       │   ├── index.ts                     # io + @socket.io/redis-adapter
│       │   ├── auth.ts                      # valida token assinado pelo app web
│       │   └── rooms.ts                     # order:{id}, store:{id}, courier:{id}
│       └── package.json
│
├── packages/
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/index.ts                     # singleton do PrismaClient
│   ├── core/                                # regras de negócio puras (sem Next/Prisma)
│   │   ├── src/
│   │   │   ├── pricing.ts                   # subtotal, opções, taxa de entrega, comissão
│   │   │   ├── order-state-machine.ts       # transições válidas + quem pode fazê-las
│   │   │   ├── opening-hours.ts             # loja aberta agora? (fuso da loja)
│   │   │   ├── geo.ts                       # haversine, raio de entrega
│   │   │   └── money.ts                     # formatação BRL a partir de centavos
│   │   └── tests/
│   ├── validators/                          # schemas zod compartilhados (front + back)
│   │   └── src/{order,menu,store,address,courier,admin}.ts
│   ├── payments/
│   │   └── src/
│   │       ├── gateway.ts                   # interface PaymentGateway
│   │       ├── mercadopago.ts
│   │       └── stripe.ts
│   └── config/                              # eslint, tsconfig base, tailwind preset
│
├── docker-compose.yml                       # postgres (postgis) + redis para dev
├── .env.example
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Regra de ouro:** componentes chamam `features/*` (actions/queries) → que chamam `packages/core` para regras e `packages/db` para persistência. A UI nunca importa o Prisma diretamente.

---

## 2. Banco de dados

O schema completo está em [`packages/db/prisma/schema.prisma`](packages/db/prisma/schema.prisma).

### Relações principais

```
User ─┬─< Address
      ├─< StoreMember >── Store ─┬─< ProductCategory ─< Product ─< ProductOptionGroup ─< ProductOption
      ├── CourierProfile         ├─< OpeningHour
      │                          └─>< StoreCategory (culinária, N:N)
      ├─< Order (cliente) ───────┬── Store
      │                          ├─< OrderItem >── Product (opcional, snapshot)
      │                          ├─< OrderStatusHistory
      │                          ├── Delivery >── User (entregador)
      │                          ├─< Payment
      │                          └── Review
      ├─< Notification / PushSubscription
      └─< AuditLog

PlatformSettings (linha única) · DeliveryFeeRule · WebhookEvent
```

### Decisões de modelagem

- **Multi-tenant por coluna (`storeId`)**: a "loja" é o tenant. Um usuário pode ser membro de várias lojas (`StoreMember` com OWNER/MANAGER/STAFF). Toda query do portal do restaurante passa por um helper que injeta `storeId` e confere a associação. Para defesa em profundidade, dá para adicionar Row-Level Security do Postgres depois.
- **Dinheiro em centavos (`Int`)** e **percentuais em basis points** (`1200` = 12%). Sem `Float` para valores.
- **Snapshots no pedido**: `OrderItem.productName/unitPriceCents/options`, `Order.deliveryAddress/commissionBps`. Editar ou apagar um produto não altera pedidos antigos.
- **`Payment` 1:N com `Order`**: suporta novas tentativas (Pix expirado, cartão recusado). `idempotencyKey` e `providerPaymentId` são únicos.
- **`WebhookEvent`** com `@@unique([provider, eventId])`: o mesmo evento nunca é processado duas vezes.
- **`Delivery` separado de `Order`**: ciclo de vida próprio (WAITING_COURIER → ASSIGNED → AT_STORE → PICKED_UP → DELIVERED) e `confirmationCode` (PIN) para provar a entrega.
- **Comissão**: `Store.commissionBps` (se definido) senão `PlatformSettings.defaultCommissionBps`; o valor efetivo é copiado no pedido.
- **Soft delete** (`deletedAt`) em User, Store e Product.
- **Geo**: começa com `latitude/longitude Float` + índice e filtro por bounding box + haversine. Quando o volume crescer, ative **PostGIS** (`geography(Point, 4326)` + índice GiST) e faça as buscas de raio com `$queryRaw`.

### Máquina de estados do pedido

```
PENDING_PAYMENT ──(webhook pago / dinheiro)──► PLACED ──(loja)──► ACCEPTED ──► PREPARING ──► READY_FOR_PICKUP
       │                                         │                                               │
       └──(expirou)──► CANCELLED ◄──(timeout)────┤                              (entregador coleta)
                                                 └──(loja recusa)──► REJECTED                    ▼
                                                                                         OUT_FOR_DELIVERY ──(PIN)──► DELIVERED
```

As transições válidas (e quem pode executá-las) ficam em `packages/core/order-state-machine.ts`. Cada mudança grava uma linha em `OrderStatusHistory` **na mesma transação** e só depois publica o evento em tempo real.

---

## 3. Rotas da API

> Convenção: `/api/v1/...` para tudo que é consumido fora da própria UI web. Mutações internas do painel podem ser Server Actions que chamam o mesmo `service`.

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| `*` | `/api/auth/[...nextauth]` | Auth.js (credenciais, Google, magic link) |
| POST | `/api/v1/auth/register` | Cadastro de cliente |
| POST | `/api/v1/auth/register/merchant` | Cadastro de loja (fica PENDING_APPROVAL) |
| POST | `/api/v1/auth/register/courier` | Cadastro de entregador (fica PENDING_APPROVAL) |
| POST | `/api/v1/auth/password/forgot` · `/reset` | Recuperação de senha |

### Cliente (público + autenticado)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/stores?lat=&lng=&category=&cursor=` | Lojas que entregam no ponto, abertas primeiro |
| GET | `/api/v1/stores/:slug` | Dados da loja (horário, taxa estimada, avaliação) |
| GET | `/api/v1/stores/:slug/menu` | Cardápio completo (categorias, produtos, complementos) |
| GET | `/api/v1/search?q=&lat=&lng=` | Busca de lojas e produtos |
| GET | `/api/v1/categories` | Categorias de culinária |
| GET/POST | `/api/v1/me/addresses` | Listar / criar endereço (geocodifica no servidor) |
| PATCH/DELETE | `/api/v1/me/addresses/:id` | Editar / remover |
| POST | `/api/v1/checkout/quote` | Recalcula carrinho no servidor: preços, disponibilidade, taxa de entrega, total |
| POST | `/api/v1/orders` | Cria pedido + pagamento (header `Idempotency-Key`) |
| GET | `/api/v1/orders` | Meus pedidos (cursor) |
| GET | `/api/v1/orders/:id` | Detalhe + status + posição do entregador |
| POST | `/api/v1/orders/:id/cancel` | Cancelar (só antes de ACCEPTED) |
| POST | `/api/v1/orders/:id/payments` | Nova tentativa de pagamento |
| POST | `/api/v1/orders/:id/review` | Avaliar loja e entregador |
| POST | `/api/v1/realtime/auth` | Autoriza inscrição em canal privado (Pusher) / emite token (Socket.io) |

### Restaurante (`requireStoreMember(storeId)`)
| Método | Rota | Descrição |
|---|---|---|
| GET/PATCH | `/api/v1/merchant/stores/:storeId` | Dados da loja, raio, pedido mínimo, tempo de preparo |
| PATCH | `/api/v1/merchant/stores/:storeId/open` | Abrir / pausar loja |
| PUT | `/api/v1/merchant/stores/:storeId/hours` | Horários de funcionamento |
| GET/POST | `/api/v1/merchant/stores/:storeId/categories` | CRUD de categorias do cardápio |
| PATCH/DELETE | `/api/v1/merchant/stores/:storeId/categories/:id` | |
| PATCH | `/api/v1/merchant/stores/:storeId/categories/reorder` | Ordenação (drag and drop) |
| GET/POST | `/api/v1/merchant/stores/:storeId/products` | CRUD de produtos |
| GET/PATCH/DELETE | `/api/v1/merchant/stores/:storeId/products/:id` | |
| PATCH | `/api/v1/merchant/stores/:storeId/products/:id/availability` | Esgotado / disponível |
| PUT | `/api/v1/merchant/stores/:storeId/products/:id/options` | Grupos de complementos |
| POST | `/api/v1/merchant/stores/:storeId/uploads` | URL pré-assinada para imagem |
| GET | `/api/v1/merchant/stores/:storeId/orders?status=` | Painel de pedidos |
| POST | `/api/v1/merchant/stores/:storeId/orders/:id/accept` | Aceitar (define previsão) |
| POST | `/api/v1/merchant/stores/:storeId/orders/:id/reject` | Recusar (motivo obrigatório → estorno automático) |
| POST | `/api/v1/merchant/stores/:storeId/orders/:id/status` | PREPARING / READY_FOR_PICKUP |
| GET/POST/DELETE | `/api/v1/merchant/stores/:storeId/members` | Equipe |
| GET | `/api/v1/merchant/stores/:storeId/reports?from=&to=` | Vendas, ticket médio, comissões |
| POST | `/api/v1/merchant/stores/:storeId/reviews/:id/reply` | Responder avaliação |

### Entregador (`requireCourier()` — perfil APPROVED)
| Método | Rota | Descrição |
|---|---|---|
| PATCH | `/api/v1/courier/status` | Online / offline |
| POST | `/api/v1/courier/location` | Posição atual (throttle: ~10 s; grava no Redis GEO) |
| GET | `/api/v1/courier/deliveries/available` | Corridas WAITING_COURIER no raio (endereço do cliente mascarado) |
| GET | `/api/v1/courier/deliveries/active` | Corrida em andamento |
| POST | `/api/v1/courier/deliveries/:id/accept` | Aceite atômico (o primeiro vence) |
| POST | `/api/v1/courier/deliveries/:id/arrived` | Chegou no restaurante |
| POST | `/api/v1/courier/deliveries/:id/pickup` | Coletou → pedido OUT_FOR_DELIVERY |
| POST | `/api/v1/courier/deliveries/:id/complete` | Confirma com PIN (+ foto opcional) |
| POST | `/api/v1/courier/deliveries/:id/fail` | Cliente ausente, endereço errado... |
| GET | `/api/v1/courier/deliveries/history` · `/earnings` | Histórico e ganhos |
| POST/DELETE | `/api/v1/push/subscriptions` | Web Push do PWA (comum a todos os portais) |

### Super Admin (`requireRole('ADMIN')` — tudo gera `AuditLog`)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/admin/dashboard` | KPIs (GMV, pedidos, cancelamentos, tempo médio) |
| GET/PATCH | `/api/v1/admin/users` · `/users/:id` | Busca, suspender, alterar roles |
| GET | `/api/v1/admin/stores?status=` | Lojas |
| POST | `/api/v1/admin/stores/:id/approve` · `/suspend` | Moderação |
| PATCH | `/api/v1/admin/stores/:id/commission` | Comissão específica |
| GET | `/api/v1/admin/couriers?status=` | Entregadores |
| POST | `/api/v1/admin/couriers/:id/approve` · `/suspend` | Moderação |
| GET | `/api/v1/admin/orders` · `/orders/:id` | Todos os pedidos |
| POST | `/api/v1/admin/orders/:id/cancel` · `/refund` | Intervenção |
| GET/PUT | `/api/v1/admin/settings` | `PlatformSettings` (comissão padrão, taxas de entregador, timeouts) |
| GET/POST/PATCH/DELETE | `/api/v1/admin/delivery-fee-rules` | Faixas de taxa de entrega |
| GET | `/api/v1/admin/audit-logs` | Auditoria |

### Webhooks e jobs (sem sessão; autenticados por assinatura)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/webhooks/mercadopago` | Valida `x-signature`, grava `WebhookEvent`, atualiza `Payment`/`Order` |
| POST | `/api/webhooks/stripe` | Valida `stripe-signature` (corpo cru) |
| POST | `/api/jobs/*` | Chamados pela fila (Inngest/QStash) com assinatura: timeout de aceite, despacho, expiração de Pix |

### Canais de tempo real
| Canal | Quem escuta | Eventos |
|---|---|---|
| `private-order-{orderId}` | Cliente dono do pedido | `status.changed`, `courier.location`, `eta.updated` |
| `private-store-{storeId}` | Membros da loja | `order.new` (toca o som), `order.cancelled`, `courier.arrived` |
| `private-courier-{userId}` | Entregador | `delivery.offer`, `delivery.cancelled` |
| `private-region-{geohash5}` | Entregadores online na região | `delivery.available`, `delivery.taken` |
| `private-admin` | Admins | alertas operacionais |

Todo canal é privado: a inscrição passa por `/api/v1/realtime/auth`, que confere se o usuário tem direito àquele recurso.

---

## 4. Segurança

**Autenticação e sessão**
- Auth.js v5 com cookie `httpOnly`, `Secure`, `SameSite=Lax`; senhas com **argon2id**; verificação de e-mail/telefone.
- Sessão curta para Admin com **2FA (TOTP)** obrigatório.
- Coloque `roles` e `storeIds` no token apenas como dica de UI — **a autorização sempre consulta o banco** (roles podem ser revogadas).

**Autorização (o ponto mais crítico em multi-tenant)**
- Helpers únicos em `lib/authz.ts`: `requireRole`, `requireStoreMember(storeId, minRole)`, `requireCourier`, `requireOrderAccess(orderId)`. Nenhuma rota faz checagem "na mão".
- **Toda query com escopo de tenant inclui o `storeId` no `where`** (`where: { id, storeId }`) — evita IDOR (trocar o ID na URL e ver o pedido de outra loja).
- `middleware.ts` só redireciona; a checagem real acontece no servidor (layout + action/handler), pois o middleware pode ser contornado.

**Dinheiro e pedidos**
- **Nunca confie em preço vindo do cliente.** O servidor recalcula itens, complementos, taxa de entrega e comissão a partir do banco em `POST /checkout/quote` e de novo em `POST /orders`.
- Pedido só vai para PLACED quando o **webhook** confirma o pagamento — nunca pelo retorno do navegador.
- Webhooks: verificar assinatura, idempotência via `WebhookEvent`, responder 200 rápido e processar na fila.
- `Idempotency-Key` em criação de pedido e pagamento (evita cobrança dupla em clique duplo / retry de rede).
- Dados de cartão nunca passam pelo seu servidor: use **Mercado Pago Bricks / Stripe Elements** (escopo PCI SAQ-A).
- Aceite de corrida atômico: `updateMany({ where: { id, status: 'WAITING_COURIER', courierId: null }, data: {...} })` e conferir `count === 1`.
- PIN de entrega com limite de tentativas.

**Entrada e saída**
- Validação com **zod** (`packages/validators`) em todo handler e Server Action; o mesmo schema valida o formulário no front.
- Rate limit (Upstash Ratelimit) por IP e por usuário: login, cadastro, checkout, PIN, localização.
- Upload: URL pré-assinada com tipo (`image/jpeg|png|webp`) e tamanho máximo; reprocessar/redimensionar a imagem.
- Headers: CSP, `X-Frame-Options`, `Referrer-Policy`, HSTS (via `next.config` ou middleware).
- Variáveis de ambiente validadas na inicialização (`lib/env.ts`); segredos nunca com prefixo `NEXT_PUBLIC_`.

**Privacidade (LGPD)**
- Entregador vê só o bairro do cliente antes de aceitar; endereço completo e telefone (de preferência mascarado/proxy) só após o aceite e até a entrega.
- Histórico de localização com retenção curta; posição ao vivo no Redis com TTL.
- Exclusão de conta = anonimização (pedidos são mantidos por obrigação fiscal).
- `AuditLog` para toda ação administrativa e financeira.

---

## 5. Performance

**Banco**
- Índices compostos alinhados às queries quentes (já no schema): `Order(storeId, status, createdAt)`, `Order(customerId, createdAt)`, `Delivery(status, createdAt)`, `Product(storeId, categoryId, position)`.
- **Paginação por cursor**, nunca `OFFSET` em listas grandes.
- `select` explícito (não carregar `rawResponse`, `payload` etc. sem necessidade) e `include` controlado para evitar N+1.
- **Connection pooling** obrigatório em serverless (PgBouncer, Neon/Supabase pooler ou Prisma Accelerate) — `DATABASE_URL` via pooler, `DIRECT_URL` para migrations.
- Transações curtas; nada de chamada externa (gateway, mapas) dentro de `$transaction`.

**Cache e renderização**
- Catálogo e cardápio com **React Server Components + cache do Next** usando tags (`store:{id}`, `menu:{id}`) e `revalidateTag` quando a loja edita o cardápio. Status "aberto/fechado" e disponibilidade calculados à parte (não cachear o que muda a cada minuto).
- Páginas de loja com ISR; checkout, rastreamento e painéis dinâmicos.
- `next/image` com CDN e tamanhos fixos; imagens redimensionadas no upload.
- Client Components só onde há interação (carrinho, mapa, painel); o mapa carregado com `dynamic(() => import(...), { ssr: false })`.

**Tempo real e geolocalização**
- Posição do entregador: envio a cada ~10 s (ou a cada 30 m de deslocamento) → Redis `GEOADD`; broadcast só para o canal do pedido ativo. **Não gravar cada ponto no Postgres.**
- Busca de corridas por região com `GEOSEARCH` no Redis ou PostGIS, e canais por geohash para não mandar todas as ofertas para todos.
- Rotas/ETA calculadas no servidor e cacheadas por par origem/destino.

**Trabalho assíncrono**
- Fila para: timeout de aceite da loja, despacho/re-oferta de corrida, expiração de Pix, e-mails, Web Push, recálculo de `ratingAvg`, relatórios.

**Front**
- Zustand só para estado de cliente (carrinho, endereço selecionado, corrida ativa); dados do servidor via RSC ou TanStack Query.
- UI otimista no painel do restaurante e no aceite de corrida.
- PWA do entregador com service worker (Serwist): app shell offline, Web Push e Wake Lock durante a corrida.

**Observabilidade**
- Sentry (erros front/back), logs estruturados com `orderId`/`storeId`, métricas de tempo de cada etapa do pedido (dá para extrair de `OrderStatusHistory`).

---

## 6. Próximos passos sugeridos

1. `pnpm dlx create-turbo` + `create-next-app` em `apps/web`; mover o schema para `packages/db`.
2. `docker compose up` (Postgres + Redis) → `prisma migrate dev` → `seed.ts` com 1 admin, 2 lojas, cardápio e 1 entregador.
3. Implementar `packages/core` (pricing + máquina de estados) com testes antes das telas.
4. Fluxo vertical mínimo: catálogo → carrinho → checkout (dinheiro) → painel do restaurante → entregador → entregue.
5. Integrar pagamento (Pix via Mercado Pago) e depois o tempo real.
