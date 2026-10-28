import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <PagePlaceholder
      title="Checkout"
      todo={[
        "Itens do carrinho (useCart) com edição de quantidade",
        "Seleção/cadastro de endereço com busca por CEP e geocoding",
        "Totais oficiais via POST /api/v1/checkout/quote",
        "Pagamento: Pix (QR code), cartão (Mercado Pago Bricks) ou dinheiro com troco",
        "POST /api/v1/orders com Idempotency-Key (crypto.randomUUID) e redirecionar para /orders/[id]",
      ]}
    />
  );
}
