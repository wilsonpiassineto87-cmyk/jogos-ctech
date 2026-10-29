import { formatCents } from "@delivery/core";
import { Clock, MapPin, Star } from "lucide-react";
import { getMenu, isStoreOpenNow } from "@/features/stores/queries";
import { getStore } from "@/lib/store";
import { CartBar } from "@/components/customer/cart-bar";
import { ProductCard } from "@/components/customer/product-card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function MenuPage() {
  const store = await getStore();
  const menu = await getMenu(store.id);
  const open = isStoreOpenNow(store.isOpen, store.openingHours, store.timezone);
  const categories = menu.filter((c) => c.products.length > 0);

  return (
    <div className="pb-28">
      <section className="border-b bg-accent/40">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{store.name}</h1>
            <Badge variant={open ? "default" : "secondary"}>{open ? "Aberto agora" : "Fechado"}</Badge>
          </div>
          {store.description && <p className="mt-2 text-muted-foreground">{store.description}</p>}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" />
              {store.prepTimeMinutes}–{store.prepTimeMinutes + 20} min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" />
              {store.neighborhood}, {store.city} · entrega até {store.deliveryRadiusKm} km
            </span>
            {store.ratingCount > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-4 fill-current text-amber-500" />
                {store.ratingAvg.toFixed(1)} ({store.ratingCount})
              </span>
            )}
            {store.minOrderCents > 0 && <span>Pedido mínimo {formatCents(store.minOrderCents)}</span>}
          </div>
          {!open && store.openingHours.length > 0 && (
            <p className="mt-4 text-sm">
              <span className="font-medium">Horários: </span>
              {store.openingHours.map((h) => `${WEEKDAYS[h.dayOfWeek]} ${h.opensAt}–${h.closesAt}`).join(" · ")}
            </p>
          )}
        </div>
      </section>

      {categories.length > 1 && (
        <nav className="sticky top-14 z-10 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3">
            {categories.map((c) => (
              <a key={c.id} href={`#cat-${c.id}`} className="shrink-0 rounded-full border px-4 py-1.5 text-sm hover:bg-accent">
                {c.name}
              </a>
            ))}
          </div>
        </nav>
      )}

      <div className="mx-auto max-w-3xl px-4">
        {categories.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">O cardápio ainda está sendo montado.</p>
        )}
        {categories.map((category) => (
          <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-32 pt-8">
            <h2 className="mb-3 text-lg font-semibold">{category.name}</h2>
            <div className="divide-y overflow-hidden rounded-xl border">
              {category.products.map((product) => (
                <ProductCard key={product.id} product={product} store={{ id: store.id, name: store.name }} storeOpen={open} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <CartBar />
    </div>
  );
}
