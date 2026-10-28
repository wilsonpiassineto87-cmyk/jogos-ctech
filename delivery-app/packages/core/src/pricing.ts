import { applyBps } from "./money";

// O preço SEMPRE é recalculado no servidor a partir do cardápio do banco.
// O cliente envia apenas ids e quantidades.

export type MenuOption = { id: string; name: string; priceCents: number; isAvailable: boolean };
export type MenuOptionGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: MenuOption[];
};
export type MenuProduct = {
  id: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
  optionGroups: MenuOptionGroup[];
};

export type CartLine = { productId: string; quantity: number; optionIds: string[]; notes?: string };

export type PricedLine = {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
  options: { group: string; name: string; priceCents: number }[];
  notes?: string;
};

export type PricingErrorCode =
  | "EMPTY_CART"
  | "INVALID_QUANTITY"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_UNAVAILABLE"
  | "OPTION_NOT_FOUND"
  | "OPTION_UNAVAILABLE"
  | "OPTION_GROUP_MIN"
  | "OPTION_GROUP_MAX"
  | "BELOW_MIN_ORDER"
  | "OUT_OF_DELIVERY_AREA";

export class PricingError extends Error {
  constructor(
    public readonly code: PricingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PricingError";
  }
}

export function priceLine(product: MenuProduct | undefined, line: CartLine): PricedLine {
  if (!product) throw new PricingError("PRODUCT_NOT_FOUND", `Produto ${line.productId} não encontrado`);
  if (!product.isAvailable) throw new PricingError("PRODUCT_UNAVAILABLE", `${product.name} está indisponível`);
  if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) {
    throw new PricingError("INVALID_QUANTITY", `Quantidade inválida para ${product.name}`);
  }

  const selected = new Set(line.optionIds);
  const options: PricedLine["options"] = [];

  for (const group of product.optionGroups) {
    const chosen = group.options.filter((o) => selected.has(o.id));
    chosen.forEach((o) => selected.delete(o.id));

    if (chosen.length < group.minSelect) {
      throw new PricingError("OPTION_GROUP_MIN", `Escolha ao menos ${group.minSelect} em "${group.name}"`);
    }
    if (chosen.length > group.maxSelect) {
      throw new PricingError("OPTION_GROUP_MAX", `Escolha no máximo ${group.maxSelect} em "${group.name}"`);
    }
    for (const o of chosen) {
      if (!o.isAvailable) throw new PricingError("OPTION_UNAVAILABLE", `${o.name} está indisponível`);
      options.push({ group: group.name, name: o.name, priceCents: o.priceCents });
    }
  }

  // Sobrou id que não pertence a nenhum grupo deste produto.
  if (selected.size > 0) throw new PricingError("OPTION_NOT_FOUND", `Complemento inválido para ${product.name}`);

  const unitPriceCents = product.priceCents + options.reduce((sum, o) => sum + o.priceCents, 0);
  return {
    productId: product.id,
    productName: product.name,
    unitPriceCents,
    quantity: line.quantity,
    totalCents: unitPriceCents * line.quantity,
    options,
    notes: line.notes,
  };
}

export type DeliveryFeeRuleInput = {
  city: string | null;
  minDistanceKm: number;
  maxDistanceKm: number;
  baseFeeCents: number;
  feePerKmCents: number;
  priority: number;
};

/**
 * Taxa de entrega cobrada do cliente. Regras da cidade vencem as globais;
 * depois vence a maior `priority`. Retorna null se nenhuma regra cobre a distância.
 */
export function deliveryFeeCents(rules: DeliveryFeeRuleInput[], distanceKm: number, city?: string): number | null {
  const match = rules
    .filter((r) => (r.city === null || r.city === city) && distanceKm >= r.minDistanceKm && distanceKm < r.maxDistanceKm)
    .sort((a, b) => Number(b.city !== null) - Number(a.city !== null) || b.priority - a.priority)[0];

  if (!match) return null;
  return match.baseFeeCents + Math.round((distanceKm - match.minDistanceKm) * match.feePerKmCents);
}

/** Valor repassado ao entregador pela corrida. */
export function courierFeeCents(baseFeeCents: number, feePerKmCents: number, distanceKm: number): number {
  return baseFeeCents + Math.round(distanceKm * feePerKmCents);
}

export type QuoteInput = {
  products: Map<string, MenuProduct>;
  lines: CartLine[];
  minOrderCents: number;
  deliveryFeeCents: number | null;
  serviceFeeCents: number;
  discountCents?: number;
  commissionBps: number;
};

export type Quote = {
  lines: PricedLine[];
  subtotalCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  discountCents: number;
  totalCents: number;
  commissionBps: number;
  /** Comissão da plataforma, calculada sobre o subtotal dos produtos. */
  commissionCents: number;
};

export function quoteOrder(input: QuoteInput): Quote {
  if (input.lines.length === 0) throw new PricingError("EMPTY_CART", "O carrinho está vazio");
  if (input.deliveryFeeCents === null) {
    throw new PricingError("OUT_OF_DELIVERY_AREA", "Endereço fora da área de entrega");
  }

  const lines = input.lines.map((line) => priceLine(input.products.get(line.productId), line));
  const subtotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);

  if (subtotalCents < input.minOrderCents) {
    throw new PricingError("BELOW_MIN_ORDER", "Pedido abaixo do valor mínimo da loja");
  }

  const discountCents = Math.min(input.discountCents ?? 0, subtotalCents);
  const totalCents = subtotalCents - discountCents + input.deliveryFeeCents + input.serviceFeeCents;

  return {
    lines,
    subtotalCents,
    deliveryFeeCents: input.deliveryFeeCents,
    serviceFeeCents: input.serviceFeeCents,
    discountCents,
    totalCents,
    commissionBps: input.commissionBps,
    commissionCents: applyBps(subtotalCents, input.commissionBps),
  };
}
