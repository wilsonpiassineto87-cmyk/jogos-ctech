import "server-only";
import { boundingBox, distanceKm, isWithinOpeningHours, type LatLng } from "@delivery/core";
import { prisma } from "@/lib/db";

// Maior raio de entrega aceito na plataforma; delimita a busca por bounding box.
const MAX_SEARCH_RADIUS_KM = 15;

export type StoreListParams = LatLng & { category?: string; q?: string; limit: number };

/**
 * Lojas que entregam no ponto informado, abertas primeiro e depois por distância.
 * TODO: com volume alto, trocar por PostGIS (ST_DWithin) e paginação por cursor.
 */
export async function listStores({ latitude, longitude, category, q, limit }: StoreListParams) {
  const box = boundingBox({ latitude, longitude }, MAX_SEARCH_RADIUS_KM);

  const stores = await prisma.store.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLng, lte: box.maxLng },
      ...(category ? { categories: { some: { slug: category } } } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      logoUrl: true,
      bannerUrl: true,
      latitude: true,
      longitude: true,
      deliveryRadiusKm: true,
      minOrderCents: true,
      prepTimeMinutes: true,
      ratingAvg: true,
      ratingCount: true,
      isOpen: true,
      timezone: true,
      openingHours: { select: { dayOfWeek: true, opensAt: true, closesAt: true } },
      categories: { select: { name: true, slug: true } },
    },
    take: 200,
  });

  return stores
    .map(({ openingHours, timezone, ...store }) => ({
      ...store,
      distanceKm: distanceKm({ latitude, longitude }, store),
      isOpenNow: isStoreOpenNow(store.isOpen, openingHours, timezone),
    }))
    .filter((s) => s.distanceKm <= s.deliveryRadiusKm)
    .sort((a, b) => Number(b.isOpenNow) - Number(a.isOpenNow) || a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/** Cardápio público: categorias ativas com produtos (e complementos) não excluídos. */
export async function getMenu(storeId: string) {
  return prisma.productCategory.findMany({
    where: { storeId, isActive: true },
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      products: {
        where: { deletedAt: null },
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          priceCents: true,
          isAvailable: true,
          optionGroups: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              name: true,
              minSelect: true,
              maxSelect: true,
              options: {
                where: { isAvailable: true },
                orderBy: { position: "asc" },
                select: { id: true, name: true, priceCents: true },
              },
            },
          },
        },
      },
    },
  });
}

export type MenuCategory = Awaited<ReturnType<typeof getMenu>>[number];
export type MenuProduct = MenuCategory["products"][number];

/** Pausa manual vence; sem horários cadastrados, vale só a pausa. */
export function isStoreOpenNow(
  isOpen: boolean,
  hours: { dayOfWeek: number; opensAt: string; closesAt: string }[],
  timezone: string,
): boolean {
  if (!isOpen) return false;
  return hours.length === 0 || isWithinOpeningHours(hours, timezone);
}
