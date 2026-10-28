export type OpeningHourInput = { dayOfWeek: number; opensAt: string; closesAt: string };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toMinutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Dia da semana (0 = domingo) e minutos desde 00:00 no fuso da loja. */
function localTime(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: WEEKDAYS.indexOf(get("weekday")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/**
 * A loja está dentro do horário de funcionamento?
 * Faixas que viram a madrugada (18:00–02:00) contam no dia em que abriram.
 */
export function isWithinOpeningHours(hours: OpeningHourInput[], timeZone: string, now = new Date()): boolean {
  const { day, minutes } = localTime(now, timeZone);
  const yesterday = (day + 6) % 7;

  return hours.some((h) => {
    const opens = toMinutes(h.opensAt);
    const closes = toMinutes(h.closesAt);
    const overnight = closes <= opens;

    if (h.dayOfWeek === day) return overnight ? minutes >= opens : minutes >= opens && minutes < closes;
    if (h.dayOfWeek === yesterday && overnight) return minutes < closes;
    return false;
  });
}
