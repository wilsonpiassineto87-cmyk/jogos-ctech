import { describe, expect, it } from "vitest";
import { deliveryFeeCents, PricingError, quoteOrder, type MenuProduct } from "../src";

const pizza: MenuProduct = {
  id: "pizza",
  name: "Margherita",
  priceCents: 4990,
  isAvailable: true,
  optionGroups: [
    {
      id: "size",
      name: "Tamanho",
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: "m", name: "Média", priceCents: 0, isAvailable: true },
        { id: "g", name: "Grande", priceCents: 1000, isAvailable: true },
      ],
    },
    {
      id: "edge",
      name: "Borda",
      minSelect: 0,
      maxSelect: 1,
      options: [{ id: "catupiry", name: "Catupiry", priceCents: 800, isAvailable: false }],
    },
  ],
};
const products = new Map([[pizza.id, pizza]]);
const base = { products, minOrderCents: 0, deliveryFeeCents: 500, serviceFeeCents: 99, commissionBps: 1200 };

describe("quoteOrder", () => {
  it("soma produto, complementos, taxas e comissão", () => {
    const q = quoteOrder({ ...base, lines: [{ productId: "pizza", quantity: 2, optionIds: ["g"] }] });
    expect(q.lines[0]!.unitPriceCents).toBe(5990);
    expect(q.subtotalCents).toBe(11980);
    expect(q.totalCents).toBe(11980 + 500 + 99);
    expect(q.commissionCents).toBe(1438); // 12% de 119,80
  });

  it("exige o mínimo de opções do grupo", () => {
    expect(() => quoteOrder({ ...base, lines: [{ productId: "pizza", quantity: 1, optionIds: [] }] })).toThrow(
      expect.objectContaining({ code: "OPTION_GROUP_MIN" }),
    );
  });

  it("rejeita complemento de outro produto ou indisponível", () => {
    const run = (optionIds: string[]) => () =>
      quoteOrder({ ...base, lines: [{ productId: "pizza", quantity: 1, optionIds }] });
    expect(run(["m", "xyz"])).toThrow(expect.objectContaining({ code: "OPTION_NOT_FOUND" }));
    expect(run(["m", "catupiry"])).toThrow(expect.objectContaining({ code: "OPTION_UNAVAILABLE" }));
  });

  it("respeita o pedido mínimo e a área de entrega", () => {
    const lines = [{ productId: "pizza", quantity: 1, optionIds: ["m"] }];
    expect(() => quoteOrder({ ...base, lines, minOrderCents: 10_000 })).toThrow(PricingError);
    expect(() => quoteOrder({ ...base, lines, deliveryFeeCents: null })).toThrow(
      expect.objectContaining({ code: "OUT_OF_DELIVERY_AREA" }),
    );
  });
});

describe("deliveryFeeCents", () => {
  const rules = [
    { city: null, minDistanceKm: 0, maxDistanceKm: 3, baseFeeCents: 499, feePerKmCents: 0, priority: 0 },
    { city: null, minDistanceKm: 3, maxDistanceKm: 8, baseFeeCents: 499, feePerKmCents: 150, priority: 0 },
    { city: "Campinas", minDistanceKm: 0, maxDistanceKm: 3, baseFeeCents: 299, feePerKmCents: 0, priority: 0 },
  ];

  it("escolhe a faixa pela distância", () => {
    expect(deliveryFeeCents(rules, 1.2)).toBe(499);
    expect(deliveryFeeCents(rules, 5)).toBe(499 + 300);
    expect(deliveryFeeCents(rules, 12)).toBeNull();
  });

  it("regra da cidade vence a global", () => {
    expect(deliveryFeeCents(rules, 1, "Campinas")).toBe(299);
  });
});
