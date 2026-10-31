import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * Link do app sem pré-carregamento em segundo plano. O next/link baixa de antemão
 * cada página que aparece na tela, e no plano grátis do Cloudflare cada uma dessas
 * visitas extras gasta processamento (e às vezes estoura o limite). A página só é
 * buscada quando a pessoa toca no link.
 */
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
