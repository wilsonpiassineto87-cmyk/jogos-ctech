import { isStoreOpenNow } from "@/features/stores/queries";
import { toggleOpenAction } from "@/features/store/actions";
import { getDashboard, parsePeriod, type Period } from "@/lib/dashboard";
import { getStore } from "@/lib/store";
import { StoreDashboard } from "@/components/dashboard/store-dashboard";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Painel" };

export default async function StoreDashboardPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { periodo } = await searchParams;
  const period = parsePeriod(periodo);
  const store = await getStore();
  const data = await getDashboard(store.id, period);
  const base = `/restaurant/${store.id}`;
  const open = isStoreOpenNow(store.isOpen, store.openingHours, store.timezone);
  const periodHref = (p: Period) => `${base}/reports${p === "hoje" ? "" : `?periodo=${p}`}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <AutoRefresh intervalMs={60_000} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold tracking-tight">Painel</h1>
        <Badge variant={open ? "success" : "secondary"}>{open ? "Recebendo pedidos" : store.isOpen ? "Fora do horário" : "Loja pausada"}</Badge>
        <form action={toggleOpenAction.bind(null, "reports")}>
          <SubmitButton size="sm" variant={store.isOpen ? "outline" : "default"}>
            {store.isOpen ? "Pausar loja" : "Abrir loja"}
          </SubmitButton>
        </form>
      </div>
      <StoreDashboard data={data} periodHref={periodHref} ordersHref={`${base}/orders`} historyHref={`${base}/orders/history`} />
    </div>
  );
}
