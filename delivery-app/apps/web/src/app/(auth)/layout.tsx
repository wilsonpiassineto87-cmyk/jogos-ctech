import Link from "next/link";
import { getStore } from "@/lib/store";
import { Logo } from "@/components/brand/logo";
import { StoreTheme } from "@/components/brand/store-theme";

// Lê o nome da loja no banco: renderiza na hora (o build do Cloudflare não acessa o banco).
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const store = await getStore();
  return (
    <main className="flex min-h-dvh flex-col">
      <StoreTheme />
      <div className="bg-drip" aria-hidden />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <Link href="/" className="mb-6" aria-label={`${store.name}, página inicial`}>
          <Logo name={store.name} markClassName="size-12" />
        </Link>
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
