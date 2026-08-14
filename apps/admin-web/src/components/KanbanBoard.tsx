"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

type Order = {
  id: string;
  order_number: number;
  total: number;
  payment_status: string;
  order_status: string;
  customers: { name: string | null; phone: string } | null;
};

const COLUMNS: { key: string; label: string }[] = [
  { key: "NEW", label: "Novos" },
  { key: "AWAITING_PAYMENT", label: "Aguard. pagamento" },
  { key: "CONFIRMED", label: "Confirmado" },
  { key: "PREPARING", label: "Separação" },
  { key: "READY", label: "Pronto" },
  { key: "OUT_FOR_DELIVERY", label: "Em rota" },
  { key: "DELIVERED", label: "Entregue" },
  { key: "CANCELLED", label: "Cancelado" },
];

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
  const [rows, setRows] = useState(orders);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updateStatus(id: string, order_status: string) {
    setSavingId(id);
    const { error } = await supabase
      .from("orders")
      .update({ order_status })
      .eq("id", id);

    if (!error) {
      setRows((prev) =>
        prev.map((o) => (o.id === id ? { ...o, order_status } : o))
      );
    }
    setSavingId(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const columnOrders = rows.filter((o) => o.order_status === col.key);
        return (
          <div key={col.key} className="w-72 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-medium text-neutral-300">
                {col.label}
              </h2>
              <span className="text-xs text-neutral-500">
                {columnOrders.length}
              </span>
            </div>

            <div className="space-y-2">
              {columnOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      #{order.order_number}
                    </span>
                    <span className="text-sm text-emerald-400">
                      R$ {order.total.toFixed(2)}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-neutral-400">
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
  );
}
