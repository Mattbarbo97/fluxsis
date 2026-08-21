"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getCurrentTenantIdClient } from "@/lib/tenant-client";
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

type CartItem = {
  product: Product;
  quantity: number;
  unitPrice: number;
  notes: string | null;
};

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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");
  const [customerName, setCustomerName] = useState("");
  const [gerarSenha, setGerarSenha] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [compositionProduct, setCompositionProduct] = useState<Product | null>(null);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, price, volume, has_composition, composition_items, stock_quantity")
      .eq("status", "ACTIVE")
      .order("name")
      .then(({ data }) => {
        setProducts((data as any) ?? []);
        setLoading(false);
      });
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => p.name.toLowerCase().includes(term));
  }, [products, search]);

  function addSimple(product: Product) {
    setCart((prev) => {
      const idx = prev.findIndex(
        (i) => i.product.id === product.id && !i.notes
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product, quantity: 1, unitPrice: product.price, notes: null }];
    });
  }

  function confirmComposition(result: { notes: string | null; extraPrice: number }) {
    if (!compositionProduct) return;
    const unitPrice = compositionProduct.price + result.extraPrice;

    setCart((prev) => {
      const idx = prev.findIndex(
        (i) =>
          i.product.id === compositionProduct.id &&
          i.notes === result.notes &&
          i.unitPrice === unitPrice
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        { product: compositionProduct, quantity: 1, unitPrice, notes: result.notes },
      ];
    });
    setCompositionProduct(null);
  }

  function handleProductClick(product: Product) {
    if (product.has_composition && product.composition_items.length > 0) {
      setCompositionProduct(product);
    } else {
      addSimple(product);
    }
  }

  function changeQty(index: number, delta: number) {
    setCart((prev) => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = { ...next[index], quantity: newQty };
      }
      return next;
    });
  }

  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  async function finalizeSale() {
    if (cart.length === 0) return;

    // Soma quantidade por produto (um produto pode aparecer em mais de uma
    // linha do carrinho, com composições diferentes) e valida contra o estoque.
    const totalsByProduct = new Map<string, number>();
    for (const item of cart) {
      totalsByProduct.set(
        item.product.id,
        (totalsByProduct.get(item.product.id) ?? 0) + item.quantity
      );
    }
    for (const [productId, qty] of totalsByProduct) {
      const product = products.find((p) => p.id === productId)!;
      if (qty > product.stock_quantity) {
        alert(
          `Estoque insuficiente de "${product.name}" (disponível: ${product.stock_quantity}).`
        );
        return;
      }
    }

    setSaving(true);

    const tenantId = await getCurrentTenantIdClient(supabase);
    if (!tenantId) {
      setSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    let ticketNumber: number | null = null;
    if (gerarSenha) {
      const { data } = await supabase.rpc("next_ticket_number", {
        p_tenant_id: tenantId,
      });
      ticketNumber = data ?? null;
    }

    const { data: order } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        customer_id: customer!.id,
        customer_display_name: customerName || null,
        ticket_number: ticketNumber,
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
        cart.map((i) => ({
          tenant_id: tenantId,
          order_id: order.id,
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          notes: i.notes,
        }))
      );

      for (const [productId, qty] of totalsByProduct) {
        await supabase.rpc("adjust_stock", {
          p_tenant_id: tenantId,
          p_product_id: productId,
          p_delta: -qty,
          p_movement_type: "OUT",
          p_reference_order_id: order.id,
          p_created_by: user?.id ?? null,
        });
      }

      window.open(`/imprimir/pedido/${order.id}`, "_blank");
      setCart([]);
      setCustomerName("");
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
              onClick={() => handleProductClick(p)}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-left hover:border-emerald-600"
            >
              <p className="text-sm font-medium text-white">{p.name}</p>
              {p.volume && (
                <p className="text-xs text-neutral-500">{p.volume}</p>
              )}
              {p.has_composition && p.composition_items.length > 0 && (
                <p className="text-xs text-amber-400">🍽️ personalizável</p>
              )}
              <p className="text-xs text-neutral-500">
                {p.stock_quantity} em estoque
              </p>
              <p className="mt-1 text-sm text-emerald-400">
                R$ {p.price.toFixed(2)}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 w-full shrink-0 md:mt-0 md:w-96">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="mb-3 text-sm font-medium text-neutral-300">
            Carrinho
          </h2>

          {cart.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhum item ainda.</p>
          )}

          <div className="space-y-2">
            {cart.map((item, index) => (
              <div key={index} className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white">{item.product.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeQty(index, -1)}
                      className="h-6 w-6 rounded border border-neutral-700 text-white hover:bg-neutral-800"
                    >
                      −
                    </button>
                    <span className="w-4 text-center text-neutral-300">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => changeQty(index, 1)}
                      className="h-6 w-6 rounded border border-neutral-700 text-white hover:bg-neutral-800"
                    >
                      +
                    </button>
                  </div>
                </div>
                {item.notes && (
                  <p className="text-xs text-amber-400">{item.notes}</p>
                )}
                {item.unitPrice !== item.product.price && (
                  <p className="text-xs text-neutral-500">
                    R$ {item.unitPrice.toFixed(2)} cada
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between border-t border-neutral-800 pt-3 text-sm font-medium text-white">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-neutral-400">
              Nome do cliente (opcional)
            </label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: João"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={gerarSenha}
              onChange={(e) => setGerarSenha(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
            />
            Gerar senha (imprime via estabelecimento + cliente)
          </label>

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
            disabled={saving || cart.length === 0}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Finalizando..." : "Finalizar venda"}
          </button>
        </div>
      </div>

      <CompositionPicker
        open={compositionProduct !== null}
        productName={compositionProduct?.name ?? ""}
        basePrice={compositionProduct?.price ?? 0}
        items={compositionProduct?.composition_items ?? []}
        onClose={() => setCompositionProduct(null)}
        onConfirm={confirmComposition}
      />
    </div>
  );
}
