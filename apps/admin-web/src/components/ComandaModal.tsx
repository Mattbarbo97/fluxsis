"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import Modal from "@/components/Modal";
import CompositionPicker, {
  CompositionItem,
} from "@/components/CompositionPicker";

type Product = {
  id: string;
  name: string;
  price: number;
  volume: string | null;
  has_composition: boolean;
  composition_items: CompositionItem[];
  stock_quantity: number;
};

type ComandaItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  products: { name: string; volume: string | null } | null;
};

type ComandaPayment = {
  id: string;
  amount: number;
  method: string | null;
};

const PAYMENT_METHODS = [
  { value: "PIX_MANUAL", label: "Pix" },
  { value: "CASH_ON_DELIVERY", label: "Dinheiro" },
  { value: "CARD_ON_DELIVERY", label: "Cartão" },
];

export default function ComandaModal({
  comandaId,
  tableName,
  products,
  open,
  onClose,
  onClosed,
}: {
  comandaId: string | null;
  tableName: string;
  products: Product[];
  open: boolean;
  onClose: () => void;
  onClosed: () => void;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<ComandaItem[]>([]);
  const [payments, setPayments] = useState<ComandaPayment[]>([]);
  const [peopleCount, setPeopleCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newProductId, setNewProductId] = useState("");
  const [newQuantity, setNewQuantity] = useState(1);
  const [compositionProduct, setCompositionProduct] = useState<Product | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX_MANUAL");
  const [busy, setBusy] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  async function load() {
    if (!comandaId) return;
    setLoading(true);

    const [{ data: comanda }, { data: itemsData }, { data: paymentsData }] =
      await Promise.all([
        supabase
          .from("comandas")
          .select("people_count, tenant_id")
          .eq("id", comandaId)
          .single(),
        supabase
          .from("comanda_items")
          .select("id, product_id, quantity, unit_price, notes, products(name, volume)")
          .eq("comanda_id", comandaId),
        supabase
          .from("comanda_payments")
          .select("id, amount, method")
          .eq("comanda_id", comandaId),
      ]);

    setPeopleCount(comanda?.people_count ?? 1);
    setTenantId(comanda?.tenant_id ?? null);
    setItems((itemsData as any) ?? []);
    setPayments(paymentsData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
  }, [open, comandaId]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0),
    [items]
  );
  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );
  const remaining = Math.max(0, Number((subtotal - totalPaid).toFixed(2)));
  const perPerson = peopleCount > 0 ? subtotal / peopleCount : subtotal;
  // Quantas "fatias" de pessoa já foram cobertas pelo total pago até agora.
  const paidShares =
    peopleCount > 1 && perPerson > 0
      ? Math.min(peopleCount, Math.floor((totalPaid + 0.005) / perPerson))
      : 0;

  async function getTenantIdForComanda() {
    if (tenantId) return tenantId;
    const row = await supabase
      .from("comandas")
      .select("tenant_id")
      .eq("id", comandaId)
      .single();
    return row.data?.tenant_id ?? null;
  }

  async function insertItem(
    product: Product,
    quantity: number,
    unitPrice: number,
    notes: string | null
  ) {
    if (!comandaId || !tenantId) return;

    if (quantity > product.stock_quantity) {
      setError(
        `Estoque insuficiente de "${product.name}" (disponível: ${product.stock_quantity}).`
      );
      return;
    }
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setBusy(true);

    const { error: stockError } = await supabase.rpc("adjust_stock", {
      p_tenant_id: tenantId,
      p_product_id: product.id,
      p_delta: -quantity,
      p_movement_type: "OUT",
      p_created_by: user?.id ?? null,
    });

    if (stockError) {
      setError(stockError.message);
      setBusy(false);
      return;
    }

    await supabase.from("comanda_items").insert({
      tenant_id: tenantId,
      comanda_id: comandaId,
      product_id: product.id,
      quantity,
      unit_price: unitPrice,
      notes,
    });
    setNewProductId("");
    setNewQuantity(1);
    await load();
    setBusy(false);
  }

  function addItem() {
    if (!newProductId) return;
    const product = products.find((p) => p.id === newProductId);
    if (!product) return;

    if (product.has_composition && product.composition_items.length > 0) {
      setCompositionProduct(product);
      return;
    }
    insertItem(product, newQuantity, product.price, null);
  }

  function confirmComposition(result: { notes: string | null; extraPrice: number }) {
    if (!compositionProduct) return;
    insertItem(
      compositionProduct,
      newQuantity,
      compositionProduct.price + result.extraPrice,
      result.notes
    );
    setCompositionProduct(null);
  }

  async function removeItem(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item || !tenantId) return;

    setBusy(true);

    await supabase.rpc("adjust_stock", {
      p_tenant_id: tenantId,
      p_product_id: item.product_id,
      p_delta: item.quantity,
      p_movement_type: "IN",
    });

    await supabase.from("comanda_items").delete().eq("id", itemId);
    await load();
    setBusy(false);
  }

  async function changeItemQuantity(itemId: string, delta: number) {
    const item = items.find((i) => i.id === itemId);
    if (!item || !tenantId) return;
    const newQty = item.quantity + delta;

    // delta > 0 (aumentando quantidade) precisa checar disponibilidade.
    if (delta > 0) {
      const product = products.find((p) => p.id === item.product_id);
      if (product && delta > product.stock_quantity) {
        setError(
          `Estoque insuficiente de "${product.name}" (disponível: ${product.stock_quantity}).`
        );
        return;
      }
    }
    setError(null);

    setBusy(true);

    await supabase.rpc("adjust_stock", {
      p_tenant_id: tenantId,
      p_product_id: item.product_id,
      p_delta: -delta,
      p_movement_type: delta > 0 ? "OUT" : "IN",
    });

    if (newQty <= 0) {
      await supabase.from("comanda_items").delete().eq("id", itemId);
    } else {
      await supabase
        .from("comanda_items")
        .update({ quantity: newQty })
        .eq("id", itemId);
    }
    await load();
    setBusy(false);
  }

  async function updatePeopleCount(value: number) {
    if (!comandaId) return;
    setPeopleCount(value);
    await supabase
      .from("comandas")
      .update({ people_count: value })
      .eq("id", comandaId);
  }

  async function addPaymentAmount(amount: number) {
    if (!comandaId || amount <= 0) return;
    setBusy(true);

    const tid = await getTenantIdForComanda();

    await supabase.from("comanda_payments").insert({
      tenant_id: tid,
      comanda_id: comandaId,
      amount: Number(amount.toFixed(2)),
      method: paymentMethod,
    });

    await load();
    setBusy(false);
  }

  async function addPayment() {
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    await addPaymentAmount(Number(paymentAmount));
    setPaymentAmount("");
  }

  // Marca o pagamento do "boneco" de uma pessoa. Só deixa marcar a próxima
  // pessoa ainda não paga, na ordem — evita pular e perder o controle.
  async function payPersonShare(index: number) {
    if (index !== paidShares || busy) return;
    const isLast = index === peopleCount - 1;
    const amount = isLast
      ? Number((subtotal - totalPaid).toFixed(2))
      : Number(perPerson.toFixed(2));
    if (amount <= 0) return;
    await addPaymentAmount(amount);
  }

  async function payFull() {
    if (remaining <= 0) return;
    await addPaymentAmount(remaining);
  }

  async function closeComanda() {
    if (!comandaId) return;
    setBusy(true);
    setError(null);

    const { data: comanda } = await supabase
      .from("comandas")
      .select("table_id, tenant_id")
      .eq("id", comandaId)
      .single();

    await supabase
      .from("comandas")
      .update({ status: "CLOSED", closed_at: new Date().toISOString() })
      .eq("id", comandaId);

    if (comanda?.table_id) {
      // Só libera a mesa se não sobrar nenhuma outra comanda aberta nela
      // (uma mesa pode ter mais de uma comanda simultânea, ex: grupos separados).
      const { count } = await supabase
        .from("comandas")
        .select("id", { count: "exact", head: true })
        .eq("table_id", comanda.table_id)
        .eq("status", "OPEN");

      if (!count || count === 0) {
        await supabase
          .from("tables")
          .update({ status: "FREE" })
          .eq("id", comanda.table_id);
      }
    }

    setBusy(false);
    onClosed();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Comanda — ${tableName}`}>
      {loading && <p className="text-sm text-neutral-400">Carregando...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && (
        <div className="space-y-4">
          {comandaId && (
            <button
              onClick={() =>
                window.open(`/imprimir/comanda/${comandaId}`, "_blank")
              }
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-white hover:bg-neutral-800"
            >
              🖨️ Imprimir conta
            </button>
          )}

          <div className="rounded-lg border border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Qtd</th>
                  <th className="px-3 py-2 font-medium">Subtotal</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-white">
                      {item.products?.name}
                      {item.notes && (
                        <p className="text-[11px] font-normal text-amber-400">
                          {item.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-neutral-400">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => changeItemQuantity(item.id, -1)}
                          disabled={busy}
                          className="h-6 w-6 rounded border border-neutral-700 text-white hover:bg-neutral-800 disabled:opacity-50"
                        >
                          −
                        </button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => changeItemQuantity(item.id, 1)}
                          disabled={busy}
                          className="h-6 w-6 rounded border border-neutral-700 text-white hover:bg-neutral-800 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-neutral-300">
                      R$ {(item.unit_price * item.quantity).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-neutral-500">
                      Nenhum item ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={newProductId}
              onChange={(e) => setNewProductId(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            >
              <option value="">Adicionar produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — R$ {p.price.toFixed(2)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={newQuantity}
              onChange={(e) => setNewQuantity(Number(e.target.value))}
              className="w-16 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
            <button
              onClick={addItem}
              disabled={busy || !newProductId}
              className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              + Item
            </button>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-neutral-400">Subtotal</span>
              <span className="text-white">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-neutral-400">Dividir por</span>
              <input
                type="number"
                min="1"
                value={peopleCount}
                onChange={(e) => updatePeopleCount(Number(e.target.value))}
                className="w-16 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-right text-white outline-none focus:border-emerald-500"
              />
            </div>
            <div className="mb-2 flex items-center justify-between text-neutral-400">
              <span>Valor por pessoa</span>
              <span>R$ {perPerson.toFixed(2)}</span>
            </div>

            {peopleCount > 1 && subtotal > 0 && (
              <div className="mt-2 border-t border-neutral-800 pt-2">
                <p className="mb-1.5 text-xs text-neutral-500">
                  Toca no próximo boneco pra marcar a fatia de R${" "}
                  {perPerson.toFixed(2)} como paga (usa a forma de pagamento
                  selecionada abaixo).
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: peopleCount }).map((_, i) => {
                    const isPaid = i < paidShares;
                    const isNext = i === paidShares;
                    return (
                      <button
                        key={i}
                        onClick={() => payPersonShare(i)}
                        disabled={busy || !isNext}
                        title={
                          isPaid
                            ? "Pago"
                            : isNext
                            ? `Marcar pagamento de R$ ${perPerson.toFixed(2)}`
                            : "Aguardando os anteriores"
                        }
                        className={`flex h-10 w-10 items-center justify-center rounded-full border text-base transition-colors ${
                          isPaid
                            ? "border-emerald-600 bg-emerald-900/40 text-emerald-300"
                            : isNext
                            ? "border-amber-500 text-amber-300 hover:bg-amber-950/40"
                            : "cursor-not-allowed border-neutral-800 text-neutral-600"
                        }`}
                      >
                        {isPaid ? "✓" : "🧍"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
            <p className="mb-2 text-sm text-neutral-300">Pagamentos</p>
            <ul className="mb-2 space-y-1 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex justify-between text-neutral-400">
                  <span>
                    {PAYMENT_METHODS.find((m) => m.value === p.method)?.label ||
                      p.method}
                  </span>
                  <span className="text-emerald-400">
                    R$ {p.amount.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Valor"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-28 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
              />
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                onClick={addPayment}
                disabled={busy || !paymentAmount}
                className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                + Pagamento
              </button>
              <button
                onClick={payFull}
                disabled={busy || remaining <= 0}
                className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                Pagar tudo (R$ {remaining.toFixed(2)})
              </button>
            </div>

            <div className="mt-3 flex justify-between border-t border-neutral-800 pt-2 text-sm">
              <span className="text-neutral-400">Restante</span>
              <span
                className={remaining > 0 ? "text-amber-400" : "text-emerald-400"}
              >
                R$ {remaining.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={closeComanda}
            disabled={busy}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {remaining > 0 ? "Fechar comanda mesmo assim" : "Fechar comanda"}
          </button>
        </div>
      )}

      <CompositionPicker
        open={compositionProduct !== null}
        productName={compositionProduct?.name ?? ""}
        basePrice={compositionProduct?.price ?? 0}
        items={compositionProduct?.composition_items ?? []}
        confirmLabel="Adicionar"
        onClose={() => setCompositionProduct(null)}
        onConfirm={confirmComposition}
      />
    </Modal>
  );
}
