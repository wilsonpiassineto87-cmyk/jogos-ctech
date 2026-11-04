import { getStoreTheme } from "@/lib/store";
import { DEFAULT_THEME, parseTheme, themeCss } from "@/lib/theme";

/** Aplica as cores escolhidas no painel (Configurações → Cores da marca). */
export async function StoreTheme() {
  const theme = parseTheme(await getStoreTheme());
  const css = themeCss(theme);
  return (
    <>
      {/* Barra do navegador e do app instalado na cor principal (o React leva a tag para o <head>). */}
      <meta name="theme-color" content={(theme ?? DEFAULT_THEME).primary} />
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
    </>
  );
}
