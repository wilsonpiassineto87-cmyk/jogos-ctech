import type { Metadata } from "next";
import { headers } from "next/headers";
import { getStore } from "@/lib/store";
import { LogoMark } from "@/components/brand/logo";
import { InstallPanel } from "@/components/pwa/install-panel";

// Link para mandar no WhatsApp: entreg.netlify.app/instalar
export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  // A prévia do WhatsApp precisa de endereços completos (com https://).
  const host = (await headers()).get("host");
  const base = host ? `https://${host}` : undefined;
  const title = `Instale o app da ${store.name}`;
  const description = "Peça sorvetes, açaí e milkshakes direto da tela do seu celular.";
  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      url: base && `${base}/instalar`,
      siteName: store.name,
      locale: "pt_BR",
      type: "website",
      images: base ? [{ url: `${base}/icons/icon-512.png`, width: 512, height: 512, alt: store.name }] : undefined,
    },
  };
}

export default async function InstallPage() {
  const store = await getStore();
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="text-center">
        <LogoMark className="mx-auto size-20 drop-shadow-sm" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Instale o app da {store.name}</h1>
        <p className="mt-2 text-muted-foreground">Peça direto da tela inicial do celular, sem digitar endereço.</p>
      </div>
      <div className="mt-8">
        <InstallPanel appName={store.name} />
      </div>
    </div>
  );
}
