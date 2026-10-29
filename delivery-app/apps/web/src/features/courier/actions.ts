"use server";

import { completeDeliverySchema } from "@delivery/validators";
import { redirect } from "next/navigation";
import { runAction } from "@/lib/action";
import { requireCourier } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { acceptDelivery, completeDelivery, markArrived, markPickedUp } from "./service";

// Erros esperados (corrida já aceita, PIN errado...) voltam como mensagem na própria tela.

export async function toggleOnlineAction() {
  const courier = await requireCourier();
  await runAction("/courier", async () => {
    await prisma.courierProfile.update({
      where: { id: courier.courier.id },
      data: { isOnline: !courier.courier.isOnline, lastSeenAt: new Date() },
    });
  });
}

export async function acceptDeliveryAction(deliveryId: string) {
  const courier = await requireCourier();
  await runAction("/courier", () => acceptDelivery(courier, deliveryId), `/courier/delivery/${deliveryId}`);
}

export async function arrivedAction(deliveryId: string) {
  const courier = await requireCourier();
  await runAction(`/courier/delivery/${deliveryId}`, () => markArrived(courier.id, deliveryId));
}

export async function pickedUpAction(deliveryId: string) {
  const courier = await requireCourier();
  await runAction(`/courier/delivery/${deliveryId}`, () => markPickedUp(courier.id, deliveryId));
}

export async function completeDeliveryAction(deliveryId: string, form: FormData) {
  const courier = await requireCourier();
  const path = `/courier/delivery/${deliveryId}`;
  const parsed = completeDeliverySchema.safeParse({ pin: String(form.get("pin") ?? "").trim() });
  if (!parsed.success) redirect(`${path}?error=${encodeURIComponent("Digite o código de 4 dígitos")}`);
  await runAction(path, () => completeDelivery(courier.id, deliveryId, parsed.data.pin));
}
