"use client";

import { formatCents, parseBRL } from "@delivery/core";
import type { AddressFormInput } from "@delivery/validators";
import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createAddressAction, type SavedAddress } from "@/features/addresses/actions";
import { useCart } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";

type Quote = {
  subtotalCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  discountCents: number;
  totalCents: number;
};

type Payment = "CASH" | "CARD_ON_DELIVERY" | "PIX";

export function CheckoutClient({
  storeId,
  storeName,
  addresses: initialAddresses,
  pixEnabled,
}: {
  storeId: string;
  storeName: string;
  addresses: SavedAddress[];
  pixEnabled: boolean;
}) {
  const router = useRouter();
  const cart = useCart();
  const [mounted, setMounted] = useState(false);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressId, setAddressId] = useState(initialAddresses[0]?.id ?? "");
  const [showForm, setShowForm] = useState(initialAddresses.length === 0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment>("CASH");
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  // Mesma chave em novas tentativas do mesmo pedido: o servidor não cria pedido duplicado.
  const idempotencyKey = useRef<string>("");

  useEffect(() => setMounted(true), []);

  const lines = cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, optionIds: i.optionIds, notes: i.notes }));
  const linesKey = JSON.stringify(lines);
  const wrongStore = cart.storeId !== null && cart.storeId !== storeId;

  // Totais oficiais vêm do servidor sempre que o carrinho ou o endereço mudam.
  useEffect(() => {
    if (!mounted || !addressId || cart.items.length === 0 || wrongStore) return;
    idempotencyKey.current = "";
    const controller = new AbortController();
    setQuoteError(null);
    fetch("/api/v1/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, addressId, lines }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Não foi possível calcular o pedido");
        setQuote(body);
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setQuote(null);
        setQuoteError(e.message);
      });
    return () => controller.abort();
    // linesKey resume o carrinho; lines muda de identidade a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, addressId, linesKey, storeId, wrongStore]);

  if (!mounted) return null;

  if (placedOrderId) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Pedido enviado!</h1>
        <p className="mt-2 text-muted-foreground">Abrindo o acompanhamento...</p>
        <Button asChild className="mt-6">
          <Link href={`/orders/${placedOrderId}`}>Acompanhar pedido</Link>
        </Button>
      </section>
    );
  }

  if (cart.items.length === 0 || wrongStore) {
    return (
      <section className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Seu carrinho está vazio</h1>
        <p className="mt-2 text-muted-foreground">Escolha seus itens no cardápio.</p>
        <Button asChild className="mt-6" onClick={() => wrongStore && cart.clear()}>
          <Link href="/">Ver cardápio</Link>
        </Button>
      </section>
    );
  }

  const placeOrder = async () => {
    setError(null);
    const changeForCents = payment === "CASH" && changeFor.trim() ? parseBRL(changeFor) : undefined;
    if (changeForCents === null) return setError("Valor de troco inválido");

    idempotencyKey.current ||= crypto.randomUUID();
    setPlacing(true);
    try {
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey.current },
        body: JSON.stringify({
          storeId,
          addressId,
          lines,
          paymentMethod: payment === "CARD_ON_DELIVERY" ? "DEBIT_CARD" : payment,
          payOnDelivery: payment === "CARD_ON_DELIVERY" || undefined,
          changeForCents,
          customerNotes: notes.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Não foi possível enviar o pedido");
      setPlacedOrderId(body.id);
      cart.clear();
      router.push(`/orders/${body.id}`);
    } catch (e) {
      setError((e as Error).message);
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6 pb-16">
      <h1 className="text-2xl font-bold tracking-tight">Finalizar pedido</h1>

      <section className="rounded-xl border">
        <h2 className="border-b px-4 py-3 font-semibold">{storeName}</h2>
        <ul className="divide-y">
          {cart.items.map((item) => (
            <li key={item.key} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{item.name}</p>
                {item.optionLabels.length > 0 && <p className="text-sm text-muted-foreground">{item.optionLabels.join(", ")}</p>}
                {item.notes && <p className="text-sm text-muted-foreground">Obs.: {item.notes}</p>}
                <p className="mt-1 text-sm">{formatCents(item.unitPriceCents * item.quantity)}</p>
              </div>
              <div className="flex shrink-0 items-center rounded-lg border">
                <button className="p-2" aria-label="Diminuir" onClick={() => cart.setQuantity(item.key, item.quantity - 1)}>
                  {item.quantity === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
                </button>
                <span className="w-6 text-center text-sm tabular-nums">{item.quantity}</span>
                <button className="p-2" aria-label="Aumentar" onClick={() => cart.setQuantity(item.key, item.quantity + 1)}>
                  <Plus className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t px-4 py-3">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            + Adicionar mais itens
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Endereço de entrega</h2>
        {addresses.map((a) => (
          <label key={a.id} className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 has-[:checked]:border-primary">
            <input
              type="radio"
              name="address"
              checked={addressId === a.id}
              onChange={() => setAddressId(a.id)}
              className="mt-1 accent-[var(--primary)]"
            />
            <span className="text-sm">
              {a.label && <span className="font-medium">{a.label} · </span>}
              {a.street}, {a.number}
              {a.complement ? ` – ${a.complement}` : ""}
              <span className="block text-muted-foreground">
                {a.neighborhood}, {a.city}/{a.state}
              </span>
            </span>
          </label>
        ))}
        {showForm ? (
          <AddressForm
            onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
            onSaved={(a) => {
              setAddresses((list) => [a, ...list]);
              setAddressId(a.id);
              setShowForm(false);
            }}
          />
        ) : (
          <Button variant="outline" onClick={() => setShowForm(true)}>
            + Novo endereço
          </Button>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Pagamento</h2>
        <PaymentOption value="CASH" current={payment} onChange={setPayment} title="Dinheiro na entrega" />
        {payment === "CASH" && (
          <input
            value={changeFor}
            onChange={(e) => setChangeFor(e.target.value)}
            inputMode="decimal"
            placeholder="Troco para quanto? (opcional)"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        )}
        <PaymentOption value="CARD_ON_DELIVERY" current={payment} onChange={setPayment} title="Cartão na entrega (maquininha)" />
        {pixEnabled && <PaymentOption value="PIX" current={payment} onChange={setPayment} title="Pix (pague agora)" />}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Observações para a loja</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={280}
          rows={2}
          placeholder="Ex.: interfone quebrado, ligar ao chegar"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </section>

      <section className="space-y-2 rounded-xl border p-4 text-sm">
        {quote ? (
          <>
            <Row label="Subtotal" value={quote.subtotalCents} />
            <Row label="Taxa de entrega" value={quote.deliveryFeeCents} />
            {quote.serviceFeeCents > 0 && <Row label="Taxa de serviço" value={quote.serviceFeeCents} />}
            {quote.discountCents > 0 && <Row label="Desconto" value={-quote.discountCents} />}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCents(quote.totalCents)}</span>
            </div>
          </>
        ) : (
          <p className={quoteError ? "text-destructive" : "text-muted-foreground"}>
            {quoteError ?? (addressId ? "Calculando..." : "Escolha um endereço para ver o total.")}
          </p>
        )}
      </section>

      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <Button size="lg" className="w-full" disabled={!quote || placing} onClick={placeOrder}>
        {placing ? "Enviando..." : quote ? `Fazer pedido · ${formatCents(quote.totalCents)}` : "Fazer pedido"}
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value === 0 ? "Grátis" : formatCents(value)}</span>
    </div>
  );
}

function PaymentOption({
  value,
  current,
  onChange,
  title,
}: {
  value: Payment;
  current: Payment;
  onChange: (p: Payment) => void;
  title: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm has-[:checked]:border-primary">
      <input type="radio" name="payment" checked={current === value} onChange={() => onChange(value)} className="accent-[var(--primary)]" />
      {title}
    </label>
  );
}

const EMPTY_ADDRESS: AddressFormInput = {
  label: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  reference: "",
  isDefault: false,
};

function AddressForm({ onSaved, onCancel }: { onSaved: (a: SavedAddress) => void; onCancel?: () => void }) {
  const [form, setForm] = useState<AddressFormInput>(EMPTY_ADDRESS);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (field: keyof AddressFormInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  // Preenche rua, bairro e cidade pelo CEP (ViaCEP, chamado direto do navegador).
  const lookupZip = async () => {
    const cep = (form.zipCode ?? "").replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) return setError("CEP não encontrado");
      setError(null);
      setForm((f) => ({
        ...f,
        street: data.logradouro || f.street,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }));
    } catch {
      // Sem internet ou ViaCEP fora do ar: o cliente preenche à mão.
    }
  };

  const save = () =>
    startTransition(async () => {
      const result = await createAddressAction({
        ...form,
        label: form.label || undefined,
        complement: form.complement || undefined,
        reference: form.reference || undefined,
      });
      if (result.ok) onSaved(result.data);
      else setError(result.error);
    });

  const input = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="grid grid-cols-2 gap-3">
        <input className={input} placeholder="CEP" inputMode="numeric" value={form.zipCode} onChange={set("zipCode")} onBlur={lookupZip} />
        <input className={input} placeholder="Apelido (Casa, Trabalho)" value={form.label ?? ""} onChange={set("label")} />
      </div>
      <input className={input} placeholder="Rua" value={form.street} onChange={set("street")} />
      <div className="grid grid-cols-3 gap-3">
        <input className={input} placeholder="Número" value={form.number} onChange={set("number")} />
        <input className={`${input} col-span-2`} placeholder="Complemento" value={form.complement ?? ""} onChange={set("complement")} />
      </div>
      <input className={input} placeholder="Bairro" value={form.neighborhood} onChange={set("neighborhood")} />
      <div className="grid grid-cols-3 gap-3">
        <input className={`${input} col-span-2`} placeholder="Cidade" value={form.city} onChange={set("city")} />
        <input className={input} placeholder="UF" maxLength={2} value={form.state} onChange={set("state")} />
      </div>
      <input className={input} placeholder="Ponto de referência (opcional)" value={form.reference ?? ""} onChange={set("reference")} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={pending}>
          {pending ? "Salvando..." : "Salvar endereço"}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
