"use server";

import { addressFormSchema, type AddressFormInput } from "@delivery/validators";
import { revalidatePath } from "next/cache";
import { HttpError } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { geocodeAddress } from "@/lib/geocode";
import { getStore } from "@/lib/store";

export type SavedAddress = {
  id: string;
  label: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createAddressAction(raw: AddressFormInput): Promise<Result<SavedAddress>> {
  try {
    const user = await requireUser();
    const parsed = addressFormSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Endereço inválido" };
    const input = parsed.data;

    // Sem coordenadas (geocoding indisponível), usa as da loja: o pedido segue com a taxa
    // mínima e a loja confere o endereço ao aceitar.
    const coords = (await geocodeAddress(input)) ?? (await getStore());
    const isFirst = (await prisma.address.count({ where: { userId: user.id } })) === 0;
    const makeDefault = input.isDefault || isFirst;

    const address = await prisma.$transaction(async (tx) => {
      if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      return tx.address.create({
        data: { ...input, isDefault: makeDefault, userId: user.id, latitude: coords.latitude, longitude: coords.longitude },
        select: { id: true, label: true, street: true, number: true, complement: true, neighborhood: true, city: true, state: true },
      });
    });
    revalidatePath("/account");
    return { ok: true, data: address };
  } catch (error) {
    return { ok: false, error: error instanceof HttpError ? error.message : "Não foi possível salvar o endereço" };
  }
}

export async function deleteAddressAction(addressId: string): Promise<void> {
  const user = await requireUser();
  // userId no WHERE: só apaga endereço do próprio usuário. Pedidos antigos guardam uma cópia.
  await prisma.address.deleteMany({ where: { id: addressId, userId: user.id } });
  revalidatePath("/account");
}
