"use client";

import Link from "@/components/shared/link";
import { Button } from "@/components/ui/button";

// Tela de erro dos portais (loja, entregador, admin, login), no lugar do "Application error".
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Algo deu errado nesta tela</h1>
      <p className="mt-2 text-muted-foreground">
        Tente de novo. Se continuar acontecendo, recarregue a página ou volte ao início.
      </p>
      {error.digest && <p className="mt-2 text-xs text-muted-foreground">Código do erro: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Tentar de novo</Button>
        <Button asChild variant="outline">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </section>
  );
}
