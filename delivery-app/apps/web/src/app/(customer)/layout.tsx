import Link from "next/link";
import { auth } from "@/lib/auth";
import { CartButton } from "@/components/customer/cart-button";
import { Button } from "@/components/ui/button";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const roles = session?.user.roles ?? [];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="mr-auto font-bold text-primary">
            [Nome do Seu App]
          </Link>
          {roles.includes("MERCHANT") && (
            <Link href="/restaurant" className="hidden text-sm hover:underline sm:inline">
              Minha loja
            </Link>
          )}
          {roles.includes("ADMIN") && (
            <Link href="/admin" className="hidden text-sm hover:underline sm:inline">
              Admin
            </Link>
          )}
          {session ? (
            <Link href="/orders" className="text-sm hover:underline">
              Pedidos
            </Link>
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
