import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

// Roda no edge: só lê o JWT e aplica as regras de `authorized` em auth.config.ts.
export const { auth: middleware } = NextAuth(authConfig);

// Só nas áreas que exigem login (as mesmas de PROTECTED em auth.config.ts). Páginas
// públicas, como o cardápio e o login, nem passam por aqui: menos processamento por visita.
export const config = {
  matcher: [
    "/admin/:path*",
    "/restaurant/:path*",
    "/courier/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/account/:path*",
  ],
};
