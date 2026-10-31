import { Clock, XCircle } from "lucide-react";
import Link from "@/components/shared/link";
import { guard, requireRole } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { PortalShell } from "@/components/shared/portal-shell";
import { Button } from "@/components/ui/button";

export default async function CourierLayout({ children }: { children: React.ReactNode }) {
  const user = await guard(() => requireRole("COURIER"), "/courier");
  const profile = await prisma.courierProfile.findUnique({ where: { userId: user.id }, select: { status: true } });
  const approved = profile?.status === "APPROVED";

  return (
    <PortalShell
      title="Entregador"
      userName={user.name}
      nav={
        approved
          ? [
              { href: "/courier", label: "Corridas" },
              { href: "/courier/history", label: "Histórico" },
              { href: "/courier/earnings", label: "Ganhos" },
            ]
          : []
      }
    >
      {approved ? children : <NotApproved status={profile?.status ?? "PENDING_APPROVAL"} />}
    </PortalShell>
  );
}

function NotApproved({ status }: { status: string }) {
  const pending = status === "PENDING_APPROVAL";
  return (
    <section className="mx-auto max-w-md px-4 py-16 text-center">
      {pending ? (
        <Clock className="mx-auto size-12 text-primary" />
      ) : (
        <XCircle className="mx-auto size-12 text-destructive" />
      )}
      <h1 className="mt-4 text-2xl font-semibold">{pending ? "Cadastro em análise" : "Cadastro não liberado"}</h1>
      <p className="mt-2 text-muted-foreground">
        {pending
          ? "Recebemos seus dados. Assim que a loja aprovar, esta tela vira a sua lista de corridas."
          : "Seu cadastro de entregador está suspenso ou não foi aprovado. Fale com a loja para saber mais."}
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">Voltar ao cardápio</Link>
      </Button>
    </section>
  );
}
