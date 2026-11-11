import Link from "@/components/shared/link";
import { getStore } from "@/lib/store";
import { Logo } from "@/components/brand/logo";
import { StoreTheme } from "@/components/brand/store-theme";

// Lê o nome da loja no banco: renderiza na hora (o build não acessa o banco).
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const store = await getStore();
  return (
    <main className="relative isolate flex min-h-dvh flex-col">
      <StoreTheme />
      <div className="bg-brand absolute inset-x-0 top-0 -z-10 h-56" aria-hidden />
      <div className="flex flex-1 flex-col items-center px-4 pt-10 pb-10 sm:pt-14">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg sm:p-8">
          {/* O logo fica dentro do cartão branco (ele foi feito para fundo claro). */}
          <Link href="/" className="mx-auto mb-6 block w-fit" aria-label={`${store.name}, página inicial`}>
            <Logo name={store.name} className="h-20" />
          </Link>
          {children}
        </div>
      </div>
    </main>
  );
}
