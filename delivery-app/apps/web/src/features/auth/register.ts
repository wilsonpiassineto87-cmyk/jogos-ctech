import "server-only";
import type { RegisterInput } from "@delivery/validators";
import { hash } from "@node-rs/argon2";
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
      passwordHash: await hash(input.password), // argon2id
      roles: ["CUSTOMER"],
    },
    select: { id: true, name: true, email: true },
  });
}
