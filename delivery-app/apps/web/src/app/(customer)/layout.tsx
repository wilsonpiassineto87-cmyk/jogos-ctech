import type { Metadata } from "next";
import { CircleUserRound, ReceiptText } from "lucide-react";
import Link from "@/components/shared/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";
import { Logo } from "@/components/brand/logo";
import { StoreTheme } from "@/components/brand/store-theme";
import { CartButton } from "@/components/customer/cart-button";
import { SiteFooter } from "@/components/customer/site-footer";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  return { title: { default: store.name, template: `%s · ${store.name}` }, description: store.description ?? undefined };
}

const NAV_LINK =
  "grid size-9 shrink-0 place-items-center rounded-lg text-sm font-medium text-foreground/75 transition-colors hover:bg-accent hover:text-primary sm:size-auto sm:px-1 sm:py-1.5 sm:hover:bg-transparent";

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
      <header className="sticky top-0 z-20 border-b bg-card/95 shadow-xs backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4 sm:gap-5">
          <Link href="/" className="mr-auto flex min-w-0 flex-1" aria-label={`${store.name}, página inicial`}>
            <Logo name={store.name} className="h-12" />
          </Link>
          {panel && (
            <Link href={panel} className="shrink-0 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground sm:hidden">
              Painel
            </Link>
          )}
          {roles.includes("MERCHANT") && (
            <Link href="/restaurant" className="hidden text-sm font-medium text-foreground/75 transition-colors hover:text-primary sm:inline">
              Painel da loja
            </Link>
          )}
          {roles.includes("COURIER") && (
            <Link href="/courier" className="hidden text-sm font-medium text-foreground/75 transition-colors hover:text-primary sm:inline">
              Entregas
            </Link>
          )}
          {roles.includes("ADMIN") && (
            <Link href="/admin" className="hidden text-sm font-medium text-foreground/75 transition-colors hover:text-primary sm:inline">
              Admin
            </Link>
          )}
          {session ? (
            <>
              {/* No celular viram ícones, para o topo não ficar apertado. */}
              <Link href="/orders" aria-label="Meus pedidos" title="Meus pedidos" className={NAV_LINK}>
                <ReceiptText className="size-5 sm:hidden" />
                <span className="hidden sm:inline">Pedidos</span>
              </Link>
              <Link href="/account" aria-label="Minha conta" title="Minha conta" className={NAV_LINK}>
                <CircleUserRound className="size-5 sm:hidden" />
                <span className="hidden sm:inline">Conta</span>
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
      <SiteFooter store={store} />
    </div>
  );
}
