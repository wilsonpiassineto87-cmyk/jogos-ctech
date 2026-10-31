import { describe, expect, it } from "vitest";
import { formatPhone, isValidBrazilPhone, isValidCPF, maskCPF, normalizePhone, whatsappLink } from "../src";

describe("CPF", () => {
  it("aceita CPFs válidos com ou sem pontuação", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
  });

  it("rejeita dígito verificador errado, sequências e tamanho errado", () => {
    expect(isValidCPF("529.982.247-24")).toBe(false);
    expect(isValidCPF("111.111.111-11")).toBe(false);
    expect(isValidCPF("1234567890")).toBe(false);
  });

  it("mascara para exibição", () => {
    expect(maskCPF("52998224725")).toBe("***.982.247-**");
  });
});

describe("telefone", () => {
  it("valida celular e fixo com DDD, com ou sem +55", () => {
    expect(isValidBrazilPhone("(11) 99999-0000")).toBe(true);
    expect(isValidBrazilPhone("+55 11 3333-4444")).toBe(true);
    expect(isValidBrazilPhone("9999-0000")).toBe(false);
    expect(isValidBrazilPhone("(01) 99999-0000")).toBe(false);
  });

  it("normaliza e formata", () => {
    expect(normalizePhone("+55 (11) 99999-0000")).toBe("11999990000");
    expect(formatPhone("11999990000")).toBe("(11) 99999-0000");
  });
});

describe("WhatsApp", () => {
  it("monta o link wa.me com o 55 e a mensagem codificada", () => {
    expect(whatsappLink("(11) 99999-0000")).toBe("https://wa.me/5511999990000");
    expect(whatsappLink("+55 11 99999-0000", "Olá! Pedido #A1")).toBe(
      "https://wa.me/5511999990000?text=Ol%C3%A1!%20Pedido%20%23A1",
    );
  });

  it("devolve nulo sem telefone válido", () => {
    expect(whatsappLink(null)).toBeNull();
    expect(whatsappLink("123")).toBeNull();
  });
});
