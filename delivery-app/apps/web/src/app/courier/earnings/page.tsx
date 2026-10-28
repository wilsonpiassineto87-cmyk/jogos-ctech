import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Ganhos" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Ganhos"
      todo={[
        "Ganhos por dia e semana",
        "Repasses (payoutAccountId)",
      ]}
    />
  );
}
