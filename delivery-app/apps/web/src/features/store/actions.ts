"use server";

import { parseBRL, type OrderStatus } from "@delivery/core";
import { addressFormSchema, categoryFormSchema, productFormSchema, storeSettingsSchema } from "@delivery/validators";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAction } from "@/lib/action";
import { requireStoreMember } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { geocodeAddress, geocodeCity } from "@/lib/geocode";
import { refreshPublicMenu } from "@/lib/menu";
import { UPLOAD_MAX_BYTES, UPLOAD_TYPES, UPLOADED_IMAGE_PREFIX } from "@/lib/product-images";
import { parseCityList } from "@/lib/service-area";
import { forgetStore, getStore } from "@/lib/store";
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
  await runAction(`${base}/orders`, () => acceptOrder({ orderId, storeId: store.id, userId: user.id }));
}

export async function rejectOrderAction(orderId: string, form: FormData) {
  const { store, user, base } = await member();
  const reason = text(form, "reason").trim() || "Recusado pela loja";
  await runAction(`${base}/orders`, () =>
    transitionOrder({ orderId, to: "REJECTED", actor: "STORE", userId: user.id, scope: { storeId: store.id }, note: reason }),
  );
}

export async function advanceOrderAction(orderId: string, to: OrderStatus) {
  const { store, user, base } = await member();
  await runAction(`${base}/orders`, () =>
    transitionOrder({ orderId, to, actor: "STORE", userId: user.id, scope: { storeId: store.id } }),
  );
}

/** `from`: tela de onde veio o clique (pedidos ou configurações), para voltar a ela. */
export async function toggleOpenAction(from: "orders" | "settings" | "reports") {
  const { store, base } = await member();
  revalidatePath("/");
  await runAction(`${base}/${from}`, async () => {
    // Lê do banco, não da loja guardada em memória: inverte o estado real.
    const { isOpen } = await prisma.store.findUniqueOrThrow({ where: { id: store.id }, select: { isOpen: true } });
    await prisma.store.update({ where: { id: store.id }, data: { isOpen: !isOpen } });
    forgetStore();
  });
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
  refreshPublicMenu(store.id);
}

export async function deleteCategoryAction(categoryId: string) {
  const { store, base } = await member("MANAGER");
  // Produtos da categoria ficam "sem categoria" (onDelete: SetNull), não somem.
  await prisma.productCategory.deleteMany({ where: { id: categoryId, storeId: store.id } });
  revalidatePath(`${base}/menu`);
  refreshPublicMenu(store.id);
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

/** Foto enviada do aparelho (campo "image"): grava no banco e devolve o endereço dela. */
async function saveUploadedImage(storeId: string, form: FormData, path: string) {
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!UPLOAD_TYPES.includes(file.type)) fail(path, "Formato de foto não aceito. Use JPG, PNG ou WebP.");
  if (file.size > UPLOAD_MAX_BYTES) fail(path, "Foto muito grande. Escolha outra foto.");
  const image = await prisma.productImage.create({
    data: { storeId, contentType: file.type, data: new Uint8Array(await file.arrayBuffer()) },
    select: { id: true },
  });
  return `${UPLOADED_IMAGE_PREFIX}${image.id}`;
}

/** Apaga do banco uma foto enviada que deixou de ser usada (ilustrações e links ficam como estão). */
async function deleteUploadedImage(storeId: string, url: string | null | undefined) {
  if (!url?.startsWith(UPLOADED_IMAGE_PREFIX)) return;
  await prisma.productImage.deleteMany({ where: { id: url.slice(UPLOADED_IMAGE_PREFIX.length), storeId } });
}

export async function createProductAction(form: FormData) {
  const { store, base } = await member("MANAGER");
  const data = parseProduct(form, `${base}/menu`);
  await assertCategory(store.id, data.categoryId, `${base}/menu`);
  const uploaded = await saveUploadedImage(store.id, form, `${base}/menu`);
  await prisma.product.create({ data: { ...data, imageUrl: uploaded ?? data.imageUrl, storeId: store.id } });
  revalidatePath(`${base}/menu`);
  refreshPublicMenu(store.id);
}

