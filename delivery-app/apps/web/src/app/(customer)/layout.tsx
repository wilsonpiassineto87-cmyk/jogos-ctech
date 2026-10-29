import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { CartButton } from "@/components/customer/cart-button";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  return { title: { default: store.name, template: `%s · ${store.name}` }, description: store.description ?? undefined };
}

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [session, store] = await Promise.all([auth(), getStore()]);
  const roles = session?.user.roles ?? [];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/" className="mr-auto truncate font-bold text-primary">
            {store.name}
          </Link>
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
              <Link href="/orders" className="text-sm hover:underline">
                Pedidos
              </Link>
              <Link href="/account" className="text-sm hover:underline">
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
