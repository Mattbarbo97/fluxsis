"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import OrderDetailModal from "@/components/OrderDetailModal";

type Order = {
  id: string;
  order_number: number;
  total: number;
  payment_status: string;
  order_status: string;
  customers: { name: string | null; phone: string } | null;
};

const COLUMNS: { key: string; label: string; accent: string; header: string }[] = [
  { key: "NEW", label: "Novos", accent: "border-t-sky-500", header: "text-sky-400" },
  { key: "AWAITING_PAYMENT", label: "Aguard. pagamento", accent: "border-t-amber-500", header: "text-amber-400" },
  { key: "CONFIRMED", label: "Confirmado", accent: "border-t-indigo-500", header: "text-indigo-400" },
  { key: "PREPARING", label: "Separação", accent: "border-t-purple-500", header: "text-purple-400" },
  { key: "READY", label: "Pronto", accent: "border-t-cyan-500", header: "text-cyan-400" },
  { key: "OUT_FOR_DELIVERY", label: "Em rota", accent: "border-t-orange-500", header: "text-orange-400" },
  { key: "DELIVERED", label: "Entregue", accent: "border-t-emerald-500", header: "text-emerald-400" },
  { key: "CANCELLED", label: "Cancelado", accent: "border-t-red-500", header: "text-red-400" },
];

const PAGE_SIZE = 6;

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PROOF_SENT: "Comprovante enviado",
  CONFIRMED: "Pago",
  REJECTED: "Rejeitado",
  EXPIRED: "Expirado",
};

const PAYMENT_COLOR: Record<string, string> = {
  PENDING: "bg-neutral-800 text-neutral-300",
  PROOF_SENT: "bg-amber-950 text-amber-300",
  CONFIRMED: "bg-emerald-950 text-emerald-300",
  REJECTED: "bg-red-950 text-red-300",
  EXPIRED: "bg-neutral-900 text-neutral-500",
};

export default function KanbanBoard({ orders }: { orders: Order[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState(orders);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({});
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  async function updateStatus(id: string, order_status: string) {
    setSavingId(id);

    const current = rows.find((o) => o.id === id);
    const isCancelling =
      order_status === "CANCELLED" && current?.order_status !== "CANCELLED";

    const { error } = await supabase
      .from("orders")
      .update({ order_status })
      .eq("id", id);

    if (!error) {
      setRows((prev) =>
        prev.map((o) => (o.id === id ? { ...o, order_status } : o))
      );

      // Cancelar um pedido devolve os itens pro estoque.
      if (isCancelling) {
        const { data: order } = await supabase
          .from("orders")
          .select("tenant_id, order_items(product_id, quantity)")
          .eq("id", id)
          .single();

        if (order?.tenant_id) {
          for (const item of (order as any).order_items ?? []) {
            await supabase.rpc("adjust_stock", {
              p_tenant_id: order.tenant_id,
              p_product_id: item.product_id,
              p_delta: item.quantity,
              p_movement_type: "IN",
              p_reference_order_id: id,
            });
          }
        }
      }
    }
    setSavingId(null);
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((o) => {
      const name = (o.customers?.name || o.customers?.phone || "").toLowerCase();
      return name.includes(term) || String(o.order_number).includes(term);
    });
  }, [rows, search]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por cliente ou nº do pedido..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const columnOrders = filteredRows.filter(
            (o) => o.order_status === col.key
          );
          const limit = visibleCount[col.key] ?? PAGE_SIZE;
          const visible = columnOrders.slice(0, limit);
          const hasMore = columnOrders.length > limit;

          return (
            <div key={col.key} className="min-w-0">
              <div
                className={`mb-2 flex items-center justify-between border-t-2 ${col.accent} px-1 pt-2`}
              >
                <h2 className={`text-sm font-medium ${col.header}`}>
                  {col.label}
                </h2>
                <span className="text-xs text-neutral-500">
                  {columnOrders.length}
                </span>
              </div>

              <div className="space-y-2">
                {visible.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => setDetailOrderId(order.id)}
                    className="cursor-pointer rounded-lg border border-neutral-800 bg-neutral-900 p-3 hover:border-neutral-600"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        #{order.order_number}
                      </span>
                      <span className="text-sm text-emerald-400">
                        R$ {order.total.toFixed(2)}
                      </span>
                    </div>
                    <p className="mb-2 truncate text-xs text-neutral-400">
                      {order.customers?.name || order.customers?.phone || "—"}
                    </p>
                    <span
                      className={`mb-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                        PAYMENT_COLOR[order.payment_status]
                      }`}
                    >
                      {PAYMENT_LABEL[order.payment_status]}
                    </span>
                    <select
                      value={order.order_status}
                      disabled={savingId === order.id}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {hasMore && (
                  <button
                    onClick={() =>
                      setVisibleCount((prev) => ({
                        ...prev,
                        [col.key]: limit + PAGE_SIZE,
                      }))
                    }
                    className="w-full rounded-lg border border-dashed border-neutral-700 py-2 text-xs text-neutral-400 hover:border-neutral-500 hover:text-white"
                  >
                    Ver mais ({columnOrders.length - limit})
                  </button>
                )}

                {columnOrders.length === 0 && (
                  <div className="rounded-lg border border-dashed border-neutral-800 p-4 text-center text-xs text-neutral-600">
                    Vazio
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <OrderDetailModal
        orderId={detailOrderId}
        open={detailOrderId !== null}
        onClose={() => setDetailOrderId(null)}
        onUpdated={() => router.refresh()}
      />
    </div>
  );
}
