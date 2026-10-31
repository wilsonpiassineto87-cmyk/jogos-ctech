import { formatCents, formatPhone } from "@delivery/core";
import { LogoMark } from "@/components/brand/logo";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/order-status";
import type { ReceiptOrder } from "@/lib/receipt";
import type { Paper } from "@/lib/receipt-settings";

type Address = {
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city?: string;
  state?: string;
  zipCode?: string;
  reference?: string | null;
};
type ItemOption = { group?: string; name: string; priceCents: number };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatZip(zip: string) {
  const digits = zip.replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : zip;
}

/**
 * Comprovante do pedido no estilo de cupom de lanchonete. Só texto preto em fundo branco
 * (impressoras térmicas não imprimem cor nem fundo); o tamanho vem da classe do papel.
 */
export function OrderReceipt({ order, paper, copy }: { order: ReceiptOrder; paper: Paper; copy: boolean }) {
  const address = order.deliveryAddress as Address;
  const paidOnline = (order.payments[0]?.provider ?? "OFFLINE") !== "OFFLINE";
  const change = order.paymentMethod === "CASH" && order.changeForCents ? order.changeForCents - order.totalCents : null;
  const placedAt = order.placedAt ?? order.createdAt;
  const storeAddress = [`${order.store.street}, ${order.store.number}`, order.store.neighborhood, `${order.store.city}/${order.store.state}`];

  return (
    <article className={`receipt receipt--${paper}`} aria-label={`Comprovante do pedido ${order.code}`}>
      <header className="receipt-center">
        {order.store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={order.store.logoUrl} alt="" className="receipt-logo" />
        ) : (
          <LogoMark className="receipt-logo" />
        )}
        <p className="receipt-store">{order.store.name}</p>
        <p className="receipt-small">{storeAddress.join(" · ")}</p>
        {order.store.phone && <p className="receipt-small">Tel.: {formatPhone(order.store.phone)}</p>}
      </header>

      {copy && <p className="receipt-copy">2ª VIA</p>}

      <hr className="receipt-rule receipt-rule--strong" />
      <div className="receipt-center">
        <p className="receipt-label">PEDIDO</p>
        <p className="receipt-code">#{order.code}</p>
        <p>{dateTime.format(placedAt)}</p>
        {order.status !== "PLACED" && <p className="receipt-small">Situação: {ORDER_STATUS_LABEL[order.status]}</p>}
      </div>

      <hr className="receipt-rule" />
      <section>
        <p className="receipt-label">CLIENTE</p>
        <p className="receipt-strong">{order.customer.name}</p>
        {order.customer.phone && <p>Tel.: {formatPhone(order.customer.phone)}</p>}
      </section>

      <section className="receipt-gap">
        <p className="receipt-label">ENTREGA</p>
        <p className="receipt-strong">
          {address.street}, {address.number}
          {address.complement ? ` – ${address.complement}` : ""}
        </p>
        <p>
          {address.neighborhood}
          {address.city ? ` · ${address.city}/${address.state ?? ""}` : ""}
        </p>
        {address.zipCode && <p>CEP {formatZip(address.zipCode)}</p>}
        {address.reference && <p>Ref.: {address.reference}</p>}
      </section>

      <hr className="receipt-rule" />
      <div className="receipt-row receipt-head">
        <span>ITEM</span>
        <span>VALOR</span>
      </div>
      <ul className="receipt-items">
        {order.items.map((item) => {
          const options = (item.options as ItemOption[] | null) ?? [];
          return (
            <li key={item.id} className="receipt-item">
              <div className="receipt-row">
                <span className="receipt-strong">
                  {item.quantity}x {item.productName}
                </span>
                <span className="receipt-money">{formatCents(item.totalCents)}</span>
              </div>
              {item.quantity > 1 && <p className="receipt-small">{formatCents(item.unitPriceCents)} cada</p>}
              {options.length > 0 && (
                <ul className="receipt-options">
                  {options.map((option, index) => (
                    <li key={index} className="receipt-row">
                      <span>+ {option.name}</span>
                      {option.priceCents > 0 && <span className="receipt-money">{formatCents(option.priceCents)}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {item.notes && <p className="receipt-note">OBS: {item.notes}</p>}
            </li>
          );
        })}
      </ul>

      {order.customerNotes && (
        <>
          <hr className="receipt-rule" />
          <p className="receipt-label">OBSERVAÇÕES DO CLIENTE</p>
          <p className="receipt-note">{order.customerNotes}</p>
        </>
      )}

      <hr className="receipt-rule" />
      <div className="receipt-row">
        <span>Subtotal</span>
        <span className="receipt-money">{formatCents(order.subtotalCents)}</span>
      </div>
      <div className="receipt-row">
        <span>Taxa de entrega</span>
        <span className="receipt-money">{order.deliveryFeeCents > 0 ? formatCents(order.deliveryFeeCents) : "Grátis"}</span>
      </div>
      {order.serviceFeeCents > 0 && (
        <div className="receipt-row">
          <span>Taxa de serviço</span>
          <span className="receipt-money">{formatCents(order.serviceFeeCents)}</span>
        </div>
      )}
      {order.discountCents > 0 && (
        <div className="receipt-row">
          <span>Desconto</span>
          <span className="receipt-money">- {formatCents(order.discountCents)}</span>
        </div>
      )}
      <div className="receipt-total receipt-row">
        <span>TOTAL</span>
        <span className="receipt-money">{formatCents(order.totalCents)}</span>
      </div>

      <section className="receipt-gap">
        <p className="receipt-label">PAGAMENTO</p>
        <p className="receipt-strong">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
        <p className="receipt-pay">{paidOnline ? "JÁ PAGO ONLINE" : `COBRAR NA ENTREGA: ${formatCents(order.totalCents)}`}</p>
        {order.paymentMethod === "CASH" &&
          (change !== null && change > 0 ? (
            <>
              <div className="receipt-row">
                <span>Troco para</span>
                <span className="receipt-money">{formatCents(order.changeForCents!)}</span>
              </div>
              <div className="receipt-row receipt-strong">
                <span>Levar de troco</span>
                <span className="receipt-money">{formatCents(change)}</span>
              </div>
            </>
          ) : (
            <p>Não precisa de troco</p>
          ))}
      </section>

      <hr className="receipt-rule receipt-rule--strong" />
      <footer className="receipt-center receipt-small">
        <p>Pedido feito pelo app · Obrigado pela preferência!</p>
        <p>Impresso em {dateTime.format(new Date())}</p>
      </footer>
    </article>
  );
}
