import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Histórico" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Histórico"
      todo={[
        "Corridas concluídas com valor e distância",
      ]}
    />
  );
}
