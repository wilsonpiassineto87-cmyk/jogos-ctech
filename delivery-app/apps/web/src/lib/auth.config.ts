// Configuração "edge-safe" do Auth.js: usada pelo middleware, sem Prisma nem argon2.
// A configuração completa (adapter + providers) fica em ./auth.ts.
import type { UserRole } from "@delivery/db";
import type { NextAuthConfig } from "next-auth";

// Prefixo de rota -> role exigida. A checagem definitiva acontece no servidor
// (layouts e handlers via lib/authz.ts); o middleware só evita navegação inútil.
const PROTECTED: { prefix: string; role?: UserRole }[] = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/restaurant", role: "MERCHANT" },
  { prefix: "/courier", role: "COURIER" },
  { prefix: "/checkout" },
  { prefix: "/orders" },
  { prefix: "/account" },
];

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const rule = PROTECTED.find((r) => nextUrl.pathname.startsWith(r.prefix));
      if (!rule) return true;
      if (!auth?.user) return false; // redireciona para /login?callbackUrl=...
      if (rule.role && !auth.user.roles?.includes(rule.role)) {
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
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
