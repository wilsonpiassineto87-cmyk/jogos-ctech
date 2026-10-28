import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { env } from "@/lib/env";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Entrar" };

// Só aceita destinos no próprio site: evita open redirect via ?callbackUrl=https://site-malicioso
function safePath(url?: string): string {
  if (!url) return "/";
  try {
    const base = new URL(env.AUTH_URL ?? "http://localhost:3000");
    const target = new URL(url, base);
    return target.origin === base.origin ? target.pathname + target.search : "/";
  } catch {
    return "/";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const redirectTo = safePath(callbackUrl);

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo,
      });
    } catch (e) {
      if (e instanceof AuthError) redirect(`/login?error=1&callbackUrl=${encodeURIComponent(redirectTo)}`);
      throw e; // o redirect de sucesso também chega aqui como exceção
    }
  }

  return (
    <form action={login} className="grid gap-4">
      <h1 className="text-xl font-semibold">Entrar</h1>
      {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">E-mail ou senha inválidos.</p>}
      <FormField label="E-mail" name="email" type="email" autoComplete="email" required />
      <FormField label="Senha" name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" size="lg">
        Entrar
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
