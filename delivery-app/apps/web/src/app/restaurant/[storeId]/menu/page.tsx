import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Cardápio" };

export default function StoreMenuPage() {
  return (
    <PagePlaceholder
      title="Cardápio"
      todo={[
        "CRUD de categorias com reordenação (drag and drop)",
        "CRUD de produtos validado com productSchema (@delivery/validators)",
        "Grupos de complementos (mín./máx.) e opções",
        "Upload de imagem via URL pré-assinada",
        "Marcar produto como esgotado; revalidateTag(`menu:${storeId}`) após cada alteração",
      ]}
    />
  );
}