export async function updateProductAction(productId: string, form: FormData) {
  const { store, base } = await member("MANAGER");
  const data = parseProduct(form, `${base}/menu`);
  await assertCategory(store.id, data.categoryId, `${base}/menu`);
  const current = await prisma.product.findFirst({ where: { id: productId, storeId: store.id }, select: { imageUrl: true } });
  if (!current) fail(`${base}/menu`, "Produto não encontrado");
  const uploaded = await saveUploadedImage(store.id, form, `${base}/menu`);
  const imageUrl = uploaded ?? data.imageUrl;
  await prisma.product.updateMany({ where: { id: productId, storeId: store.id }, data: { ...data, imageUrl } });
  if (imageUrl !== undefined && imageUrl !== current.imageUrl) await deleteUploadedImage(store.id, current.imageUrl);
  revalidatePath(`${base}/menu`);
  refreshPublicMenu(store.id);
}

export async function toggleProductAction(productId: string) {
  const { store, base } = await member();
  const product = await prisma.product.findFirst({ where: { id: productId, storeId: store.id }, select: { isAvailable: true } });
  if (!product) return;
  await prisma.product.updateMany({ where: { id: productId, storeId: store.id }, data: { isAvailable: !product.isAvailable } });
  revalidatePath(`${base}/menu`);
  refreshPublicMenu(store.id);
}

export async function deleteProductAction(productId: string) {
  const { store, base } = await member("MANAGER");
  // Exclusão lógica: pedidos antigos continuam apontando para o produto.
  await prisma.product.updateMany({ where: { id: productId, storeId: store.id }, data: { deletedAt: new Date() } });
  revalidatePath(`${base}/menu`);
  refreshPublicMenu(store.id);
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
  const cities = parseCityList(text(form, "cities"));
  if (cities.length > 20) fail(path, "Informe no máximo 20 cidades");

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
    // Loja única: a mesma taxa em todo o raio. Uma regra por cidade atendida (endereço de
    // outra cidade fica sem taxa = fora da área); sem cidades, uma regra para qualquer uma.
    prisma.deliveryFeeRule.deleteMany({}),
    prisma.deliveryFeeRule.createMany({
      data: (cities.length > 0 ? cities : [null]).map((city) => ({
        name: city ? `Entrega em ${city}` : "Taxa da loja",
        city,
        maxDistanceKm: s.deliveryRadiusKm + 0.001,
        baseFeeCents: s.deliveryFeeCents,
        feePerKmCents: s.deliveryFeePerKmCents,
      })),
    }),
  ]);
  forgetStore();
  revalidatePath(base, "layout");
  revalidatePath("/");
  redirect(`${path}?saved=1`);
}

/** Endereço da loja: vira o centro do raio de entrega e aparece no comprovante. */
export async function saveStoreAddressAction(form: FormData) {
  const { store, base } = await member("MANAGER");
  const path = `${base}/settings`;
  const parsed = addressFormSchema
    .pick({ zipCode: true, street: true, number: true, complement: true, neighborhood: true, city: true, state: true })
    .safeParse({
      zipCode: text(form, "zipCode").trim(),
      street: text(form, "street").trim(),
      number: text(form, "number").trim(),
      complement: text(form, "complement").trim() || undefined,
      neighborhood: text(form, "neighborhood").trim(),
      city: text(form, "city").trim(),
      state: text(form, "state").trim(),
    });
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    fail(path, issue.path[0] === "zipCode" ? "CEP inválido" : "Preencha rua, número, bairro, cidade e UF");
  }
  const a = parsed.data;
  // A rua nem sempre está no mapa em cidade pequena: aí vale o centro da cidade.
  const coords = (await geocodeAddress(a)) ?? (await geocodeCity(a.city, a.state));
  if (!coords) fail(path, `Não achamos ${a.city}/${a.state} no mapa. Confira o nome da cidade e a UF.`);

  await prisma.store.update({
    where: { id: store.id },
    data: {
      zipCode: a.zipCode.replace(/^(\d{5})(\d{3})$/, "$1-$2"),
      street: a.street,
      number: a.number,
      complement: a.complement ?? null,
      neighborhood: a.neighborhood,
      city: a.city,
      state: a.state,
      latitude: coords.latitude,
      longitude: coords.longitude,
    },
  });
  forgetStore();
  revalidatePath(base, "layout");
  revalidatePath("/");
  redirect(`${path}?saved=endereco#endereco`);
}
