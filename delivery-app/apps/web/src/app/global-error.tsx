"use client";

// Último recurso: erro no layout raiz. Precisa do próprio <html>, sem depender do CSS do app.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "4rem 1rem" }}>
        <h1 style={{ fontSize: "1.25rem" }}>Algo deu errado</h1>
        <p style={{ color: "#666" }}>Recarregue a página. Se continuar, tente de novo em alguns minutos.</p>
        {error.digest && <p style={{ color: "#999", fontSize: "0.75rem" }}>Código do erro: {error.digest}</p>}
        <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}>
          Tentar de novo
        </button>
      </body>
    </html>
  );
}
