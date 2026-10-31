import Link from "next/link";
import { guard, requireUser } from "@/lib/authz";
import { signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteAddressAction } from "@/features/addresses/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const user = await guard(requireUser, "/account");
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: { id: true, label: true, street: true, number: true, complement: true, neighborhood: true, city: true, isDefault: true },
  });
  const workAreas = [
    { role: "MERCHANT", href: "/restaurant", label: "Painel da loja", hint: "Pedidos, cardápio, horários, cores e WhatsApp" },
    { role: "COURIER", href: "/courier", label: "Entregas", hint: "Corridas disponíveis e seus ganhos" },
    { role: "ADMIN", href: "/admin", label: "Admin", hint: "Usuários, entregadores e todos os pedidos" },
  ].filter((area) => user.roles.includes(area.role as (typeof user.roles)[number]));

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Minha conta</h1>
        <p className="mt-1 text-muted-foreground">
          {user.name} · {user.email}
        </p>
      </div>

      {workAreas.length > 0 && (
        <section>
          <h2 className="font-semibold">Área de trabalho</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {workAreas.map((area) => (
              <Link key={area.href} href={area.href} className="rounded-xl border p-4 text-sm hover:border-primary">
                <span className="font-medium text-primary">{area.label} →</span>
                <span className="block text-muted-foreground">{area.hint}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold">Endereços</h2>
        {addresses.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum endereço salvo. Você pode cadastrar um no checkout.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {addresses.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl border p-4 text-sm">
                <span>
                  {a.label && <span className="font-medium">{a.label} · </span>}
                  {a.street}, {a.number}
                  {a.complement ? ` – ${a.complement}` : ""}
                  <span className="block text-muted-foreground">
                    {a.neighborhood}, {a.city}
                    {a.isDefault ? " · padrão" : ""}
                  </span>
                </span>
                <form action={deleteAddressAction.bind(null, a.id)}>
                  <Button variant="ghost" size="sm">
                    Remover
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button variant="outline">Sair</Button>
      </form>
    </div>
  );
}
