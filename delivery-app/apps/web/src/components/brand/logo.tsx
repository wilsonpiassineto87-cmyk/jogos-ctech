import { cn } from "@/lib/utils";

/** Símbolo da marca: casquinha com duas bolas (menta e morango) e uma cereja. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-9 shrink-0", className)} role={title ? "img" : undefined} aria-hidden={!title}>
      {title && <title>{title}</title>}
      {/* casquinha */}
      <path d="M19 33 L32 62 L45 33 Z" fill="var(--cone)" />
      <g stroke="oklch(0.62 0.1 60)" strokeWidth="1.3" strokeLinecap="round">
        <line x1="23.5" y1="33" x2="37.5" y2="50" />
        <line x1="30" y1="33" x2="40.5" y2="45" />
        <line x1="36.5" y1="33" x2="42.6" y2="40" />
        <line x1="40.5" y1="33" x2="26.5" y2="50" />
        <line x1="34" y1="33" x2="23.5" y2="45" />
        <line x1="27.5" y1="33" x2="21.4" y2="40" />
      </g>
      {/* bola de menta, com a borda "escorrendo" sobre a casquinha */}
      <path
        d="M17 33 C17 23 23 18 32 18 C41 18 47 23 47 33 C45 36 43 33 41 35.5 C39 38 37 34 35 36 C33 38 31 34 29 36 C27 38 25 34 23 35.5 C21 37 19 34 17 33 Z"
        fill="var(--success)"
      />
      {/* bola de morango */}
      <circle cx="32" cy="17" r="11" fill="var(--primary)" />
      <ellipse cx="27.5" cy="13" rx="3" ry="2" fill="oklch(1 0 0 / 0.35)" transform="rotate(-30 27.5 13)" />
      {/* cereja */}
      <path d="M33.5 6.5 C34.5 3.5 37 2 39.5 2" stroke="oklch(0.45 0.08 140)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="33" cy="7.5" r="3.4" fill="oklch(0.5 0.2 20)" />
    </svg>
  );
}

/** Logo completo: símbolo + nome da loja na fonte da marca. */
export function Logo({ name, className, markClassName }: { name: string; className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="min-w-0 truncate font-display text-lg font-semibold tracking-tight sm:text-xl">{name}</span>
    </span>
  );
}
