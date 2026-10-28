import { guard, requireCourier } from "@/lib/authz";
import { PortalShell } from "@/components/shared/portal-shell";

export default async function CourierLayout({ children }: { children: React.ReactNode }) {
  const courier = await guard(requireCourier, "/courier");

  return (
    <PortalShell
      title="Entregador"
      userName={courier.name}
      nav={[
        { href: "/courier", label: "Corridas" },
        { href: "/courier/history", label: "Histórico" },
        { href: "/courier/earnings", label: "Ganhos" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
