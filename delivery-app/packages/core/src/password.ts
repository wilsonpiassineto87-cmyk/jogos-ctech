// Hash de senha com PBKDF2-SHA256 via Web Crypto: roda igual no Node 20+ e no
// Cloudflare Workers (onde módulos nativos como argon2 não carregam).
// Formato: pbkdf2_sha256$<iterações>$<salt base64>$<hash base64>

// OWASP recomenda 600k; 100k cabe no limite de CPU do plano gratuito do Workers.
// Hashes antigos continuam válidos se o valor aumentar, pois as iterações ficam no próprio hash.
const DEFAULT_ITERATIONS = 100_000;
const KEY_BYTES = 32;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations = DEFAULT_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);
  return `pbkdf2_sha256$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const [scheme, iter, saltB64, hashB64] = stored.split("$");
  const iterations = Number(iter);
  if (scheme !== "pbkdf2_sha256" || !Number.isInteger(iterations) || !saltB64 || !hashB64) return false;

  const expected = fromBase64(hashB64);
  const actual = await derive(password, fromBase64(saltB64), iterations);
  if (actual.length !== expected.length) return false;

  // Comparação em tempo constante.
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!;
  return diff === 0;
}
