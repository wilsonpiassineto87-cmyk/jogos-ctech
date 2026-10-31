import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";
import { Logo } from "@/components/brand/logo";
import { StoreTheme } from "@/components/brand/store-theme";
import { CartButton } from "@/components/customer/cart-button";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  return { title: { default: store.name, template: `%s · ${store.name}` }, description: store.description ?? undefined };
}

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  // Roles do banco (as do JWT são as do momento do login): os atalhos aparecem na hora.
  // Em paralelo com a loja, para não somar o tempo das duas consultas.
  const sessionWithRoles = auth().then(async (session) => ({
    session,
    roles: session?.user.id
      ? ((await prisma.user.findUnique({ where: { id: session.user.id }, select: { roles: true } }))?.roles ?? [])
      : [],
  }));
  const [{ session, roles }, store] = await Promise.all([sessionWithRoles, getStore()]);
  // No celular não cabem os três atalhos: mostra só o principal de quem trabalha na loja.
  const panel = roles.includes("MERCHANT")
    ? "/restaurant"
    : roles.includes("COURIER")
      ? "/courier"
      : roles.includes("ADMIN")
        ? "/admin"
        : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <StoreTheme />
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link href="/" className="mr-auto flex min-w-0 flex-1 text-foreground" aria-label={`${store.name}, página inicial`}>
            <Logo name={store.name} />
          </Link>
          {panel && (
            <Link href={panel} className="shrink-0 rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground sm:hidden">
              Painel
            </Link>
          )}
          {roles.includes("MERCHANT") && (
            <Link href="/restaurant" className="hidden text-sm hover:underline sm:inline">
              Painel da loja
            </Link>
          )}
          {roles.includes("COURIER") && (
            <Link href="/courier" className="hidden text-sm hover:underline sm:inline">
              Entregas
            </Link>
          )}
          {roles.includes("ADMIN") && (
            <Link href="/admin" className="hidden text-sm hover:underline sm:inline">
              Admin
            </Link>
          )}
          {session ? (
            <>
              <Link href="/orders" className="shrink-0 text-sm hover:underline">
                Pedidos
              </Link>
              <Link href="/account" className="shrink-0 text-sm hover:underline">
                Conta
              </Link>
            </>
          ) : (
            <Button asChild size="sm" variant="ghost">
              <Link href="/login">Entrar</Link>
            </Button>
          )}
          <CartButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
