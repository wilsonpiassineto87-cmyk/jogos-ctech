import "server-only";
import { deliveryFeeCents, distanceKm, quoteOrder } from "@delivery/core";
import type { CheckoutQuoteInput } from "@delivery/validators";
import { HttpError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isStoreOpenNow } from "@/features/stores/queries";

export async function getPlatformSettings() {
  return prisma.platformSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/**
 * Recalcula o carrinho inteiro a partir do banco. Usado pelo /checkout/quote
 * e de novo na criação do pedido — preço vindo do cliente é ignorado.
 */
export async function buildQuote(customerId: string, input: CheckoutQuoteInput) {
  const [store, address, settings, feeRules] = await Promise.all([
    prisma.store.findFirst({
      where: { id: input.storeId, status: "ACTIVE", deletedAt: null },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        isOpen: true,
        timezone: true,
        minOrderCents: true,
        deliveryRadiusKm: true,
        prepTimeMinutes: true,
        commissionBps: true,
        openingHours: { select: { dayOfWeek: true, opensAt: true, closesAt: true } },
      },
    }),
    // Filtrar por userId impede usar o endereço de outra pessoa (IDOR).
    prisma.address.findFirst({ where: { id: input.addressId, userId: customerId } }),
    getPlatformSettings(),
    prisma.deliveryFeeRule.findMany({ where: { isActive: true } }),
  ]);

  if (!store) throw new HttpError(404, "Loja não encontrada", "STORE_NOT_FOUND");
  if (!address) throw new HttpError(404, "Endereço não encontrado", "ADDRESS_NOT_FOUND");
  if (!isStoreOpenNow(store.isOpen, store.openingHours, store.timezone)) {
    throw new HttpError(409, "A loja está fechada no momento", "STORE_CLOSED");
  }

  const distance = distanceKm(store, address);
  const fee = distance <= store.deliveryRadiusKm ? deliveryFeeCents(feeRules, distance, address.city) : null;

  const productIds = [...new Set(input.lines.map((l) => l.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId: store.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      priceCents: true,
      isAvailable: true,
      optionGroups: {
        select: {
          id: true,
          name: true,
          minSelect: true,
          maxSelect: true,
          options: { select: { id: true, name: true, priceCents: true, isAvailable: true } },
        },
      },
    },
  });

  const quote = quoteOrder({
    products: new Map(products.map((p) => [p.id, p])),
    lines: input.lines,
    minOrderCents: store.minOrderCents,
    deliveryFeeCents: fee,
    serviceFeeCents: settings.serviceFeeCents,
    commissionBps: store.commissionBps ?? settings.defaultCommissionBps,
  });

  return { quote, store, address, settings, distanceKm: distance };
}
