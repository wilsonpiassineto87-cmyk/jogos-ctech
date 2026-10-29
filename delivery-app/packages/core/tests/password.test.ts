import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src";

describe("hash de senha", () => {
  it("verifica a senha certa e rejeita a errada", async () => {
    const stored = await hashPassword("senha-forte-123", 1_000);
    expect(stored).toMatch(/^pbkdf2_sha256\$1000\$/);
    expect(await verifyPassword(stored, "senha-forte-123")).toBe(true);
    expect(await verifyPassword(stored, "senha-errada")).toBe(false);
  });

  it("usa salt aleatório e rejeita formatos desconhecidos", async () => {
    expect(await hashPassword("x", 1_000)).not.toBe(await hashPassword("x", 1_000));
    expect(await verifyPassword("$argon2id$v=19$m=19456,t=2,p=1$abc$def", "x")).toBe(false);
  });
});
