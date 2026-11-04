import "server-only";
import { HttpError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { channels, publish } from "@/lib/realtime";
import { transitionOrder } from "@/features/orders/status";

const ACTIVE = ["ASSIGNED", "AT_STORE", "PICKED_UP"] as const;

export async function getActiveDelivery(courierId: string) {
  return prisma.delivery.findFirst({ where: { courierId, status: { in: [...ACTIVE] } }, select: { id: true } });
}

/** O primeiro entregador que aceitar fica com a corrida (condição no WHERE do UPDATE). */
export async function acceptDelivery(courier: { id: string; name: string }, deliveryId: string) {
  if (await getActiveDelivery(courier.id)) {
    throw new HttpError(409, "Finalize a corrida atual antes de aceitar outra", "COURIER_BUSY");
  }
  const { count } = await prisma.delivery.updateMany({
    where: { id: deliveryId, status: "WAITING_COURIER", courierId: null },
    data: { courierId: courier.id, status: "ASSIGNED", assignedAt: new Date() },
  });
  if (count === 0) throw new HttpError(409, "Corrida já aceita por outro entregador", "DELIVERY_TAKEN");

  const delivery = await prisma.delivery.findUniqueOrThrow({
    where: { id: deliveryId },
    select: { orderId: true, order: { select: { storeId: true } } },
  });
  await Promise.all([
    publish(channels.store(delivery.order.storeId), "delivery.taken", { deliveryId, courierName: courier.name }),
    publish(channels.order(delivery.orderId), "order.status_changed", { courierAssigned: true }),
  ]);
}

/** Corrida do entregador logado (courierId no WHERE: ninguém mexe na corrida de outro). */
async function ownDelivery(courierId: string, deliveryId: string) {
  const delivery = await prisma.delivery.findFirst({
    where: { id: deliveryId, courierId },
    select: { id: true, status: true, orderId: true, confirmationCode: true, order: { select: { status: true } } },
  });
  if (!delivery) throw new HttpError(404, "Corrida não encontrada", "NOT_FOUND");
  return delivery;
}

export async function markArrived(courierId: string, deliveryId: string) {
  const d = await ownDelivery(courierId, deliveryId);
  if (d.status !== "ASSIGNED") throw new HttpError(409, "Etapa inválida", "INVALID_STEP");
  await prisma.delivery.update({ where: { id: d.id }, data: { status: "AT_STORE", arrivedAtStoreAt: new Date() } });
}

export async function markPickedUp(courierId: string, deliveryId: string) {
  const d = await ownDelivery(courierId, deliveryId);
  if (d.status !== "ASSIGNED" && d.status !== "AT_STORE") throw new HttpError(409, "Etapa inválida", "INVALID_STEP");
  if (d.order.status !== "READY_FOR_PICKUP") {
    throw new HttpError(409, "A loja ainda não marcou o pedido como pronto", "ORDER_NOT_READY");
  }
  await transitionOrder({ orderId: d.orderId, to: "OUT_FOR_DELIVERY", actor: "COURIER", userId: courierId });
  await prisma.delivery.update({ where: { id: d.id }, data: { status: "PICKED_UP", pickedUpAt: new Date() } });
}

export async function completeDelivery(courierId: string, deliveryId: string, pin: string) {
  const d = await ownDelivery(courierId, deliveryId);
  if (d.status !== "PICKED_UP") throw new HttpError(409, "Colete o pedido antes de finalizar", "INVALID_STEP");

  // Só 10 mil códigos possíveis: cada erro fica registrado e, depois de alguns, a corrida trava
  // por um tempo (sem isso dava para chutar todos). A loja pode marcar como entregue no painel.
  const since = new Date(Date.now() - PIN_LOCK_MINUTES * 60_000);
  const wrong = await prisma.auditLog.count({
    where: { action: "delivery.wrong_pin", entityType: "Delivery", entityId: d.id, createdAt: { gte: since } },
  });
  if (wrong >= PIN_MAX_TRIES) {
    throw new HttpError(429, `Muitos códigos errados. Espere ${PIN_LOCK_MINUTES} minutos ou fale com a loja.`, "PIN_LOCKED");
  }
  if (pin !== d.confirmationCode) {
    await prisma.auditLog.create({ data: { actorId: courierId, action: "delivery.wrong_pin", entityType: "Delivery", entityId: d.id } });
    const left = PIN_MAX_TRIES - wrong - 1;
    throw new HttpError(
      422,
      left > 0
        ? `Código incorreto. Peça ao cliente o código de 4 dígitos (${left} ${left === 1 ? "tentativa restante" : "tentativas restantes"}).`
        : `Código incorreto. Espere ${PIN_LOCK_MINUTES} minutos ou fale com a loja.`,
      "WRONG_PIN",
    );
  }
  // transitionOrder também marca a corrida como entregue.
  await transitionOrder({ orderId: d.orderId, to: "DELIVERED", actor: "COURIER", userId: courierId });
}

const PIN_MAX_TRIES = 5;
const PIN_LOCK_MINUTES = 15;
