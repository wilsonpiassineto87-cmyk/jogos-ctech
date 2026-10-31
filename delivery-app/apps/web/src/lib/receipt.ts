import "server-only";
import { cookies } from "next/headers";
import { HttpError } from "./api";
import { requireUser } from "./authz";
import { prisma } from "./db";
import { DEFAULT_PAPER, PAPER_COOKIE, PRINT_ON_ACCEPT_COOKIE, type Paper, parsePaper } from "./receipt-settings";

/** Preferências de impressão deste aparelho (cookies gravados em Configurações). */
export async function getPrintPreferences(): Promise<{ paper: Paper; printOnAccept: boolean }> {
  const jar = await cookies();
  return {
    paper: parsePaper(jar.get(PAPER_COOKIE)?.value) ?? DEFAULT_PAPER,
    printOnAccept: jar.get(PRINT_ON_ACCEPT_COOKIE)?.value === "1",
  };
}

const receiptSelect = {
  id: true,
  code: true,
  status: true,
  storeId: true,
  createdAt: true,
  placedAt: true,
  deliveryAddress: true,
  customerNotes: true,
  subtotalCents: true,
  deliveryFeeCents: true,
  serviceFeeCents: true,
  discountCents: true,
  totalCents: true,
  paymentMethod: true,
  changeForCents: true,
  customer: { select: { name: true, phone: true } },
  store: { select: { name: true, logoUrl: true, phone: true, street: true, number: true, neighborhood: true, city: true, state: true } },
  items: {
    orderBy: { id: "asc" },
    select: { id: true, productName: true, unitPriceCents: true, quantity: true, totalCents: true, options: true, notes: true },
  },
  payments: { orderBy: { createdAt: "desc" }, take: 1, select: { provider: true, status: true } },
} as const;

export type ReceiptOrder = NonNullable<Awaited<ReturnType<typeof findReceiptOrder>>>;

function findReceiptOrder(orderId: string) {
  return prisma.order.findUnique({ where: { id: orderId }, select: receiptSelect });
}

/** Pedido para o comprovante. Só a equipe da loja do pedido ou um administrador podem ver. */
export async function loadReceiptOrder(orderId: string): Promise<ReceiptOrder> {
  const user = await requireUser();
  const order = await findReceiptOrder(orderId);
  // 404 também para quem não tem acesso: não revela se o pedido existe.
  if (!order) throw new HttpError(404, "Pedido não encontrado", "NOT_FOUND");
  if (!user.roles.includes("ADMIN")) {
    const member = await prisma.storeMember.findUnique({
      where: { storeId_userId: { storeId: order.storeId, userId: user.id } },
      select: { role: true },
    });
    if (!member) throw new HttpError(404, "Pedido não encontrado", "NOT_FOUND");
  }
  return order;
}
