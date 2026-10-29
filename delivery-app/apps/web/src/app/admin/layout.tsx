import { guard, requireRole } from "@/lib/authz";
import { PortalShell } from "@/components/shared/portal-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await guard(() => requireRole("ADMIN"), "/admin");

  return (
    <PortalShell
      title="Super Admin"
      userName={admin.name}
      nav={[
        { href: "/admin", label: "Visão geral" },
        { href: "/admin/orders", label: "Pedidos" },
        { href: "/admin/couriers", label: "Entregadores" },
        { href: "/admin/users", label: "Usuários" },
        { href: "/restaurant", label: "Painel da loja" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
