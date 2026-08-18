"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getCurrentTenantIdClient } from "@/lib/tenant-client";

type Product = { id: string; name: string; price: number; volume: string | null };

const PAYMENT_METHODS = [
  { value: "CASH_ON_DELIVERY", label: "Dinheiro" },
  { value: "PIX_MANUAL", label: "Pix" },
  { value: "CARD_ON_DELIVERY", label: "Cartão" },
];

const WALK_IN_PHONE = "BALCAO";

export default function PedidoRapidoPage() {
  const supabase = createClient();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, price, volume")
      .eq("status", "ACTIVE")
      .order("name")
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      });
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => p.name.toLowerCase().includes(term));
  }, [products, search]);

  function addToCart(productId: string) {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) => {
      const newQty = (prev[productId] ?? 0) + delta;
      const next = { ...prev };
      if (newQty <= 0) {
        delete next[productId];
      } else {
        next[productId] = newQty;
      }
      return next;
    });
  }

  const cartItems = Object.entries(cart).map(([productId, quantity]) => {
    const product = products.find((p) => p.id === productId)!;
    return { product, quantity };
  });

  const total = cartItems.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );

  async function finalizeSale() {
    if (cartItems.length === 0) return;
    setSaving(true);

    const tenantId = await getCurrentTenantIdClient(supabase);
    if (!tenantId) {
      setSaving(false);
      return;
    }

    // Cliente "balcão" genérico — cria se ainda não existir para este tenant.
    let { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone", WALK_IN_PHONE)
      .maybeSingle();

    if (!customer) {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({ tenant_id: tenantId, name: "Cliente balcão", phone: WALK_IN_PHONE })
        .select("id")
        .single();
      customer = newCustomer;
    }

    const { data: order } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        customer_id: customer!.id,
        subtotal: total,
        total,
        payment_status: "CONFIRMED",
        payment_method: paymentMethod,
        order_status: "DELIVERED",
      })
      .select("id")
      .single();

    if (order) {
      await supabase.from("order_items").insert(
        cartItems.map((i) => ({
          tenant_id: tenantId,
          order_id: order.id,
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.product.price,
        }))
      );

      window.open(`/imprimir/pedido/${order.id}`, "_blank");
      setCart({});
    }

    setSaving(false);
  }

  return (
    <div className="flex h-full flex-col md:flex-row md:gap-6">
      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Pedido rápido</h1>
          <button
            onClick={() => router.push("/dashboard/pedidos")}
            className="text-sm text-neutral-400 hover:text-white"
          >
            Voltar pro Kanban
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />

        {loading && <p className="text-sm text-neutral-500">Carregando...</p>}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p.id)}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-left hover:border-emerald-600"
            >
              <p className="text-sm font-medium text-white">{p.name}</p>
              {p.volume && (
                <p className="text-xs text-neutral-500">{p.volume}</p>
              )}
              <p className="mt-1 text-sm text-emerald-400">
                R$ {p.price.toFixed(2)}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 w-full shrink-0 md:mt-0 md:w-80">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="mb-3 text-sm font-medium text-neutral-300">
            Carrinho
          </h2>

          {cartItems.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhum item ainda.</p>
          )}

          <div className="space-y-2">
            {cartItems.map(({ product, quantity }) => (
              <div key={product.id} className="flex items-center justify-between text-sm">
                <span className="text-white">{product.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeQty(product.id, -1)}
                    className="h-6 w-6 rounded border border-neutral-700 text-white hover:bg-neutral-800"
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-neutral-300">
                    {quantity}
                  </span>
                  <button
                    onClick={() => changeQty(product.id, 1)}
                    className="h-6 w-6 rounded border border-neutral-700 text-white hover:bg-neutral-800"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between border-t border-neutral-800 pt-3 text-sm font-medium text-white">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-neutral-400">
              Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={finalizeSale}
            disabled={saving || cartItems.length === 0}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Finalizando..." : "Finalizar venda"}
          </button>
        </div>
      </div>
    </div>
  );
}
