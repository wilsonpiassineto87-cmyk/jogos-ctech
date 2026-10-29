import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";
import {
  grantStoreAccessAction,
  makeCourierAction,
  revokeStoreAccessAction,
  setUserStatusAction,
} from "@/features/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Usuários" };

const ROLE_LABEL = { CUSTOMER: "Cliente", MERCHANT: "Loja", COURIER: "Entregador", ADMIN: "Admin" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string }> }) {
  const { error, q } = await searchParams;
  const [admin, store] = await Promise.all([requireRole("ADMIN"), getStore()]);
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      status: true,
      courierProfile: { select: { id: true } },
      storeMemberships: { where: { storeId: store.id }, select: { role: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
      {error && <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <form className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou e-mail"
          className="h-9 w-full max-w-sm rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button variant="outline" size="sm" className="h-9">
          Buscar
        </Button>
      </form>

      <ul className="mt-6 divide-y rounded-xl border">
        {users.map((u) => {
          const membership = u.storeMemberships[0];
          return (
            <li key={u.id} className="space-y-3 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <div className="mr-auto">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-muted-foreground">{u.email}</p>
                </div>
                {u.roles.map((r) => (
                  <Badge key={r} variant="outline">
                    {ROLE_LABEL[r]}
                  </Badge>
                ))}
                {membership && <Badge variant="secondary">equipe da loja ({membership.role.toLowerCase()})</Badge>}
                {u.status === "SUSPENDED" && <Badge variant="destructive">suspenso</Badge>}
              </div>
              {u.id !== admin.id && (
                <div className="flex flex-wrap items-center gap-2">
                  {membership ? (
                    membership.role !== "OWNER" && (
                      <form action={revokeStoreAccessAction.bind(null, u.id)}>
                        <Button size="sm" variant="outline">
                          Tirar acesso à loja
                        </Button>
                      </form>
                    )
                  ) : (
                    <form action={grantStoreAccessAction.bind(null, u.id)}>
                      <Button size="sm" variant="outline">
                        Dar acesso à loja
                      </Button>
                    </form>
                  )}
                  {!u.courierProfile && (
                    <details>
                      <summary className="inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-sm">
                        Tornar entregador
                      </summary>
                      <form action={makeCourierAction.bind(null, u.id)} className="mt-2 flex flex-wrap gap-2">
                        <input name="taxId" required placeholder="CPF" inputMode="numeric" className="h-8 rounded-md border bg-background px-2 text-sm" />
                        <select name="vehicleType" className="h-8 rounded-md border bg-background px-2 text-sm">
                          <option value="MOTORCYCLE">Moto</option>
                          <option value="BICYCLE">Bicicleta</option>
                          <option value="CAR">Carro</option>
                          <option value="ON_FOOT">A pé</option>
                        </select>
                        <Button size="sm">Salvar</Button>
                      </form>
                    </details>
                  )}
                  <form action={setUserStatusAction.bind(null, u.id, u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>
                    <Button size="sm" variant="ghost">
                      {u.status === "ACTIVE" ? "Suspender conta" : "Reativar conta"}
                    </Button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
