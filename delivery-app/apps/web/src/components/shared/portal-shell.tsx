import Link from "next/link";
import { signOut } from "@/lib/auth";
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
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <span className="font-semibold">{title}</span>
          <nav className="flex flex-1 gap-1 overflow-x-auto text-sm">
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
