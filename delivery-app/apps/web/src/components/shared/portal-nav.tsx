"use client";

import { usePathname } from "next/navigation";
import Link from "@/components/shared/link";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/shared/portal-shell";

/**
 * Menu dos portais com a página atual em destaque. Vale o endereço mais específico:
 * em "Pedidos > Histórico" só "Histórico" fica marcado, não "Pedidos" junto.
 */
export function PortalNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const active = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="order-last -mx-3 flex w-full flex-wrap gap-1 text-sm sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:flex-nowrap sm:overflow-x-auto">
      {items.map((item) => {
        const current = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 transition-colors",
              current ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
