// Textos de horário de funcionamento para o cliente (página inicial e rodapé).

type Hours = { dayOfWeek: number; opensAt: string; closesAt: string }[];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "14:00–22:00" (ou vários turnos separados por " · "); null = não abre nesse dia. */
function dayText(hours: Hours, dayOfWeek: number): string | null {
  const slots = hours
    .filter((h) => h.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.opensAt.localeCompare(b.opensAt))
    .map((h) => `${h.opensAt}–${h.closesAt}`);
  return slots.length > 0 ? slots.join(" · ") : null;
}

/** Horário de hoje no fuso da loja; null = fechado hoje. */
export function todayHours(hours: Hours, timezone: string): string | null {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: timezone }).format(new Date());
  return dayText(hours, EN_WEEKDAYS.indexOf(weekday));
}

/** Semana de segunda a domingo, juntando dias seguidos com o mesmo horário ("Seg a Sex"). */
export function weekHours(hours: Hours): { days: string; text: string }[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows: { first: number; last: number; text: string }[] = [];
  for (const day of order) {
    const text = dayText(hours, day) ?? "Fechado";
    const previous = rows.at(-1);
    if (previous && previous.text === text) previous.last = day;
    else rows.push({ first: day, last: day, text });
  }
  return rows.map(({ first, last, text }) => ({
    days: first === last ? WEEKDAYS[first]! : `${WEEKDAYS[first]} a ${WEEKDAYS[last]}`,
    text,
  }));
}
