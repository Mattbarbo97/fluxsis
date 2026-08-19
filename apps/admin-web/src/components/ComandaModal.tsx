"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import Modal from "@/components/Modal";

type Product = { id: string; name: string; price: number; volume: string | null; stock_quantity: number };

type ComandaItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
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
          .select("id, product_id, quantity, unit_price, products(name, volume)")
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
  const remaining = subtotal - totalPaid;
  const perPerson = peopleCount > 0 ? subtotal / peopleCount : subtotal;

  async function addItem() {
    if (!comandaId || !newProductId || !tenantId) return;
    const product = products.find((p) => p.id === newProductId);
    if (!product) return;

    if (newQuantity > product.stock_quantity) {
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
      p_delta: -newQuantity,
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
      quantity: newQuantity,
      unit_price: product.price,
    });
    setNewProductId("");
    setNewQuantity(1);
    await load();
    setBusy(false);
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

  async function addPayment() {
    if (!comandaId || !paymentAmount || Number(paymentAmount) <= 0) return;
    setBusy(true);

    const tenantRow = await supabase
      .from("comandas")
      .select("tenant_id")
      .eq("id", comandaId)
      .single();

    await supabase.from("comanda_payments").insert({
      tenant_id: tenantRow.data?.tenant_id,
      comanda_id: comandaId,
      amount: Number(paymentAmount),
      method: paymentMethod,
    });

    setPaymentAmount("");
    await load();
    setBusy(false);
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
      await supabase
        .from("tables")
        .update({ status: "FREE" })
        .eq("id", comanda.table_id);
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
            <div className="flex items-center justify-between text-neutral-400">
              <span>Valor por pessoa</span>
              <span>R$ {perPerson.toFixed(2)}</span>
            </div>
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
            <div className="flex items-center gap-2">
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
    </Modal>
  );
}
