import { NextResponse } from "next/server";
import { apiHandler, HttpError } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { authorizeChannel } from "@/lib/realtime";

type User = Awaited<ReturnType<typeof requireUser>>;

async function canJoin(user: User, channel: string): Promise<boolean> {
  const isMember = (storeId: string) =>
    prisma.storeMember.count({ where: { storeId, userId: user.id } }).then((n) => n > 0);

  if (user.roles.includes("ADMIN")) return true;

  const [, kind, id] = channel.match(/^private-(order|store|courier|region)-(.+)$/) ?? [];
  if (!kind || !id) return false;

  switch (kind) {
    case "order": {
      const order = await prisma.order.findUnique({
        where: { id },
        select: { customerId: true, storeId: true, delivery: { select: { courierId: true } } },
      });
      if (!order) return false;
      return order.customerId === user.id || order.delivery?.courierId === user.id || (await isMember(order.storeId));
    }
    case "store":
      return isMember(id);
    case "courier":
      return id === user.id;
    case "region":
      return user.roles.includes("COURIER");
    default:
      return false;
  }
}

// POST /api/v1/realtime/auth — chamado pelo pusher-js ao assinar um canal privado.
export const POST = apiHandler(async (req) => {
  const user = await requireUser();
  const form = await req.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");

  if (!socketId || !(await canJoin(user, channel))) throw new HttpError(403, "Acesso negado ao canal", "FORBIDDEN");

  const signature = authorizeChannel(socketId, channel);
  if (!signature) throw new HttpError(503, "Tempo real não configurado", "REALTIME_DISABLED");
  return NextResponse.json(signature);
});
