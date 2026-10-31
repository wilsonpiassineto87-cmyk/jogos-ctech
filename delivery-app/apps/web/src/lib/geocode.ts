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
  return search({ street: `${a.number} ${a.street}`, city: a.city, state: a.state, postalcode: a.zipCode });
}

/** Centro da cidade: plano B quando a rua não está no mapa (comum em cidades pequenas). */
export function geocodeCity(city: string, state: string): Promise<LatLng | null> {
  return search({ city, state });
}

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
