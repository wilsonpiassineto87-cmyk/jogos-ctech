// Configuração "edge-safe" do Auth.js: usada pelo middleware, sem Prisma nem argon2.
// A configuração completa (adapter + providers) fica em ./auth.ts.
import type { UserRole } from "@delivery/db";
import type { NextAuthConfig } from "next-auth";

// Áreas que exigem login. O middleware NÃO confere roles: as do JWT são as do momento
// do login e ficariam desatualizadas (ex.: acesso à loja dado pelo admin só valeria
// após sair e entrar). Quem pode o quê é checado no servidor, no banco (lib/authz.ts).
const PROTECTED = ["/admin", "/restaurant", "/courier", "/checkout", "/orders", "/account"];

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      if (!PROTECTED.some((prefix) => nextUrl.pathname.startsWith(prefix))) return true;
      return Boolean(auth?.user); // sem login: redireciona para /login?callbackUrl=...
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles ?? ["CUSTOMER"];
      }
      return token;
    },
    session({ session, token }) {
      // O JWT do next-auth/jwt é reexportado de @auth/core e não aceita augmentation via pnpm; por isso o cast.
      if (typeof token.id === "string") session.user.id = token.id;
      session.user.roles = (token.roles as UserRole[] | undefined) ?? [];
      return session;
    },
  },
} satisfies NextAuthConfig;
