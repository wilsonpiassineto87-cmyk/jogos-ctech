import { guard } from "@/lib/authz";
import { getPrintPreferences, loadReceiptOrder } from "@/lib/receipt";
import { type Paper, parsePaper } from "@/lib/receipt-settings";
import { OrderReceipt } from "@/components/receipt/order-receipt";
import { ReceiptToolbar } from "@/components/receipt/receipt-toolbar";
import "../../receipt.css";

export const metadata = { title: "Imprimir pedido", robots: { index: false } };

// Térmicas: sem margem e sem tamanho fixo, a impressora usa a largura do rolo dela.
const PAGE_CSS: Record<Paper, string> = {
  "58": "@page { margin: 0; }",
  "80": "@page { margin: 0; }",
  a4: "@page { size: A4; margin: 12mm; }",
};

/** Página exclusiva de impressão do comprovante (aberta numa aba nova pelo painel). */
export default async function PrintOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ papel?: string; via?: string; auto?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const order = await guard(() => loadReceiptOrder(id), `/print/order/${id}`);
  const preferences = await getPrintPreferences();
  const paper = parsePaper(query.papel) ?? preferences.paper;
  const copy = query.via === "2";

  return (
    <div className="print-root min-h-dvh bg-muted/60 pb-10">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS[paper] }} />
      <ReceiptToolbar orderId={order.id} code={order.code} paper={paper} copy={copy} autoPrint={query.auto === "1"} />
      <div className={`receipt-sheet receipt-sheet--${paper} mt-4`}>
        <OrderReceipt order={order} paper={paper} copy={copy} />
      </div>
    </div>
  );
}
