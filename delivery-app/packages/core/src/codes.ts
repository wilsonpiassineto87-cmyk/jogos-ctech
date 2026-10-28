// Sem 0/O e 1/I para não confundir ao ditar o código por telefone.
const ORDER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % max;
}

/** Código curto e legível do pedido, ex.: "A7K2Q". Único via constraint no banco. */
export function generateOrderCode(length = 5): string {
  return Array.from({ length }, () => ORDER_CODE_ALPHABET[randomInt(ORDER_CODE_ALPHABET.length)]).join("");
}

/** PIN de 4 dígitos que o cliente informa ao entregador. */
export function generateDeliveryPin(): string {
  return String(randomInt(10_000)).padStart(4, "0");
}
