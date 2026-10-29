import { redirect } from "next/navigation";
import { guard, requireStoreMember } from "@/lib/authz";
import { getStore } from "@/lib/store";
import { PortalShell } from "@/components/shared/portal-shell";

export default async function StoreDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  // Loja única: as páginas trabalham com getStore(); um id diferente na URL volta para ela.
  const current = await getStore();
  if (storeId !== current.id) redirect(`/restaurant/${current.id}/orders`);
  // Só membros desta loja passam daqui.
  const { user, store } = await guard(() => requireStoreMember(storeId), `/restaurant/${storeId}/orders`);
  const base = `/restaurant/${storeId}`;

  return (
    <PortalShell
      title={store.name}
      userName={user.name}
      nav={[
        { href: `${base}/orders`, label: "Pedidos" },
        { href: `${base}/menu`, label: "Cardápio" },
        { href: `${base}/reviews`, label: "Avaliações" },
        { href: `${base}/reports`, label: "Relatórios" },
        { href: `${base}/settings`, label: "Configurações" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
