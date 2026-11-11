import { formatPhone } from "@delivery/core";
import { Clock, MapPin, Phone } from "lucide-react";
import Link from "@/components/shared/link";
import { weekHours } from "@/lib/opening-hours";
import type { Store } from "@/lib/store";
import { Logo } from "@/components/brand/logo";

/** Rodapé da área do cliente: quem é a loja, onde fica, como falar e quando abre. */
export function SiteFooter({ store }: { store: Store }) {
  const street = [store.street, store.number].filter(Boolean).join(", ");
  const city = [store.neighborhood, [store.city, store.state].filter(Boolean).join(" - ")].filter(Boolean).join(" · ");
  const week = store.openingHours.length > 0 ? weekHours(store.openingHours) : [];

  return (
    <footer className="mt-12 border-t bg-card text-sm">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo name={store.name} className="h-16" />
          {store.description && <p className="mt-3 max-w-xs text-muted-foreground">{store.description}</p>}
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-medium text-primary">
            <Link href="/orders" className="hover:underline">
              Meus pedidos
            </Link>
            <Link href="/instalar" className="hover:underline">
              Instalar o app
            </Link>
          </p>
        </div>

        <div>
          <h3 className="font-display font-semibold">Onde estamos</h3>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            {(street || city) && (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  {street}
                  {street && city && <br />}
                  {city}
                </span>
              </li>
            )}
            {store.phone && (
              <li className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{formatPhone(store.phone)}</span>
              </li>
            )}
          </ul>
        </div>

        {week.length > 0 && (
          <div>
            <h3 className="font-display font-semibold">Horário de funcionamento</h3>
            <ul className="mt-3 space-y-1.5 text-muted-foreground">
              {week.map((row, i) => (
                <li key={row.days} className="flex gap-2">
                  <Clock className={i === 0 ? "mt-0.5 size-4 shrink-0 text-primary" : "invisible size-4 shrink-0"} />
                  <span className="w-20 shrink-0 font-medium text-foreground">{row.days}</span>
                  <span className="tabular-nums">{row.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* O respiro de baixo deixa o texto acima da barra do carrinho, que fica fixa no rodapé. */}
      <div className="border-t">
        <p className="mx-auto max-w-5xl px-4 pt-4 pb-20 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {store.name}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
