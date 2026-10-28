import Link from "next/link";
import { redirect } from "next/navigation";
import { guard, requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Minhas lojas" };

// Seletor de loja: com uma só, entra direto no painel de pedidos.
export default async function RestaurantIndexPage() {
  const user = await guard(requireUser);
  const memberships = await prisma.storeMember.findMany({
    where: { userId: user.id },
    select: { role: true, store: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 1) redirect(`/restaurant/${memberships[0]!.store.id}/orders`);

  return (
    <section className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Minhas lojas</h1>
      {memberships.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Você ainda não faz parte de nenhuma loja.</p>
      ) : (
        <ul className="mt-6 divide-y rounded-xl border">
          {memberships.map(({ store, role }) => (
            <li key={store.id}>
              <Link href={`/restaurant/${store.id}/orders`} className="flex items-center justify-between p-4 hover:bg-accent">
                <span className="font-medium">{store.name}</span>
                <span className="flex gap-2">
                  {store.status !== "ACTIVE" && <Badge variant="secondary">{store.status}</Badge>}
                  <Badge variant="outline">{role}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
