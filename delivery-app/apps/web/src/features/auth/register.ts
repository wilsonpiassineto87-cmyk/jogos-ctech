import "server-only";
import { hashPassword } from "@delivery/core";
import type { RegisterInput } from "@delivery/validators";
import { HttpError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function registerCustomer(input: RegisterInput) {
  const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (exists) throw new HttpError(409, "E-mail já cadastrado", "EMAIL_TAKEN");

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      roles: ["CUSTOMER"],
    },
    select: { id: true, name: true, email: true },
  });
}
