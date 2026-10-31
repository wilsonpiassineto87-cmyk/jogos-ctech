import "server-only";
import { sameCity } from "@delivery/core";
import { cache } from "react";
import { prisma } from "./db";

/** Onde a loja entrega enquanto ninguém salvou outra lista em Configurações. */
export const DEFAULT_SERVED_CITIES = ["Jaborandi"];

/**
 * Cidades onde a loja entrega. Cada cidade salva é uma regra de taxa (DeliveryFeeRule.city);
 * sem nenhuma salva, vale DEFAULT_SERVED_CITIES. Endereço de outra cidade não pede.
 */
export const getServedCities = cache(async (): Promise<string[]> => {
  const rules = await prisma.deliveryFeeRule.findMany({
    where: { isActive: true, city: { not: null } },
    select: { city: true },
    orderBy: { name: "asc" },
  });
  const cities: string[] = [];
  for (const { city } of rules) if (city && !cities.some((c) => sameCity(c, city))) cities.push(city);
  return cities.length > 0 ? cities : DEFAULT_SERVED_CITIES;
});

/** "Jaborandi", "Jaborandi e Colina", "Jaborandi, Colina e Terra Roxa". */
export function joinCities(cities: string[]): string {
  return cities.length <= 1 ? (cities[0] ?? "") : `${cities.slice(0, -1).join(", ")} e ${cities.at(-1)}`;
}

/** Texto digitado no painel ("Jaborandi, Colina") vira lista sem repetição. */
export function parseCityList(raw: string): string[] {
  const cities: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const city = part.replace(/\s+/g, " ").trim();
    if (city && !cities.some((c) => sameCity(c, city))) cities.push(city);
  }
  return cities;
}
