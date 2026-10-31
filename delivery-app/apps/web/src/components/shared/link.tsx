import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * Link do app sem pré-carregamento em segundo plano. O next/link baixa de antemão
 * cada página que aparece na tela, e cada uma dessas visitas extras consulta o banco
 * e gasta o limite do plano grátis. A página só é buscada quando a pessoa toca no link.
 */
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
