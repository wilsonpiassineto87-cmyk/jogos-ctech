import Link from "next/link";
import { signOut } from "@/lib/auth";
import { LogoMark } from "@/components/brand/logo";
import { StoreTheme } from "@/components/brand/store-theme";
import { Button } from "@/components/ui/button";

export type NavItem = { href: string; label: string };

/** Layout comum dos portais internos (restaurante, entregador, admin). */
export function PortalShell({
  title,
  userName,
  nav,
  children,
}: {
  title: string;
  userName: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <StoreTheme />
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        {/* No celular o menu desce para uma segunda linha e quebra, para nenhum item ficar escondido. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:h-14 sm:flex-nowrap sm:py-0">
          <Link href="/" className="mr-auto flex min-w-0 items-center gap-2 sm:mr-0 sm:shrink-0" aria-label="Página inicial">
            <LogoMark className="size-8 shrink-0" />
            <span className="truncate font-display text-lg font-semibold">{title}</span>
          </Link>
          <nav className="order-last -mx-3 flex w-full flex-wrap gap-1 text-sm sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:flex-nowrap sm:overflow-x-auto">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-md px-3 py-1.5 hover:bg-accent">
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
