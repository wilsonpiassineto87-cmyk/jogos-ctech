"use server";

import { parseBRL, type OrderStatus } from "@delivery/core";
import { categoryFormSchema, productFormSchema, storeSettingsSchema } from "@delivery/validators";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStoreMember } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";
import { acceptOrder, transitionOrder } from "@/features/orders/status";

// Toda ação confere se o usuário é membro da loja; o storeId vem do servidor, nunca do form.
async function member(minRole: "STAFF" | "MANAGER" = "STAFF") {
  const store = await getStore();
  const { user } = await requireStoreMember(store.id, minRole);
  return { store, user, base: `/restaurant/${store.id}` };
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "");

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// --- Pedidos -------------------------------------------------------------------

export async function acceptOrderAction(orderId: string) {
  const { store, user, base } = await member();
  await acceptOrder({ orderId, storeId: store.id, userId: user.id });
  revalidatePath(`${base}/orders`);
}

export async function rejectOrderAction(orderId: string, form: FormData) {
  const { store, user, base } = await member();
  const reason = text(form, "reason").trim() || "Recusado pela loja";
  await transitionOrder({ orderId, to: "REJECTED", actor: "STORE", userId: user.id, scope: { storeId: store.id }, note: reason });
  revalidatePath(`${base}/orders`);
}

export async function advanceOrderAction(orderId: string, to: OrderStatus) {
  const { store, user, base } = await member();
  await transitionOrder({ orderId, to, actor: "STORE", userId: user.id, scope: { storeId: store.id } });
  revalidatePath(`${base}/orders`);
}

export async function toggleOpenAction() {
  const { store, base } = await member();
  await prisma.store.update({ where: { id: store.id }, data: { isOpen: !store.isOpen } });
  revalidatePath(base, "layout");
  revalidatePath("/");
}

// --- Cardápio ------------------------------------------------------------------

export async function createCategoryAction(form: FormData) {
  const { store, base } = await member("MANAGER");
  const parsed = categoryFormSchema.safeParse({ name: text(form, "name") });
  if (!parsed.success) fail(`${base}/menu`, parsed.error.issues[0]!.message);
  const last = await prisma.productCategory.aggregate({ where: { storeId: store.id }, _max: { position: true } });
  await prisma.productCategory.create({
    data: { storeId: store.id, name: parsed.data.name, position: (last._max.position ?? -1) + 1 },
  });
  revalidatePath(`${base}/menu`);
  revalidatePath("/");
}

export async function deleteCategoryAction(categoryId: string) {
  const { store, base } = await member("MANAGER");
  // Produtos da categoria ficam "sem categoria" (onDelete: SetNull), não somem.
  await prisma.productCategory.deleteMany({ where: { id: categoryId, storeId: store.id } });
  revalidatePath(`${base}/menu`);
  revalidatePath("/");
}

function parseProduct(form: FormData, path: string) {
  const priceCents = parseBRL(text(form, "price"));
  if (priceCents === null) fail(path, "Preço inválido");
  const parsed = productFormSchema.safeParse({
    name: text(form, "name"),
    description: text(form, "description"),
    categoryId: text(form, "categoryId"),
    imageUrl: text(form, "imageUrl"),
    priceCents,
  });
  if (!parsed.success) fail(path, parsed.error.issues[0]!.message);
  return parsed.data;
}

async function assertCategory(storeId: string, categoryId: string | null | undefined, path: string) {
  if (!categoryId) return;
  const exists = await prisma.productCategory.count({ where: { id: categoryId, storeId } });
  if (!exists) fail(path, "Categoria inválida");
}

export async function createProductAction(form: FormData) {
  const { store, base } = await member("MANAGER");
  const data = parseProduct(form, `${base}/menu`);
  await assertCategory(store.id, data.categoryId, `${base}/menu`);
  await prisma.product.create({ data: { ...data, storeId: store.id } });
  revalidatePath(`${base}/menu`);
  revalidatePath("/");
}

export async function updateProductAction(productId: string, form: FormData) {
  const { store, base } = await member("MANAGER");
  const data = parseProduct(form, `${base}/menu`);
  await assertCategory(store.id, data.categoryId, `${base}/menu`);
  await prisma.product.updateMany({ where: { id: productId, storeId: store.id }, data });
  revalidatePath(`${base}/menu`);
  revalidatePath("/");
}

export async function toggleProductAction(productId: string) {
  const { store, base } = await member();
  const product = await prisma.product.findFirst({ where: { id: productId, storeId: store.id }, select: { isAvailable: true } });
  if (!product) return;
  await prisma.product.updateMany({ where: { id: productId, storeId: store.id }, data: { isAvailable: !product.isAvailable } });
  revalidatePath(`${base}/menu`);
  revalidatePath("/");
}

export async function deleteProductAction(productId: string) {
  const { store, base } = await member("MANAGER");
  // Exclusão lógica: pedidos antigos continuam apontando para o produto.
  await prisma.product.updateMany({ where: { id: productId, storeId: store.id }, data: { deletedAt: new Date() } });
  revalidatePath(`${base}/menu`);
  revalidatePath("/");
}

// --- Configurações -------------------------------------------------------------

export async function saveSettingsAction(form: FormData) {
  const { store, base } = await member("MANAGER");
  const path = `${base}/settings`;
  const minOrderCents = parseBRL(text(form, "minOrder") || "0");
  const deliveryFeeCents = parseBRL(text(form, "deliveryFee") || "0");
  const deliveryFeePerKmCents = parseBRL(text(form, "deliveryFeePerKm") || "0");
  if (minOrderCents === null || deliveryFeeCents === null || deliveryFeePerKmCents === null) fail(path, "Valor em R$ inválido");

  const parsed = storeSettingsSchema.safeParse({
    name: text(form, "name"),
    description: text(form, "description"),
    phone: text(form, "phone"),
    minOrderCents,
    prepTimeMinutes: Number(text(form, "prepTimeMinutes")),
    deliveryRadiusKm: Number(text(form, "deliveryRadiusKm").replace(",", ".")),
    deliveryFeeCents,
    deliveryFeePerKmCents,
  });
  if (!parsed.success) fail(path, parsed.error.issues[0]!.message);
  const s = parsed.data;

  await prisma.$transaction([
    prisma.store.update({
      where: { id: store.id },
      data: {
        name: s.name,
        description: s.description ?? null,
        phone: s.phone ?? null,
        minOrderCents: s.minOrderCents,
        prepTimeMinutes: s.prepTimeMinutes,
        deliveryRadiusKm: s.deliveryRadiusKm,
      },
    }),
    // Loja única: a taxa de entrega é uma regra só, válida em todo o raio de entrega.
    prisma.deliveryFeeRule.deleteMany({}),
    prisma.deliveryFeeRule.create({
      data: {
        name: "Taxa da loja",
        maxDistanceKm: s.deliveryRadiusKm + 0.001,
        baseFeeCents: s.deliveryFeeCents,
        feePerKmCents: s.deliveryFeePerKmCents,
      },
    }),
  ]);
  revalidatePath(base, "layout");
  revalidatePath("/");
  redirect(`${path}?saved=1`);
}
