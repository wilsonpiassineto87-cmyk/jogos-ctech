/** Só os dígitos: "(11) 99999-0000" -> "11999990000". */
export const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** CPF válido pelos dígitos verificadores (aceita com ou sem pontuação). */
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

/** Celular/telefone brasileiro com DDD (10 ou 11 dígitos), sem o +55. */
export function isValidBrazilPhone(value: string): boolean {
  const phone = onlyDigits(value).replace(/^55(?=\d{10,11}$)/, "");
  return /^[1-9]{2}9?\d{8}$/.test(phone);
}

/** Normaliza para gravar: só dígitos, sem o código do país. */
export const normalizePhone = (value: string) => onlyDigits(value).replace(/^55(?=\d{10,11}$)/, "");

/** "11999990000" -> "(11) 99999-0000" */
export function formatPhone(value: string): string {
  const p = normalizePhone(value);
  if (p.length === 11) return `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `(${p.slice(0, 2)}) ${p.slice(2, 6)}-${p.slice(6)}`;
  return value;
}

/** "12345678909" -> "***.456.789-**" (para telas administrativas). */
export function maskCPF(value: string): string {
  const cpf = onlyDigits(value);
  return cpf.length === 11 ? `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**` : "***";
}
