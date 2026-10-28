// Espelha o enum OrderStatus do Prisma sem depender dele.
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "REJECTED"
  | "CANCELLED";

export type OrderActor = "CUSTOMER" | "STORE" | "COURIER" | "ADMIN" | "SYSTEM";

type Transition = { to: OrderStatus; by: OrderActor[] };

const TRANSITIONS: Record<OrderStatus, Transition[]> = {
  PENDING_PAYMENT: [
    { to: "PLACED", by: ["SYSTEM"] }, // webhook confirmou o pagamento
    { to: "CANCELLED", by: ["CUSTOMER", "SYSTEM", "ADMIN"] }, // Pix expirou / desistência
  ],
  PLACED: [
    { to: "ACCEPTED", by: ["STORE"] },
    { to: "REJECTED", by: ["STORE"] },
    { to: "CANCELLED", by: ["CUSTOMER", "SYSTEM", "ADMIN"] }, // timeout de aceite
  ],
  ACCEPTED: [
    { to: "PREPARING", by: ["STORE"] },
    { to: "CANCELLED", by: ["ADMIN"] },
  ],
  PREPARING: [
    { to: "READY_FOR_PICKUP", by: ["STORE"] },
    { to: "CANCELLED", by: ["ADMIN"] },
  ],
  READY_FOR_PICKUP: [
    { to: "OUT_FOR_DELIVERY", by: ["COURIER"] },
    { to: "CANCELLED", by: ["ADMIN"] },
  ],
  OUT_FOR_DELIVERY: [
    { to: "DELIVERED", by: ["COURIER", "ADMIN"] },
    { to: "CANCELLED", by: ["ADMIN"] },
  ],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const FINAL_STATUSES: readonly OrderStatus[] = ["DELIVERED", "REJECTED", "CANCELLED"];

export function canTransition(from: OrderStatus, to: OrderStatus, actor: OrderActor): boolean {
  return TRANSITIONS[from].some((t) => t.to === to && t.by.includes(actor));
}

export function nextStatuses(from: OrderStatus, actor: OrderActor): OrderStatus[] {
  return TRANSITIONS[from].filter((t) => t.by.includes(actor)).map((t) => t.to);
}

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus, actor: OrderActor) {
    super(`Transição inválida: ${from} -> ${to} por ${actor}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: OrderStatus, to: OrderStatus, actor: OrderActor): void {
  if (!canTransition(from, to, actor)) throw new InvalidTransitionError(from, to, actor);
}
