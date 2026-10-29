// Testa a conexão do jeito que o app usa em produção (driver adapter pg).
// Uso: DATABASE_URL=... tsx prisma/check-connection.ts
import { createPrismaClient } from "../src";

const prisma = createPrismaClient({ maxUses: 1 });

const [stores, users] = await Promise.all([prisma.store.count(), prisma.user.count()]);
console.log(`conexão ok: ${stores} lojas, ${users} usuários`);
await prisma.$disconnect();
