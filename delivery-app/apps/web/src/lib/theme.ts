import { storeThemeSchema, type StoreTheme } from "@delivery/validators";

// Cores da marca escolhidas no painel. Os tokens padrão ficam em app/globals.css; aqui só
// sobrescrevemos os que dependem da marca (e derivamos tons suaves a partir deles).

export const DEFAULT_THEME: StoreTheme = { primary: "#E0457B", success: "#3FA391", highlight: "#E1AE6A" };

export const THEME_PRESETS: { name: string; theme: StoreTheme }[] = [
  { name: "Morango", theme: DEFAULT_THEME },
  { name: "Chocolate", theme: { primary: "#8B5A3C", success: "#5E9E6B", highlight: "#E1AE6A" } },
  { name: "Açaí", theme: { primary: "#6D2E8C", success: "#4FA36A", highlight: "#F2B84B" } },
  { name: "Limão", theme: { primary: "#2F8F4E", success: "#2A8C80", highlight: "#F4D35E" } },
  { name: "Mirtilo", theme: { primary: "#3B6FD4", success: "#2FA07B", highlight: "#F2B84B" } },
  { name: "Tangerina", theme: { primary: "#E8612C", success: "#3FA391", highlight: "#F4C04E" } },
];

export function parseTheme(value: unknown): StoreTheme | null {
  const parsed = storeThemeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Luminância relativa (WCAG) de uma cor hex "#RRGGBB". */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

const DARK_TEXT = "#2B1B16";

/** Texto branco ou escuro, o que tiver mais contraste (WCAG) sobre a cor. */
export function readableOn(hex: string): string {
  const l = luminance(hex);
  const onWhite = 1.05 / (l + 0.05);
  const onDark = (l + 0.05) / (luminance(DARK_TEXT) + 0.05);
  return onWhite >= onDark ? "#FFFFFF" : DARK_TEXT;
}

/**
 * CSS que aplica a paleta da loja por cima dos tokens padrão. Os valores já passaram
 * pelo schema (só "#RRGGBB"), então não há como injetar CSS por aqui.
 */
export function themeCss(theme: StoreTheme | null): string | null {
  if (!theme) return null;
  const { primary, success, highlight } = theme;
  return `:root{--primary:${primary};--ring:${primary};--primary-foreground:${readableOn(primary)};` +
    `--success:${success};--success-foreground:${readableOn(success)};--cone:${highlight};` +
    `--accent:color-mix(in oklch, ${primary} 10%, white);` +
    `--accent-foreground:color-mix(in oklch, ${primary} 70%, black);` +
    `--secondary:color-mix(in oklch, ${success} 12%, white);` +
    `--secondary-foreground:color-mix(in oklch, ${success} 60%, black);` +
    `--border:color-mix(in oklch, ${primary} 14%, #e7e1d9);--input:color-mix(in oklch, ${primary} 18%, #e2dbd2);}`;
}
