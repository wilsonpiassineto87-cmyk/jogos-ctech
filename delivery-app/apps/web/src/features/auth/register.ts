import "server-only";
import { hashPassword } from "@delivery/core";
import { Prisma } from "@delivery/db";
import type { CourierSignupInput, RegisterInput } from "@delivery/validators";
import { HttpError } from "@/lib/api";
import { prisma } from "@/lib/db";

/** Traduz violação de campo único (e-mail, telefone, CPF) numa mensagem para o usuário. */
function uniqueConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = String(error.meta?.target ?? "");
    if (target.includes("email")) throw new HttpError(409, "Este e-mail já tem cadastro. Tente entrar.", "EMAIL_TAKEN");
    if (target.includes("phone")) throw new HttpError(409, "Este telefone já está em outro cadastro.", "PHONE_TAKEN");
    if (target.includes("taxId")) throw new HttpError(409, "Este CPF já está cadastrado como entregador.", "CPF_TAKEN");
  }
  throw error;
}

export async function registerCustomer(input: RegisterInput) {
  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: await hashPassword(input.password),
        roles: ["CUSTOMER"],
      },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    uniqueConflict(error);
  }
}

/** Entregador: conta + perfil "em análise". Só recebe corridas depois que o admin aprova. */
export async function registerCourier(input: CourierSignupInput) {
  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: await hashPassword(input.password),
        roles: ["COURIER", "CUSTOMER"],
        courierProfile: {
          create: {
            taxId: input.taxId,
            vehicleType: input.vehicleType,
            licensePlate: input.licensePlate,
            status: "PENDING_APPROVAL",
          },
        },
      },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    uniqueConflict(error);
  }
}
