import "server-only";

// Cache curto em memória (por isolate do Worker / processo do Node) para dados públicos
// que mudam pouco. Só guarda dados simples, nunca conexões ou objetos de I/O.
const entries = new Map<string, { expires: number; value: Promise<unknown> }>();

export function memo<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = entries.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as Promise<T>;

  const value = load();
  entries.set(key, { expires: Date.now() + ttlMs, value });
  // Falhou: não guarda o erro, a próxima visita tenta de novo.
  value.catch(() => entries.delete(key));
  return value;
}

/** Apaga uma entrada (neste isolate) para a próxima leitura ir ao banco. */
export function forget(key: string) {
  entries.delete(key);
}
