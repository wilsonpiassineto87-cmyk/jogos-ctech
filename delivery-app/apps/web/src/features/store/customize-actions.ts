"use server";

import { Prisma } from "@delivery/db";
import { openingHourSchema, storeThemeSchema, type OpeningHourInput } from "@delivery/validators";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { THEME_PRESETS } from "@/lib/theme";
import { failTo, formText, storeMember } from "./member";

// --- Cores da marca --------------------------------------------------------------

async function saveTheme(theme: unknown) {
  const { store, base } = await storeMember("MANAGER");
  const path = `${base}/settings`;
  const parsed = theme === null ? null : storeThemeSchema.safeParse(theme);
  if (parsed && !parsed.success) failTo(path, parsed.error.issues[0]!.message);

  await prisma.store.update({
    where: { id: store.id },
    // DbNull = volta para as cores padrão (globals.css).
    data: { theme: parsed ? parsed.data : Prisma.DbNull },
  });
  revalidatePath("/", "layout");
  redirect(`${path}?saved=cores#cores`);
}

export async function saveThemeAction(form: FormData) {
  await saveTheme({ primary: formText(form, "primary"), success: formText(form, "success"), highlight: formText(form, "highlight") });
}

export async function applyThemePresetAction(name: string) {
  const preset = THEME_PRESETS.find((p) => p.name === name);
  if (preset) await saveTheme(preset.theme);
}

export async function resetThemeAction() {
  await saveTheme(null);
}

// --- Horário de funcionamento ----------------------------------------------------

/** "Sempre aberta" apaga os horários; "seguir horários" grava só os dias marcados. */
export async function saveOpeningHoursAction(form: FormData) {
  const { store, base } = await storeMember("MANAGER");
  const path = `${base}/settings`;
  const mode = formText(form, "mode");

  const hours: OpeningHourInput[] = [];
  if (mode === "schedule") {
    for (let day = 0; day < 7; day++) {
      if (form.get(`open-${day}`) !== "on") continue;
      const parsed = openingHourSchema.safeParse({
        dayOfWeek: day,
        opensAt: formText(form, `opensAt-${day}`),
        closesAt: formText(form, `closesAt-${day}`),
      });
      if (!parsed.success) failTo(path, `${WEEKDAYS[day]}: ${parsed.error.issues[0]!.message}`);
      hours.push(parsed.data);
    }
    if (hours.length === 0) failTo(path, "Marque pelo menos um dia, ou escolha \"Sempre aberta\".");
  }

  await prisma.$transaction([
    prisma.openingHour.deleteMany({ where: { storeId: store.id } }),
    prisma.openingHour.createMany({ data: hours.map((h) => ({ ...h, storeId: store.id })) }),
  ]);
  revalidatePath("/", "layout");
  redirect(`${path}?saved=horarios#horarios`);
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
