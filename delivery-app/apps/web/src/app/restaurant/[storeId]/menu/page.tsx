import { centsToInput, formatCents } from "@delivery/core";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";
import {
  createCategoryAction,
  createProductAction,
  deleteCategoryAction,
  deleteProductAction,
  toggleProductAction,
  updateProductAction,
} from "@/features/store/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Cardápio" };

const input =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  categoryId: string | null;
};

export default async function StoreMenuPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const store = await getStore();
  const [categories, products] = await Promise.all([
    prisma.productCategory.findMany({ where: { storeId: store.id }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({
      where: { storeId: store.id, deletedAt: null },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        priceCents: true,
        isAvailable: true,
        categoryId: true,
        _count: { select: { optionGroups: true } },
      },
    }),
  ]);
  const groups = [
    ...categories.map((c) => ({ ...c, products: products.filter((p) => p.categoryId === c.id) })),
    { id: "", name: "Sem categoria", products: products.filter((p) => !p.categoryId) },
  ].filter((g) => g.id || g.products.length > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Cardápio</h1>
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2">
        <form action={createProductAction} className="space-y-3 rounded-xl border p-4">
          <h2 className="font-semibold">Novo produto</h2>
          <ProductFields categories={categories} />
          <Button>Adicionar produto</Button>
        </form>
        <form action={createCategoryAction} className="space-y-3 self-start rounded-xl border p-4">
          <h2 className="font-semibold">Nova categoria</h2>
          <input name="name" required placeholder="Ex.: Bebidas" className={input} />
          <Button variant="outline">Adicionar categoria</Button>
        </form>
      </section>

      {groups.map((group) => (
        <section key={group.id || "none"}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{group.name}</h2>
            {group.id && group.products.length === 0 && (
              <form action={deleteCategoryAction.bind(null, group.id)}>
                <Button variant="ghost" size="sm">
                  Excluir categoria
                </Button>
              </form>
            )}
          </div>
          {group.products.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Nenhum produto nesta categoria.</p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {group.products.map((product) => (
                <li key={product.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="mr-auto min-w-0">
                      <p className="font-medium">
                        {product.name}{" "}
                        {product._count.optionGroups > 0 && (
                          <span className="text-xs text-muted-foreground">· {product._count.optionGroups} grupo(s) de complementos</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{formatCents(product.priceCents)}</p>
                    </div>
                    {!product.isAvailable && <Badge variant="secondary">Esgotado</Badge>}
                    <form action={toggleProductAction.bind(null, product.id)}>
                      <Button variant="outline" size="sm">
                        {product.isAvailable ? "Marcar esgotado" : "Voltar a vender"}
                      </Button>
                    </form>
                  </div>
                  <Link href={`/restaurant/${store.id}/menu/${product.id}`} className="mt-2 mr-4 inline-block text-sm text-primary hover:underline">
                    {product._count.optionGroups > 0 ? "Editar complementos" : "Adicionar complementos"}
                  </Link>
                  <details className="mt-2 inline-block w-full">
                    <summary className="cursor-pointer text-sm text-primary">Editar produto</summary>
                    <form action={updateProductAction.bind(null, product.id)} className="mt-3 space-y-3">
                      <ProductFields categories={categories} product={product} />
                      <div className="flex gap-2">
                        <Button size="sm">Salvar</Button>
                        <Button size="sm" variant="ghost" formAction={deleteProductAction.bind(null, product.id)}>
                          Excluir produto
                        </Button>
                      </div>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <p className="text-sm text-muted-foreground">
        Complementos são as escolhas do cliente em cada produto (tamanho, sabores, coberturas). Use “Editar complementos”.
      </p>
    </div>
  );
}

function ProductFields({ categories, product }: { categories: Category[]; product?: Product }) {
  return (
    <>
      <input name="name" required defaultValue={product?.name} placeholder="Nome" className={input} />
      <textarea
        name="description"
        defaultValue={product?.description ?? ""}
        placeholder="Descrição (opcional)"
        rows={2}
        className={`${input} h-auto py-2`}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="price"
          required
          inputMode="decimal"
          defaultValue={product ? centsToInput(product.priceCents) : ""}
          placeholder="Preço (ex.: 29,90)"
          className={input}
        />
        <select name="categoryId" defaultValue={product?.categoryId ?? ""} className={input}>
          <option value="">Sem categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <input name="imageUrl" type="url" defaultValue={product?.imageUrl ?? ""} placeholder="URL da foto (opcional)" className={input} />
    </>
  );
}
