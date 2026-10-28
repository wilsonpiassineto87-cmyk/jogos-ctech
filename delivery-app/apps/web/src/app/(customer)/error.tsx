"use client";

import { Button } from "@/components/ui/button";

export default function CustomerError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Não foi possível carregar esta página</h1>
      <p className="mt-2 text-muted-foreground">
        Em desenvolvimento, confira se o banco está rodando (<code>docker compose up -d</code>) e se as migrations
        foram aplicadas (<code>pnpm db:migrate</code>).
      </p>
      <Button className="mt-6" onClick={reset}>
        Tentar de novo
      </Button>
    </section>
  );
}
