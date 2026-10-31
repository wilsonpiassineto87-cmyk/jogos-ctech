"use server";

import { parseBRL } from "@delivery/core";
import { optionFormSchema, optionGroupFormSchema } from "@delivery/validators";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { failTo, formText, storeMember } from "./member";

// Complementos de um produto: grupos (Tamanho, Sabores...) com opções e preço adicional.
// Cada ação confere que o produto/grupo/opção pertence à loja do usuário.

async function productContext(productId: string) {
  const { store, base } = await storeMember("MANAGER");
  const path = `${base}/menu/${productId}`;
  const product = await prisma.product.findFirst({ where: { id: productId, storeId: store.id, deletedAt: null }, select: { id: true } });
  if (!product) failTo(`${base}/menu`, "Produto não encontrado");
  return { store, path };
}

async function groupOfStore(groupId: string, storeId: string) {
  return prisma.productOptionGroup.findFirst({
    where: { id: groupId, product: { storeId } },
    select: { id: true, productId: true },
  });
}

function done(path: string): never {
  revalidatePath(path);
  revalidatePath("/");
  redirect(path);
}

function parseGroup(form: FormData, path: string) {
  const parsed = optionGroupFormSchema.safeParse({
    name: formText(form, "name"),
    minSelect: Number(formText(form, "minSelect")),
    maxSelect: Number(formText(form, "maxSelect")),
  });
  if (!parsed.success) failTo(path, parsed.error.issues[0]!.message);
  return parsed.data;
}

function parseOption(form: FormData, path: string) {
  const priceCents = parseBRL(formText(form, "price") || "0");
  if (priceCents === null) failTo(path, "Preço adicional inválido");
  const parsed = optionFormSchema.safeParse({ name: formText(form, "name"), priceCents });
  if (!parsed.success) failTo(path, parsed.error.issues[0]!.message);
  return parsed.data;
}

export async function createOptionGroupAction(productId: string, form: FormData) {
  const { path } = await productContext(productId);
  const data = parseGroup(form, path);
  const last = await prisma.productOptionGroup.aggregate({ where: { productId }, _max: { position: true } });
  await prisma.productOptionGroup.create({ data: { ...data, productId, position: (last._max.position ?? -1) + 1 } });
  done(path);
}

export async function updateOptionGroupAction(productId: string, groupId: string, form: FormData) {
  const { store, path } = await productContext(productId);
  const data = parseGroup(form, path);
  if (!(await groupOfStore(groupId, store.id))) failTo(path, "Grupo não encontrado");
  await prisma.productOptionGroup.update({ where: { id: groupId }, data });
  done(path);
}

export async function deleteOptionGroupAction(productId: string, groupId: string) {
  const { store, path } = await productContext(productId);
  if (!(await groupOfStore(groupId, store.id))) failTo(path, "Grupo não encontrado");
  // Pedidos antigos guardam uma cópia dos complementos escolhidos, então dá para apagar.
  await prisma.productOptionGroup.delete({ where: { id: groupId } });
  done(path);
}

export async function createOptionAction(productId: string, groupId: string, form: FormData) {
  const { store, path } = await productContext(productId);
  const data = parseOption(form, path);
  if (!(await groupOfStore(groupId, store.id))) failTo(path, "Grupo não encontrado");
  const last = await prisma.productOption.aggregate({ where: { groupId }, _max: { position: true } });
  await prisma.productOption.create({ data: { ...data, groupId, position: (last._max.position ?? -1) + 1 } });
  done(path);
}

async function optionOfStore(optionId: string, storeId: string) {
  return prisma.productOption.findFirst({
    where: { id: optionId, group: { product: { storeId } } },
    select: { id: true, isAvailable: true },
  });
}

export async function updateOptionAction(productId: string, optionId: string, form: FormData) {
  const { store, path } = await productContext(productId);
  const data = parseOption(form, path);
  if (!(await optionOfStore(optionId, store.id))) failTo(path, "Opção não encontrada");
  await prisma.productOption.update({ where: { id: optionId }, data });
  done(path);
}

export async function toggleOptionAction(productId: string, optionId: string) {
  const { store, path } = await productContext(productId);
  const option = await optionOfStore(optionId, store.id);
  if (!option) failTo(path, "Opção não encontrada");
  await prisma.productOption.update({ where: { id: optionId }, data: { isAvailable: !option.isAvailable } });
  done(path);
}

export async function deleteOptionAction(productId: string, optionId: string) {
  const { store, path } = await productContext(productId);
  if (!(await optionOfStore(optionId, store.id))) failTo(path, "Opção não encontrada");
  await prisma.productOption.delete({ where: { id: optionId } });
  done(path);
}
