import { formatCents } from "@delivery/core";
import { CalendarClock, Clock, MapPin, Receipt, Star, type LucideIcon } from "lucide-react";
import { isStoreOpenNow } from "@/features/stores/queries";
import { getPublicMenu } from "@/lib/menu";
import { todayHours } from "@/lib/opening-hours";
import { getServedCities, joinCities } from "@/lib/service-area";
import { getStore } from "@/lib/store";
import { Logo } from "@/components/brand/logo";
import { CartBar } from "@/components/customer/cart-bar";
import { ProductCard } from "@/components/customer/product-card";
import { InstallBanner } from "@/components/pwa/install-banner";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";

export const dynamic = "force-dynamic";

function InfoItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-card p-3 sm:p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-primary sm:size-10">
        <Icon className="size-[1.125rem] sm:size-5" />
      </span>
      <div className="min-w-0">
        <dt className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
        <dd className="text-sm leading-tight font-semibold sm:text-base">{value}</dd>
      </div>
    </div>
  );
}

export default async function MenuPage() {
  const store = await getStore();
  const [menu, servedCities] = await Promise.all([getPublicMenu(store.id), getServedCities()]);
  const open = isStoreOpenNow(store.isOpen, store.openingHours, store.timezone);
  const categories = menu.filter((c) => c.products.length > 0);
  const area = servedCities.length > 0 ? `${joinCities(servedCities)} - ${store.state}` : `${store.city} - ${store.state}`;
  const today =
    store.openingHours.length > 0
      ? (todayHours(store.openingHours, store.timezone) ?? "Fechado")
      : store.isOpen
        ? "Aberto"
        : "Fechado";

  return (
    <div>
      <section className="bg-brand text-primary-foreground">
        <div className="mx-auto max-w-5xl px-4 pt-8 pb-20 sm:pt-12 sm:pb-24">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
            {/* Placa clara: o logo foi feito para fundo claro. */}
            <div className="shrink-0 rounded-3xl bg-[#FFFAE8] px-5 py-4 shadow-xl ring-1 ring-black/5">
              <Logo className="h-24 sm:h-32" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-cone uppercase sm:text-xs">Delivery em {area}</p>
              <h1 className="mt-1 text-3xl font-bold sm:text-5xl">{store.name}</h1>
              {store.description && <p className="mt-3 max-w-xl text-base text-primary-foreground/85 sm:text-lg">{store.description}</p>}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex h-9 items-center gap-2 rounded-full bg-primary-foreground/10 px-3.5 text-sm font-medium ring-1 ring-primary-foreground/25">
              <span className={open ? "size-2 rounded-full bg-[#4ADE80]" : "size-2 rounded-full bg-primary-foreground/50"} aria-hidden />
              {open ? "Aberto agora" : "Fechado no momento"}
            </span>
            {store.ratingCount > 0 && (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3.5 text-sm font-medium ring-1 ring-primary-foreground/25">
                <Star className="size-4 fill-current text-cone" />
                {store.ratingAvg.toFixed(1)}
                <span className="font-normal text-primary-foreground/70">({store.ratingCount})</span>
              </span>
            )}
            <WhatsAppButton phone={store.phone} message={`Olá! Vim pelo site da ${store.name}.`} className="rounded-full">
              Falar no WhatsApp
            </WhatsAppButton>
          </div>
        </div>
      </section>

      {/* Cartão de informações, metade em cima do bloco azul. */}
      <div className="mx-auto -mt-12 max-w-5xl px-4">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border shadow-md sm:grid-cols-4">
          <InfoItem icon={Clock} label="Entrega" value={`${store.prepTimeMinutes}–${store.prepTimeMinutes + 20} min`} />
          <InfoItem
            icon={MapPin}
            label="Área de entrega"
            value={servedCities.length > 0 ? joinCities(servedCities) : `Até ${store.deliveryRadiusKm} km`}
          />
          <InfoItem icon={Receipt} label="Pedido mínimo" value={store.minOrderCents > 0 ? formatCents(store.minOrderCents) : "Sem mínimo"} />
          <InfoItem icon={CalendarClock} label="Hoje" value={today} />
        </dl>
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <InstallBanner appName={store.name} />
      </div>

      {categories.length > 1 && (
        <nav className="sticky top-16 z-10 mt-6 border-y bg-background/95 backdrop-blur" aria-label="Categorias">
          <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none]">
            {categories.map((c) => (
              <a
                key={c.id}
                href={`#cat-${c.id}`}
                className="shrink-0 rounded-full border bg-card px-4 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                {c.name}
              </a>
            ))}
          </div>
        </nav>
      )}

      <div className="mx-auto max-w-5xl px-4">
        {categories.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">O cardápio ainda está sendo montado.</p>
        )}
        {categories.map((category) => (
          <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-32 pt-8">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xl font-semibold sm:text-2xl">{category.name}</h2>
              <span className="text-sm text-muted-foreground">
                {category.products.length} {category.products.length === 1 ? "item" : "itens"}
              </span>
              <span className="h-px flex-1 bg-border" aria-hidden />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
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
