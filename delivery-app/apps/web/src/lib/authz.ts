import "server-only";
import type { StoreMemberRole, UserRole } from "@delivery/db";
import { redirect } from "next/navigation";
import { HttpError } from "./api";
import { auth } from "./auth";
import { prisma } from "./db";

// Ponto ÚNICO de autorização. Sempre consulta o banco: roles e associações
// revogadas valem na hora, mesmo que o JWT ainda as contenha.

const STORE_ROLE_RANK: Record<StoreMemberRole, number> = { STAFF: 0, MANAGER: 1, OWNER: 2 };

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new HttpError(401, "Faça login para continuar", "UNAUTHENTICATED");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, roles: true, status: true, deletedAt: true },
  });
  if (!user || user.status !== "ACTIVE" || user.deletedAt) {
    throw new HttpError(401, "Sessão inválida", "UNAUTHENTICATED");
  }
  return user;
}

export async function requireRole(role: UserRole) {
  const user = await requireUser();
  if (!user.roles.includes(role)) throw new HttpError(403, "Acesso negado", "FORBIDDEN");
  return user;
}

/** Garante que o usuário é membro da loja (tenant) com pelo menos `minRole`. */
export async function requireStoreMember(storeId: string, minRole: StoreMemberRole = "STAFF") {
  const user = await requireUser();
  const membership = await prisma.storeMember.findUnique({
    where: { storeId_userId: { storeId, userId: user.id } },
    select: { role: true, store: { select: { id: true, name: true, slug: true, status: true } } },
  });
  // 404 em vez de 403: não revela se a loja existe.
  if (!membership) throw new HttpError(404, "Loja não encontrada", "NOT_FOUND");
  if (STORE_ROLE_RANK[membership.role] < STORE_ROLE_RANK[minRole]) {
    throw new HttpError(403, "Permissão insuficiente nesta loja", "FORBIDDEN");
  }
  return { user, role: membership.role, store: membership.store };
}

export async function requireCourier() {
  const user = await requireRole("COURIER");
  const profile = await prisma.courierProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true, isOnline: true, vehicleType: true },
  });
  if (!profile || profile.status !== "APPROVED") {
    throw new HttpError(403, "Cadastro de entregador não aprovado", "COURIER_NOT_APPROVED");
  }
  return { ...user, courier: profile };
}

/**
 * Versão para páginas/layouts: converte 401 em redirect para o login
 * e 403/404 em redirect para a home.
 */
export async function guard<T>(check: () => Promise<T>, callbackUrl?: string): Promise<T> {
  try {
    return await check();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      redirect(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login");
    }
    if (error instanceof HttpError) redirect("/");
    throw error;
  }
}
