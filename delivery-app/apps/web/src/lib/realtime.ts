import "server-only";
import Pusher from "pusher";
import { env } from "./env";

// Abstração do tempo real: trocar Pusher por Ably ou Socket.io muda só este arquivo.
// Sempre publique DEPOIS de a transação no banco ter sido confirmada.

export const channels = {
  order: (orderId: string) => `private-order-${orderId}`,
  store: (storeId: string) => `private-store-${storeId}`,
  courier: (userId: string) => `private-courier-${userId}`,
  region: (geohash5: string) => `private-region-${geohash5}`,
  admin: () => "private-admin",
};

export type RealtimeEvent =
  | "order.new"
  | "order.status_changed"
  | "order.cancelled"
  | "courier.location"
  | "delivery.available"
  | "delivery.taken"
  | "delivery.offer";

let client: Pusher | null | undefined;

function getClient(): Pusher | null {
  if (client !== undefined) return client;
  client =
    env.PUSHER_APP_ID && env.PUSHER_SECRET && env.NEXT_PUBLIC_PUSHER_KEY
      ? new Pusher({
          appId: env.PUSHER_APP_ID,
          key: env.NEXT_PUBLIC_PUSHER_KEY,
          secret: env.PUSHER_SECRET,
          cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
          useTLS: true,
        })
      : null;
  return client;
}

export async function publish(channel: string, event: RealtimeEvent, data: unknown): Promise<void> {
  const pusher = getClient();
  if (!pusher) {
    if (env.NODE_ENV === "development") console.info(`[realtime:off] ${channel} ${event}`);
    return;
  }
  try {
    await pusher.trigger(channel, event, data);
  } catch (error) {
    // Tempo real é "melhor esforço": o estado verdadeiro está no banco.
    console.error("[realtime] falha ao publicar", channel, event, error);
  }
}

/** Assina a inscrição em um canal privado (usado por /api/v1/realtime/auth). */
export function authorizeChannel(socketId: string, channel: string) {
  const pusher = getClient();
  if (!pusher) return null;
  return pusher.authorizeChannel(socketId, channel);
}
