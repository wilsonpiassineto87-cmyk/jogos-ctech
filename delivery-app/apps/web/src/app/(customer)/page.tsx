import { formatCents } from "@delivery/core";
import { Star } from "lucide-react";
import Link from "next/link";
import { listStores } from "@/features/stores/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

// TODO: usar o endereço selecionado pelo cliente (ou geolocalização) em vez do ponto fixo.
const DEFAULT_LOCATION = { latitude: -23.5614, longitude: -46.6559 }; // Av. Paulista, SP

export default async function HomePage() {
  const stores = await listStores({ ...DEFAULT_LOCATION, limit: 30 });

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Lojas perto de você</h1>
      <p className="mt-1 text-muted-foreground">Entregando em Av. Paulista, São Paulo</p>

      {stores.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Nenhuma loja entrega neste endereço ainda.</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <li key={store.id}>
              <Link href={`/store/${store.slug}`} className="block h-full">
                <Card className={store.isOpenNow ? "h-full hover:shadow-md" : "h-full opacity-60"}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>{store.name}</CardTitle>
                      {!store.isOpenNow && <Badge variant="secondary">Fechada</Badge>}
                    </div>
                    <CardDescription>{store.categories.map((c) => c.name).join(" · ")}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5 fill-current text-amber-500" />
                      {store.ratingCount > 0 ? store.ratingAvg.toFixed(1) : "Novo"}
                    </span>
                    <span>{store.distanceKm.toFixed(1)} km</span>
                    <span>{store.prepTimeMinutes}–{store.prepTimeMinutes + 20} min</span>
                    {store.minOrderCents > 0 && <span>Mín. {formatCents(store.minOrderCents)}</span>}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
