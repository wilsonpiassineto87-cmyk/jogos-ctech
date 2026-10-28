// Marcador para telas ainda não implementadas: mostra o que a tela vai fazer.
export function PagePlaceholder({ title, description, todo }: { title: string; description?: string; todo: string[] }) {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      <div className="rounded-xl border border-dashed p-5">
        <p className="mb-2 text-sm font-medium text-muted-foreground">A implementar</p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {todo.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
