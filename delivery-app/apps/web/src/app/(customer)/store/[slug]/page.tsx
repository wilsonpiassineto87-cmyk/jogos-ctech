import { formatCents } from "@delivery/core";
import { notFound } from "next/navigation";
import { getStoreMenu } from "@/features/stores/queries";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreMenu(slug);
  if (!store) notFound();

  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">{store.name}</h1>
      {store.description && <p className="mt-1 text-muted-foreground">{store.description}</p>}
      <p className="mt-2 text-sm text-muted-foreground">
        {store.prepTimeMinutes}–{store.prepTimeMinutes + 20} min
        {store.minOrderCents > 0 && ` · Pedido mínimo ${formatCents(store.minOrderCents)}`}
      </p>

      {/* TODO: modal do produto (complementos + observação) que chama useCart().add */}
      {store.productCategories.map((category) => (
        <div key={category.id} className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">{category.name}</h2>
          <ul className="divide-y rounded-xl border">
            {category.products.map((product) => (
              <li key={product.id} className="flex items-start justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{product.name}</p>
                  {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}
                  {product.optionGroups.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.optionGroups.map((g) => g.name).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {product.isAvailable ? (
                    <span className="font-medium">{formatCents(product.priceCents)}</span>
                  ) : (
                    <Badge variant="secondary">Esgotado</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
