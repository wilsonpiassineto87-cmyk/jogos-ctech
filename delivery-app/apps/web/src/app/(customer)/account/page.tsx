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

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Minha conta</h1>
        <p className="mt-1 text-muted-foreground">
          {user.name} · {user.email}
        </p>
      </div>

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
