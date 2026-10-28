import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, isWithinOpeningHours, nextStatuses } from "../src";

describe("máquina de estados do pedido", () => {
  it("permite o fluxo feliz com o ator certo", () => {
    expect(canTransition("PENDING_PAYMENT", "PLACED", "SYSTEM")).toBe(true);
    expect(canTransition("PLACED", "ACCEPTED", "STORE")).toBe(true);
    expect(canTransition("READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COURIER")).toBe(true);
  });

  it("bloqueia ator errado e estados finais", () => {
    expect(canTransition("PLACED", "ACCEPTED", "CUSTOMER")).toBe(false);
    expect(canTransition("PENDING_PAYMENT", "PLACED", "CUSTOMER")).toBe(false); // só o webhook confirma
    expect(nextStatuses("DELIVERED", "ADMIN")).toEqual([]);
    expect(() => assertTransition("ACCEPTED", "CANCELLED", "CUSTOMER")).toThrow();
  });
});

describe("isWithinOpeningHours", () => {
  const tz = "America/Sao_Paulo"; // UTC-3, sem horário de verão
  const hours = [{ dayOfWeek: 5, opensAt: "18:00", closesAt: "02:00" }]; // sexta

  it("considera faixas que viram a madrugada", () => {
    expect(isWithinOpeningHours(hours, tz, new Date("2026-10-30T22:00:00Z"))).toBe(true); // sex 19:00
    expect(isWithinOpeningHours(hours, tz, new Date("2026-10-31T04:30:00Z"))).toBe(true); // sáb 01:30
    expect(isWithinOpeningHours(hours, tz, new Date("2026-10-31T05:30:00Z"))).toBe(false); // sáb 02:30
    expect(isWithinOpeningHours(hours, tz, new Date("2026-10-30T15:00:00Z"))).toBe(false); // sex 12:00
  });
});
