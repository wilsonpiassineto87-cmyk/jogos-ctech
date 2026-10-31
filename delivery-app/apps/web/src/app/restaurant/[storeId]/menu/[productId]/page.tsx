import { centsToInput, formatCents } from "@delivery/core";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";
import {
  createOptionAction,
  createOptionGroupAction,
  deleteOptionAction,
  deleteOptionGroupAction,
  toggleOptionAction,
  updateOptionAction,
  updateOptionGroupAction,
} from "@/features/store/option-actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Complementos" };

const input =
  "h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default async function ProductOptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ productId }, { error }] = await Promise.all([params, searchParams]);
  const store = await getStore();
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      priceCents: true,
      optionGroups: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          minSelect: true,
          maxSelect: true,
          options: { orderBy: { position: "asc" }, select: { id: true, name: true, priceCents: true, isAvailable: true } },
        },
      },
    },
  });
  if (!product) notFound();
  const base = `/restaurant/${store.id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div>
        <Link href={`${base}/menu`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Cardápio
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Complementos · {product.name}</h1>
        <p className="text-sm text-muted-foreground">
          Preço base {formatCents(product.priceCents)}. Cada opção pode somar um valor ao preço.
        </p>
      </div>
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {product.optionGroups.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Este produto ainda não tem complementos. Crie um grupo abaixo, como "Tamanho" ou "Sabores".
        </p>
      )}

      {product.optionGroups.map((group) => {
        const available = group.options.filter((o) => o.isAvailable).length;
        return (
          <section key={group.id} className="space-y-3 rounded-2xl border bg-card p-4">
            <form action={updateOptionGroupAction.bind(null, product.id, group.id)} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
              <label className="grid gap-1 text-xs font-medium">
                Nome do grupo
                <input name="name" required defaultValue={group.name} className={input} />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Mínimo
                <input name="minSelect" type="number" min={0} max={20} defaultValue={group.minSelect} className={`${input} w-20`} />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Máximo
                <input name="maxSelect" type="number" min={1} max={20} defaultValue={group.maxSelect} className={`${input} w-20`} />
              </label>
              <SubmitButton size="sm" variant="outline">
                Salvar grupo
              </SubmitButton>
            </form>
            <p className="text-xs text-muted-foreground">
              {group.minSelect > 0 ? `Obrigatório: o cliente escolhe de ${group.minSelect}` : "Opcional: o cliente escolhe de 0"} a{" "}
              {group.maxSelect}.
              {available < group.minSelect && (
                <span className="font-medium text-destructive">
                  {" "}
                  Atenção: só {available} opção(ões) disponível(is) — o produto não pode ser pedido assim.
                </span>
              )}
            </p>

            <ul className="divide-y rounded-xl border">
              {group.options.map((option) => (
                <li key={option.id} className="flex flex-wrap items-center gap-2 p-2">
                  <form action={updateOptionAction.bind(null, product.id, option.id)} className="flex flex-1 flex-wrap items-center gap-2">
                    <input name="name" required defaultValue={option.name} className={`${input} min-w-36 flex-1`} aria-label="Nome da opção" />
                    <span className="text-xs text-muted-foreground">+ R$</span>
                    <input
                      name="price"
                      inputMode="decimal"
                      defaultValue={centsToInput(option.priceCents)}
                      className={`${input} w-20`}
                      aria-label="Preço adicional"
                    />
                    <SubmitButton size="sm" variant="ghost">
                      Salvar
                    </SubmitButton>
                  </form>
                  {!option.isAvailable && <Badge variant="secondary">Esgotado</Badge>}
                  <form action={toggleOptionAction.bind(null, product.id, option.id)}>
                    <SubmitButton size="sm" variant="outline">
                      {option.isAvailable ? "Esgotar" : "Voltar"}
                    </SubmitButton>
                  </form>
                  <form action={deleteOptionAction.bind(null, product.id, option.id)}>
                    <SubmitButton size="sm" variant="ghost" className="text-destructive">
                      Excluir
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>

            <form action={createOptionAction.bind(null, product.id, group.id)} className="flex flex-wrap items-center gap-2">
              <input name="name" required placeholder="Nova opção (ex.: Pistache)" className={`${input} min-w-40 flex-1`} />
              <span className="text-xs text-muted-foreground">+ R$</span>
              <input name="price" inputMode="decimal" placeholder="0,00" className={`${input} w-20`} aria-label="Preço adicional" />
              <SubmitButton size="sm">Adicionar opção</SubmitButton>
            </form>

            <form action={deleteOptionGroupAction.bind(null, product.id, group.id)} className="text-right">
              <SubmitButton size="sm" variant="ghost" className="text-destructive" pendingText="Excluindo...">
                Excluir grupo "{group.name}"
              </SubmitButton>
            </form>
          </section>
        );
      })}

      <form action={createOptionGroupAction.bind(null, product.id)} className="space-y-3 rounded-2xl border border-dashed p-4">
        <h2 className="font-semibold">Novo grupo de complementos</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="grid gap-1 text-xs font-medium">
            Nome
            <input name="name" required placeholder='Ex.: "Coberturas"' className={input} />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Mínimo
            <input name="minSelect" type="number" min={0} max={20} defaultValue={0} className={`${input} w-20`} />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Máximo
            <input name="maxSelect" type="number" min={1} max={20} defaultValue={1} className={`${input} w-20`} />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Mínimo 0 = opcional. Mínimo 1 e máximo 1 = escolha obrigatória de uma opção.</p>
        <SubmitButton>Criar grupo</SubmitButton>
      </form>
    </div>
  );
}
