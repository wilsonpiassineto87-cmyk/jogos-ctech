import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

// Roda no edge: só lê o JWT e aplica as regras de `authorized` em auth.config.ts.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|sounds|icons).*)"],
};
