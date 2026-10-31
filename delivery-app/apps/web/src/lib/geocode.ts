import "server-only";
import type { LatLng } from "@delivery/core";

/**
 * Coordenadas de um endereço pelo Nominatim (OpenStreetMap), gratuito e sem chave.
 * Política de uso: 1 requisição/s e User-Agent identificável — suficiente para uma loja.
 * TODO: trocar por Mapbox/Google Geocoding se o volume crescer.
 */
export async function geocodeAddress(a: {
  street: string;
  number: string;
  city: string;
  state: string;
  zipCode: string;
}): Promise<LatLng | null> {
  return search({ street: `${a.number} ${a.street}`, city: a.city, state: stateName(a.state), postalcode: a.zipCode });
}

/** Centro da cidade: plano B quando a rua não está no mapa (comum em cidades pequenas). */
export function geocodeCity(city: string, state: string): Promise<LatLng | null> {
  return search({ city, state: stateName(state) });
}

// O mapa entende melhor o nome do estado que a sigla: "SP" às vezes cai na Jaborandi da Bahia.
const STATES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
  ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};
const stateName = (uf: string) => STATES[uf.trim().toUpperCase()] ?? uf;

async function search(query: Record<string, string>): Promise<LatLng | null> {
  const params = new URLSearchParams({ format: "json", limit: "1", countrycodes: "br", ...query });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "delivery-app/1.0 (pedidos online)", "Accept-Language": "pt-BR" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? { latitude: Number(hit.lat), longitude: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}
