import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Minha conta" };

export default function AccountPage() {
  return (
    <PagePlaceholder
      title="Minha conta"
      todo={["Dados pessoais", "Endereços salvos (CRUD em /api/v1/me/addresses)", "Excluir conta (anonimização, LGPD)"]}
    />
  );
}
