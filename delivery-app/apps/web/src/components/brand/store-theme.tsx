import { getStore } from "@/lib/store";
import { parseTheme, themeCss } from "@/lib/theme";

/** Aplica as cores escolhidas no painel (Configurações → Cores da marca). */
export async function StoreTheme() {
  const store = await getStore();
  const css = themeCss(parseTheme(store.theme));
  return css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null;
}
