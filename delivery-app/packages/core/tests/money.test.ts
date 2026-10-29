import { describe, expect, it } from "vitest";
import { centsToInput, parseBRL } from "../src";

describe("parseBRL", () => {
  it("aceita os formatos comuns de preço", () => {
    expect(parseBRL("12,50")).toBe(1250);
    expect(parseBRL("R$ 1.234,5")).toBe(123450);
    expect(parseBRL("12.5")).toBe(1250);
    expect(parseBRL("7")).toBe(700);
  });

  it("rejeita valores inválidos", () => {
    expect(parseBRL("")).toBeNull();
    expect(parseBRL("abc")).toBeNull();
    expect(parseBRL("1,234")).toBeNull();
    expect(parseBRL("-5")).toBeNull();
  });

  it("formata para campo de formulário", () => {
    expect(centsToInput(1250)).toBe("12,50");
  });
});
