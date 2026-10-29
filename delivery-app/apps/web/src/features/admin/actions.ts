"use server";

import type { CourierStatus, Prisma } from "@delivery/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/store";

// Toda ação do admin fica registrada no AuditLog.
async function audit(actorId: string, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) {
  await prisma.auditLog.create({ data: { actorId, action, entityType, entityId, metadata } });
}

export async function setCourierStatusAction(courierProfileId: string, status: CourierStatus) {
  const admin = await requireRole("ADMIN");
  const profile = await prisma.courierProfile.update({
    where: { id: courierProfileId },
    data: { status, ...(status !== "APPROVED" ? { isOnline: false } : {}) },
    select: { userId: true },
  });
  await audit(admin.id, `courier.${status.toLowerCase()}`, "CourierProfile", courierProfileId, { userId: profile.userId });
  revalidatePath("/admin/couriers");
}

export async function makeCourierAction(userId: string, form: FormData) {
  const admin = await requireRole("ADMIN");
  const taxId = String(form.get("taxId") ?? "").replace(/\D/g, "");
  const vehicleType = String(form.get("vehicleType") ?? "MOTORCYCLE") as "ON_FOOT" | "BICYCLE" | "MOTORCYCLE" | "CAR";
  if (taxId.length !== 11) redirect(`/admin/users?error=${encodeURIComponent("CPF deve ter 11 dígitos")}`);
  if (await prisma.courierProfile.findFirst({ where: { taxId, NOT: { userId } }, select: { id: true } })) {
    redirect(`/admin/users?error=${encodeURIComponent("CPF já cadastrado para outro entregador")}`);
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { roles: true } });
    await tx.user.update({
      where: { id: userId },
      data: { roles: [...new Set([...user.roles, "COURIER" as const])] },
    });
    await tx.courierProfile.upsert({
      where: { userId },
      update: { taxId, vehicleType, status: "APPROVED" },
      create: { userId, taxId, vehicleType, status: "APPROVED" },
    });
  });
  await audit(admin.id, "user.make_courier", "User", userId, { vehicleType });
  revalidatePath("/admin/users");
  revalidatePath("/admin/couriers");
}

export async function grantStoreAccessAction(userId: string) {
  const admin = await requireRole("ADMIN");
  const store = await getStore();
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { roles: true } });
    await tx.user.update({ where: { id: userId }, data: { roles: [...new Set([...user.roles, "MERCHANT" as const])] } });
    await tx.storeMember.upsert({
      where: { storeId_userId: { storeId: store.id, userId } },
      update: {},
      create: { storeId: store.id, userId, role: "STAFF" },
    });
  });
  await audit(admin.id, "user.grant_store_access", "User", userId, { storeId: store.id });
  revalidatePath("/admin/users");
}

export async function revokeStoreAccessAction(userId: string) {
  const admin = await requireRole("ADMIN");
  const store = await getStore();
  const membership = await prisma.storeMember.findUnique({
    where: { storeId_userId: { storeId: store.id, userId } },
    select: { role: true },
  });
  // O dono não perde o acesso por aqui (evita trancar a loja sem ninguém).
  if (!membership || membership.role === "OWNER") return;
  await prisma.storeMember.delete({ where: { storeId_userId: { storeId: store.id, userId } } });
  await audit(admin.id, "user.revoke_store_access", "User", userId, { storeId: store.id });
  revalidatePath("/admin/users");
}

export async function setUserStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED") {
  const admin = await requireRole("ADMIN");
  if (userId === admin.id) return; // não se suspende a si mesmo
  await prisma.user.update({ where: { id: userId }, data: { status } });
  await audit(admin.id, `user.${status.toLowerCase()}`, "User", userId);
  revalidatePath("/admin/users");
}
