import type { Bar } from "@/lib/dashboard";

/**
 * Gráfico de barras simples (uma série, cor principal da loja), feito em HTML para não
 * pesar o painel. Passar o dedo/mouse numa barra mostra o valor; a maior barra tem rótulo.
 * "Ver números" abre a mesma informação em tabela.
 */
export function BarChart({
  bars,
  format,
  unit,
  caption,
}: {
  bars: Bar[];
  format: (value: number) => string;
  /** Texto do pedido no tooltip ("3 pedidos"). */
  unit?: (bar: Bar) => string;
  caption: string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 0);
  const peak = max > 0 ? bars.findIndex((b) => b.value === max) : -1;
  // Rótulos do eixo: todos até 14 barras; depois, um a cada poucos para não encavalar.
  const every = bars.length <= 14 ? 1 : Math.ceil(bars.length / 8);

  if (max === 0) {
    return <p className="grid h-40 place-items-center rounded-lg bg-muted/40 text-sm text-muted-foreground">Sem vendas no período.</p>;
  }

  return (
    <figure>
      <div className="relative h-44 pt-6" role="img" aria-label={caption}>
        {/* Linhas de grade discretas: meio e topo. */}
        <div className="pointer-events-none absolute inset-x-0 top-6 border-t border-dashed border-border/70" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-[calc(50%+0.75rem)] border-t border-dashed border-border/70" aria-hidden />
        <div className="relative flex h-full items-end gap-0.5 border-b border-border">
          {bars.map((bar, i) => {
            const height = (bar.value / max) * 100;
            return (
              <div key={bar.key} className="group relative flex h-full min-w-0 flex-1 items-end justify-center" tabIndex={0}>
                {i === peak && (
                  <span className="pointer-events-none absolute -top-5 whitespace-nowrap text-[11px] font-semibold tabular-nums text-foreground group-hover:hidden">
                    {format(bar.value)}
                  </span>
                )}
                <div
                  className="w-full max-w-10 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80 group-focus:opacity-80"
                  style={{ height: `${Math.max(height, bar.value > 0 ? 2 : 0)}%` }}
                />
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden -translate-y-1 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block group-focus:block">
                  <p className="font-semibold">{bar.label}</p>
                  <p className="tabular-nums">{format(bar.value)}</p>
                  {unit && <p className="text-muted-foreground">{unit(bar)}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-0.5 text-[11px] text-muted-foreground" aria-hidden>
        {bars.map((bar, i) => (
          <span key={bar.key} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
            {i % every === 0 ? bar.label : ""}
          </span>
        ))}
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver números</summary>
        <table className="mt-2 w-full tabular-nums">
          <tbody>
            {bars
              .filter((b) => b.value > 0)
              .map((bar) => (
                <tr key={bar.key} className="border-b last:border-0">
                  <td className="py-1">{bar.label}</td>
                  <td className="py-1 text-right">{format(bar.value)}</td>
                  {unit && <td className="py-1 text-right text-muted-foreground">{unit(bar)}</td>}
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
