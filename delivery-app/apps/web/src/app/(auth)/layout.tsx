import Link from "next/link";
import { getStore } from "@/lib/store";

// Lê o nome da loja no banco: renderiza na hora (o build do Cloudflare não acessa o banco).
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const store = await getStore();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <Link href="/" className="mb-6 text-xl font-bold text-primary">
        {store.name}
      </Link>
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">{children}</div>
    </main>
  );
}
