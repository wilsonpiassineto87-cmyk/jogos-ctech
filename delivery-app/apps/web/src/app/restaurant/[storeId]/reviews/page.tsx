import { Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";
import { formatDateTime } from "@/lib/order-status";

export const metadata = { title: "Avaliações" };

export default async function StoreReviewsPage() {
  const store = await getStore();
  const reviews = await prisma.review.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, storeRating: true, comment: true, createdAt: true, customer: { select: { name: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Avaliações</h1>
      <p className="mt-1 text-muted-foreground">
        {store.ratingCount > 0 ? `Nota média ${store.ratingAvg.toFixed(1)} (${store.ratingCount})` : "Ainda sem avaliações."}
      </p>
      <ul className="mt-6 space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-xl border p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{r.customer.name}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>
            </div>
            <div className="mt-1 flex gap-0.5" aria-label={`${r.storeRating} de 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`size-4 ${n <= r.storeRating ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
              ))}
            </div>
            {r.comment && <p className="mt-2">{r.comment}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
