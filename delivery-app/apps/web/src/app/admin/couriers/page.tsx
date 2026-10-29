import { prisma } from "@/lib/db";
import { setCourierStatusAction } from "@/features/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Entregadores" };

const STATUS_LABEL = { PENDING_APPROVAL: "Aguardando aprovação", APPROVED: "Aprovado", SUSPENDED: "Suspenso", REJECTED: "Recusado" };
const VEHICLE_LABEL = { ON_FOOT: "A pé", BICYCLE: "Bicicleta", MOTORCYCLE: "Moto", CAR: "Carro" };

export default async function AdminCouriersPage() {
  const couriers = await prisma.courierProfile.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      isOnline: true,
      vehicleType: true,
      licensePlate: true,
      user: { select: { name: true, email: true, phone: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Entregadores</h1>
      <p className="mt-1 text-sm text-muted-foreground">Para cadastrar um novo entregador, use a tela Usuários.</p>
      <ul className="mt-6 divide-y rounded-xl border">
        {couriers.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nenhum entregador cadastrado.</li>}
        {couriers.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <div className="mr-auto">
              <p className="font-medium">
                {c.user.name} {c.isOnline && <Badge className="ml-1">online</Badge>}
              </p>
              <p className="text-muted-foreground">
                {c.user.email}
                {c.user.phone ? ` · ${c.user.phone}` : ""} · {VEHICLE_LABEL[c.vehicleType]}
                {c.licensePlate ? ` ${c.licensePlate}` : ""}
              </p>
            </div>
            <Badge variant={c.status === "APPROVED" ? "default" : "secondary"}>{STATUS_LABEL[c.status]}</Badge>
            {c.status !== "APPROVED" && (
              <form action={setCourierStatusAction.bind(null, c.id, "APPROVED")}>
                <Button size="sm">Aprovar</Button>
              </form>
            )}
            {c.status === "APPROVED" && (
              <form action={setCourierStatusAction.bind(null, c.id, "SUSPENDED")}>
                <Button size="sm" variant="outline">
                  Suspender
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
