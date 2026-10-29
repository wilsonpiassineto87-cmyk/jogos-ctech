import type { OrderStatus } from "@delivery/core";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PLACED: "Aguardando a loja",
  ACCEPTED: "Pedido aceito",
  PREPARING: "Em preparo",
  READY_FOR_PICKUP: "Pronto para entrega",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Entregue",
  REJECTED: "Recusado pela loja",
  CANCELLED: "Cancelado",
};

/** Etapas mostradas na linha do tempo do cliente, na ordem. */
export const ORDER_STEPS: OrderStatus[] = ["PLACED", "ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED"];

export const FINAL_ORDER_STATUSES: OrderStatus[] = ["DELIVERED", "REJECTED", "CANCELLED"];

export const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Dinheiro na entrega",
  DEBIT_CARD: "Cartão",
  CREDIT_CARD: "Cartão",
  PIX: "Pix",
};

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
