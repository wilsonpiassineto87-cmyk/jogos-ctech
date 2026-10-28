import { registerSchema } from "@delivery/validators";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HttpError } from "@/lib/api";
import { signIn } from "@/lib/auth";
import { registerCustomer } from "@/features/auth/register";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Criar conta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  async function register(formData: FormData) {
    "use server";
    const parsed = registerSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      redirect(`/register?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Dados inválidos")}`);
    }
    try {
      await registerCustomer(parsed.data);
    } catch (e) {
      if (e instanceof HttpError) redirect(`/register?error=${encodeURIComponent(e.message)}`);
      throw e;
    }
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: "/" });
  }

  return (
    <form action={register} className="grid gap-4">
      <h1 className="text-xl font-semibold">Criar conta</h1>
      {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
      <FormField label="Nome" name="name" autoComplete="name" required />
      <FormField label="E-mail" name="email" type="email" autoComplete="email" required />
      <FormField label="Senha" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <Button type="submit" size="lg">
        Criar conta
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
