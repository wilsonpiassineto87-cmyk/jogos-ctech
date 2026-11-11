import { cn } from "@/lib/utils";

/**
 * Logo da marca: a imagem public/brand/logo.png (fundo transparente, 690×394).
 * O recorte foi feito para fundos claros (branco ou creme): em cima da cor principal,
 * coloque o logo dentro de uma placa clara. O tamanho vem da altura (`h-*`) no className.
 * `name` vira o texto alternativo; sem ele a imagem é só decorativa.
 */
export function Logo({ name, className }: { name?: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo.png"
      width={690}
      height={394}
      alt={name ?? ""}
      aria-hidden={name ? undefined : true}
      decoding="async"
      className={cn("h-10 w-auto shrink-0 object-contain", className)}
    />
  );
}
