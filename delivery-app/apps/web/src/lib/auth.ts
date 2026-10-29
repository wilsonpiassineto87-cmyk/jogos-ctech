import { PrismaAdapter } from "@auth/prisma-adapter";
import { verifyPassword } from "@delivery/core";
import { loginSchema } from "@delivery/validators";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { prisma } from "./db";
import { env } from "./env";

const providers: Provider[] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (!user?.passwordHash || user.status !== "ACTIVE" || user.deletedAt) return null;
      if (!(await verifyPassword(user.passwordHash, parsed.data.password))) return null;

      return { id: user.id, name: user.name, email: user.email, image: user.image, roles: user.roles };
    },
  }),
];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) providers.push(Google);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // O client é gerado em packages/db/generated (mesma API do @prisma/client padrão,
  // que é o tipo esperado pelo adapter).
  adapter: PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]),
  providers,
});
