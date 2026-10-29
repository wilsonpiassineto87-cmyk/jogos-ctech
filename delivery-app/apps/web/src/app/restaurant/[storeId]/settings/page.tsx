import { centsToInput } from "@delivery/core";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";
import { saveSettingsAction, toggleOpenAction } from "@/features/store/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Configurações" };

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const input =
  "h-10 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default async function StoreSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved } = await searchParams;
  const store = await getStore();
  const fee = await prisma.deliveryFeeRule.findFirst({ where: { isActive: true }, orderBy: { priority: "desc" } });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Configurações da loja</h1>
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {saved && <p className="rounded-md bg-accent p-3 text-sm">Configurações salvas.</p>}

      <section className="flex items-center justify-between gap-4 rounded-xl border p-4">
        <div>
          <p className="font-medium">{store.isOpen ? "Recebendo pedidos" : "Loja pausada"}</p>
          <p className="text-sm text-muted-foreground">Pause para parar de receber pedidos na hora.</p>
        </div>
        <form action={toggleOpenAction}>
          <Button variant={store.isOpen ? "outline" : "default"}>{store.isOpen ? "Pausar" : "Abrir"}</Button>
        </form>
      </section>

      <form action={saveSettingsAction} className="space-y-4 rounded-xl border p-4">
        <Field label="Nome da loja">
          <input name="name" required defaultValue={store.name} className={input} />
        </Field>
        <Field label="Descrição">
          <textarea name="description" rows={2} defaultValue={store.description ?? ""} className={`${input} h-auto py-2`} />
        </Field>
        <Field label="Telefone / WhatsApp">
          <input name="phone" defaultValue={store.phone ?? ""} placeholder="11999999999" className={input} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pedido mínimo (R$)">
            <input name="minOrder" inputMode="decimal" defaultValue={centsToInput(store.minOrderCents)} className={input} />
          </Field>
          <Field label="Tempo de preparo (min)">
            <input name="prepTimeMinutes" type="number" min={5} max={180} defaultValue={store.prepTimeMinutes} className={input} />
          </Field>
          <Field label="Raio de entrega (km)">
            <input name="deliveryRadiusKm" inputMode="decimal" defaultValue={String(store.deliveryRadiusKm).replace(".", ",")} className={input} />
          </Field>
          <Field label="Taxa de entrega (R$)">
            <input name="deliveryFee" inputMode="decimal" defaultValue={centsToInput(fee?.baseFeeCents ?? 0)} className={input} />
          </Field>
          <Field label="Adicional por km (R$)">
            <input name="deliveryFeePerKm" inputMode="decimal" defaultValue={centsToInput(fee?.feePerKmCents ?? 0)} className={input} />
          </Field>
        </div>
        <Button>Salvar configurações</Button>
      </form>

      <section className="rounded-xl border p-4 text-sm">
        <h2 className="font-semibold">Horário de funcionamento</h2>
        {store.openingHours.length === 0 ? (
          <p className="mt-2 text-muted-foreground">Sem horários cadastrados: a loja aceita pedidos sempre que não estiver pausada.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {store.openingHours.map((h, i) => (
              <li key={i} className="flex justify-between">
                <span>{WEEKDAYS[h.dayOfWeek]}</span>
                <span className="tabular-nums">
                  {h.opensAt} – {h.closesAt}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-muted-foreground">
          Endereço da loja: {store.street}, {store.number} · {store.neighborhood}, {store.city}/{store.state}
        </p>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label>;
}
