import { centsToInput, formatPhone } from "@delivery/core";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";
import { DEFAULT_THEME, THEME_PRESETS, parseTheme } from "@/lib/theme";
import { saveSettingsAction, saveStoreAddressAction, toggleOpenAction } from "@/features/store/actions";
import { getServedCities } from "@/lib/service-area";
import {
  applyThemePresetAction,
  resetThemeAction,
  saveOpeningHoursAction,
  saveThemeAction,
} from "@/features/store/customize-actions";
import { getPrintPreferences } from "@/lib/receipt";
import { PrintSettings } from "@/components/receipt/print-settings";
import { SubmitButton } from "@/components/shared/submit-button";

export const metadata = { title: "Configurações" };

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const input =
  "h-10 w-full rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default async function StoreSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved } = await searchParams;
  const store = await getStore();
  const fee = await prisma.deliveryFeeRule.findFirst({ where: { isActive: true }, orderBy: { priority: "desc" } });
  const theme = parseTheme(store.theme) ?? DEFAULT_THEME;
  const hasSchedule = store.openingHours.length > 0;
  const hoursByDay = new Map(store.openingHours.map((h) => [h.dayOfWeek, h]));
  const [printPrefs, sampleOrder, servedCities] = await Promise.all([
    getPrintPreferences(),
    prisma.order.findFirst({ where: { storeId: store.id, status: { not: "PENDING_PAYMENT" } }, orderBy: { createdAt: "desc" }, select: { id: true } }),
    getServedCities(),
  ]);
  const citiesValue = servedCities.join(", ");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Configurações da loja</h1>
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {saved === "1" && <p className="rounded-md bg-accent p-3 text-sm">Configurações salvas.</p>}

      <section className="flex items-center justify-between gap-4 rounded-xl border p-4">
        <div>
          <p className="font-medium">{store.isOpen ? "Recebendo pedidos" : "Loja pausada"}</p>
          <p className="text-sm text-muted-foreground">Pause para parar de receber pedidos na hora.</p>
        </div>
        <form action={toggleOpenAction.bind(null, "settings")}>
          <SubmitButton variant={store.isOpen ? "outline" : "default"}>{store.isOpen ? "Pausar" : "Abrir"}</SubmitButton>
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
          <input name="phone" inputMode="tel" defaultValue={store.phone ? formatPhone(store.phone) : ""} placeholder="(11) 99999-0000" className={input} />
          <span className="text-xs font-normal text-muted-foreground">Com DDD. Vira o botão "Falar no WhatsApp" do site.</span>
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
        <Field label="Cidades onde entrega">
          <input name="cities" required defaultValue={citiesValue} placeholder="Jaborandi, Colina" className={input} />
          <span className="text-xs font-normal text-muted-foreground">
            Separe por vírgula. Qualquer endereço nessas cidades pode pedir (o raio só limita o adicional por km); de outra
            cidade, não.
          </span>
        </Field>
        <SubmitButton pendingText="Salvando...">Salvar configurações</SubmitButton>
      </form>

      <form id="endereco" action={saveStoreAddressAction} className="scroll-mt-20 space-y-4 rounded-xl border p-4 text-sm">
        <div>
          <h2 className="text-lg font-semibold">Endereço da loja</h2>
          <p className="text-muted-foreground">
            O raio de entrega ({String(store.deliveryRadiusKm).replace(".", ",")} km) é contado a partir daqui. Também sai no
            comprovante.
          </p>
        </div>
        {saved === "endereco" && <p className="rounded-md bg-accent p-3">Endereço salvo e localizado no mapa.</p>}
        {saved === "endereco-sem-mapa" && (
          <p className="rounded-md bg-accent p-3">
            Endereço salvo. O mapa não respondeu agora, mas a entrega vale pela cidade: pode seguir normalmente.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr_6rem]">
          <Field label="CEP">
            <input name="zipCode" required inputMode="numeric" defaultValue={store.zipCode} placeholder="14775-000" className={input} />
          </Field>
          <Field label="Rua">
            <input name="street" required defaultValue={store.street} className={input} />
          </Field>
          <Field label="Número">
            <input name="number" required defaultValue={store.number} className={input} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_5rem]">
          <Field label="Bairro">
            <input name="neighborhood" required defaultValue={store.neighborhood} className={input} />
          </Field>
          <Field label="Cidade">
            <input name="city" required defaultValue={store.city} className={input} />
          </Field>
          <Field label="UF">
            <input name="state" required maxLength={2} defaultValue={store.state} className={`${input} uppercase`} />
          </Field>
        </div>
        <SubmitButton pendingText="Localizando no mapa...">Salvar endereço</SubmitButton>
      </form>

      <form id="horarios" action={saveOpeningHoursAction} className="scroll-mt-20 space-y-4 rounded-xl border p-4 text-sm">
        <div>
          <h2 className="text-lg font-semibold">Horário de funcionamento</h2>
          <p className="text-muted-foreground">Fora do horário o cardápio aparece, mas não aceita pedidos.</p>
        </div>
        {saved === "horarios" && <p className="rounded-md bg-accent p-3">Horários salvos.</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border p-3 has-[:checked]:border-primary">
            <input type="radio" name="mode" value="always" defaultChecked={!hasSchedule} className="accent-[var(--primary)]" />
            Sempre aberta (só pela pausa)
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border p-3 has-[:checked]:border-primary">
            <input type="radio" name="mode" value="schedule" defaultChecked={hasSchedule} className="accent-[var(--primary)]" />
            Seguir os horários abaixo
          </label>
        </div>
        <ul className="divide-y rounded-xl border">
          {WEEKDAYS.map((day, i) => {
            const h = hoursByDay.get(i);
            return (
              <li key={day} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <label className="flex w-28 items-center gap-2 font-medium">
                  <input type="checkbox" name={`open-${i}`} defaultChecked={!hasSchedule || !!h} className="size-4 accent-[var(--primary)]" />
                  {day}
                </label>
                <input type="time" name={`opensAt-${i}`} defaultValue={h?.opensAt ?? "12:00"} className={`${input} w-28`} aria-label={`${day}: abre`} />
                <span className="text-muted-foreground">até</span>
                <input type="time" name={`closesAt-${i}`} defaultValue={h?.closesAt ?? "22:00"} className={`${input} w-28`} aria-label={`${day}: fecha`} />
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          Dia desmarcado = fechado. Fechamento menor que a abertura (ex.: 18:00 até 01:00) vira a madrugada.
        </p>
        <SubmitButton pendingText="Salvando...">Salvar horários</SubmitButton>
      </form>

      <section id="impressao" className="scroll-mt-20 space-y-4 rounded-xl border p-4 text-sm">
        <div>
          <h2 className="text-base font-semibold">Impressão de pedidos</h2>
          <p className="text-muted-foreground">Comprovante para impressora térmica (58 ou 80 mm) ou comum (A4).</p>
        </div>
        <PrintSettings paper={printPrefs.paper} printOnAccept={printPrefs.printOnAccept} sampleOrderId={sampleOrder?.id ?? null} />
      </section>

      <section id="cores" className="scroll-mt-20 space-y-4 rounded-xl border p-4 text-sm">
        <div>
          <h2 className="text-lg font-semibold">Cores da marca</h2>
          <p className="text-muted-foreground">Mudam o site, o logo e os botões na hora, para todo mundo.</p>
        </div>
        {saved === "cores" && <p className="rounded-md bg-accent p-3">Cores salvas.</p>}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {THEME_PRESETS.map((preset) => {
            const active = JSON.stringify(preset.theme) === JSON.stringify(theme);
            return (
              <form key={preset.name} action={applyThemePresetAction.bind(null, preset.name)}>
                <button
                  className={`flex w-full items-center gap-2 rounded-xl border p-3 text-left hover:border-primary ${active ? "border-primary ring-2 ring-primary/30" : ""}`}
                >
                  <Swatches theme={preset.theme} />
                  <span className="font-medium">{preset.name}</span>
                </button>
              </form>
            );
          })}
        </div>

        <form action={saveThemeAction} className="space-y-3 rounded-xl bg-muted/50 p-3">
          <p className="font-medium">Ou escolha cada cor</p>
          <div className="grid grid-cols-3 gap-3">
            <ColorField name="primary" label="Principal" value={theme.primary} hint="botões e destaques" />
            <ColorField name="success" label="Secundária" value={theme.success} hint="selo de aberto" />
            <ColorField name="highlight" label="Detalhe" value={theme.highlight} hint="casquinha do logo" />
          </div>
          <div className="flex flex-wrap gap-2">
            <SubmitButton pendingText="Salvando...">Salvar cores</SubmitButton>
            <SubmitButton variant="ghost" formAction={resetThemeAction} pendingText="Restaurando...">
              Voltar ao padrão
            </SubmitButton>
          </div>
        </form>
      </section>

    </div>
  );
}

function Swatches({ theme }: { theme: { primary: string; success: string; highlight: string } }) {
  return (
    <span className="flex -space-x-1.5" aria-hidden>
      {[theme.primary, theme.success, theme.highlight].map((color) => (
        <span key={color} className="size-5 rounded-full border-2 border-card" style={{ backgroundColor: color }} />
      ))}
    </span>
  );
}

function ColorField({ name, label, value, hint }: { name: string; label: string; value: string; hint: string }) {
  return (
    <label className="grid gap-1 text-xs font-medium">
      {label}
      <input type="color" name={name} defaultValue={value} className="h-10 w-full cursor-pointer rounded-lg border bg-background p-1" />
      <span className="font-normal text-muted-foreground">{hint}</span>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label>;
}
