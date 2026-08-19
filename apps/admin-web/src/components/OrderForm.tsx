"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Customer = { id: string; name: string | null; phone: string };
type Product = { id: string; name: string; price: number; volume: string | null };

type LineItem = {
  productId: string;
  quantity: number;
};

export default function OrderForm({
  tenantId,
  customers,
  products,
  onSuccess,
}: {
  tenantId: string;
  customers: Customer[];
  products: Product[];
  onSuccess?: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [customerId, setCustomerId] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { productId: "", quantity: 1 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function addItem() {
    setItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "quantity" ? Number(value) : value,
            }
          : item
      )
    );
  }

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return sum;
      return sum + product.price * item.quantity;
    }, 0);
  }, [items, products]);

  const total =
    subtotal - (Number(discount) || 0) + (Number(deliveryFee) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (!customerId) {
      setError("Selecione um cliente.");
      return;
    }
    if (validItems.length === 0) {
      setError("Adicione ao menos um produto.");
      return;
    }

    setSaving(true);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        subtotal,
        discount: Number(discount) || 0,
        delivery_fee: Number(deliveryFee) || 0,
        total,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      setError(orderError?.message ?? "Erro ao criar pedido.");
      setSaving(false);
      return;
    }

    const orderItemsPayload = validItems.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        tenant_id: tenantId,
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: product.price,
      };
    });

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsPayload);

    if (itemsError) {
      setError(itemsError.message);
      setSaving(false);
      return;
    }

    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/dashboard/pedidos");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div>
        <label className="mb-1 block text-sm text-neutral-300">
          Cliente *
        </label>
        <select
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
        >
          <option value="">Selecione...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.phone} ({c.phone})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm text-neutral-300">
          Itens do pedido *
        </label>
        <div className="space-y-2">
          {items.map((item, index) => {
            const product = products.find((p) => p.id === item.productId);
            return (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={item.productId}
                  onChange={(e) =>
                    updateItem(index, "productId", e.target.value)
                  }
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione um produto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.volume ? `(${p.volume})` : ""} — R${" "}
                      {p.price.toFixed(2)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(index, "quantity", e.target.value)
                  }
                  className="w-20 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
                <span className="w-20 text-right text-sm text-neutral-400">
                  {product
                    ? `R$ ${(product.price * item.quantity).toFixed(2)}`
                    : "—"}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-neutral-500 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-2 text-sm text-emerald-400 hover:text-emerald-300"
        >
          + Adicionar item
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-neutral-300">
            Taxa de entrega (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-300">
            Desconto (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-neutral-300">
          Observações
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
        />
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm">
        <div className="flex justify-between text-neutral-400">
          <span>Subtotal</span>
          <span>R$ {subtotal.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between font-medium text-white">
          <span>Total</span>
          <span>R$ {total.toFixed(2)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Criar pedido"}
        </button>
        <button
          type="button"
          onClick={() => (onSuccess ? onSuccess() : router.push("/dashboard/pedidos"))}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
