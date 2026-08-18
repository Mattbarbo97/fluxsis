"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Modal from "@/components/Modal";

type OrderDetail = {
  id: string;
  tenant_id: string;
  order_number: number;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  payment_status: string;
  payment_method: string | null;
  proof_url: string | null;
  order_status: string;
  customers: { name: string | null; phone: string } | null;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    products: { name: string; volume: string | null } | null;
  }[];
};

const PAYMENT_METHODS = [
  { value: "PIX_MANUAL", label: "Pix (manual)" },
  { value: "CASH_ON_DELIVERY", label: "Dinheiro na entrega" },
  { value: "CARD_ON_DELIVERY", label: "Cartão na entrega" },
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

export default function OrderDetailModal({
  orderId,
  open,
  onClose,
  onUpdated,
}: {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("PIX_MANUAL");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !orderId) return;

    setLoading(true);
    setError(null);

    supabase
      .from("orders")
      .select(
        "id, tenant_id, order_number, subtotal, discount, delivery_fee, total, notes, payment_status, payment_method, proof_url, order_status, customers(name, phone), order_items(id, quantity, unit_price, products(name, volume))"
      )
      .eq("id", orderId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setOrder(data as any);
          setPaymentMethod((data as any)?.payment_method || "PIX_MANUAL");
        }
        setLoading(false);
      });
  }, [open, orderId]);

  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !order) return;

    setUploading(true);
    setError(null);

    const path = `${order.tenant_id}/${order.id}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("proofs")
      .upload(path, file);

    if (uploadError) {
      setError(
        "Erro ao enviar comprovante: " +
          uploadError.message +
          ". Verifique se o bucket 'proofs' foi criado no Supabase."
      );
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("proofs")
      .getPublicUrl(path);

    const newStatus =
      order.payment_status === "PENDING" ? "PROOF_SENT" : order.payment_status;

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        proof_url: publicUrlData.publicUrl,
        payment_status: newStatus,
      })
      .eq("id", order.id);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    setOrder({
      ...order,
      proof_url: publicUrlData.publicUrl,
      payment_status: newStatus,
    });
    setUploading(false);
    onUpdated();
  }

  async function setPaymentStatus(status: string) {
    if (!order) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updatePayload: Record<string, unknown> = {
      payment_status: status,
      payment_method: paymentMethod,
    };
    if (status === "CONFIRMED") {
      updatePayload.confirmed_by = user?.id ?? null;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", order.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    if (status === "CONFIRMED") {
      // audit log (best-effort, não bloqueia o fluxo se falhar)
      await supabase.from("audit_logs").insert({
        tenant_id: order.tenant_id,
        user_id: user?.id ?? null,
        action: "CONFIRM_PAYMENT",
        entity_type: "order",
        entity_id: order.id,
        metadata: { payment_method: paymentMethod },
      });
    }

    setOrder({ ...order, payment_status: status, payment_method: paymentMethod });
    setSaving(false);
    onUpdated();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={order ? `Pedido #${order.order_number}` : "Pedido"}
    >
      {loading && <p className="text-sm text-neutral-400">Carregando...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {order && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-400">Cliente</p>
              <p className="text-white">
                {order.customers?.name || order.customers?.phone || "—"}
              </p>
            </div>
            <button
              onClick={() =>
                window.open(`/imprimir/pedido/${order.id}`, "_blank")
              }
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-white hover:bg-neutral-800"
            >
              🖨️ Imprimir
            </button>
          </div>

          <div className="rounded-lg border border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Qtd</th>
                  <th className="px-3 py-2 font-medium">Preço</th>
                  <th className="px-3 py-2 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {order.order_items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-white">
                      {item.products?.name}{" "}
                      {item.products?.volume && (
                        <span className="text-neutral-500">
                          ({item.products.volume})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-neutral-400">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2 text-neutral-400">
                      R$ {item.unit_price.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-neutral-300">
                      R$ {(item.unit_price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1 rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm">
            <div className="flex justify-between text-neutral-400">
              <span>Subtotal</span>
              <span>R$ {order.subtotal.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-neutral-400">
                <span>Desconto</span>
                <span>- R$ {order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-400">
              <span>Taxa de entrega</span>
              <span>R$ {order.delivery_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-800 pt-1 font-medium text-white">
              <span>Total</span>
              <span>R$ {order.total.toFixed(2)}</span>
            </div>
          </div>

          {order.notes && (
            <p className="text-sm text-neutral-400">
              Obs: <span className="text-neutral-300">{order.notes}</span>
            </p>
          )}

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
            <p className="mb-2 text-sm text-neutral-300">
              Comprovante de pagamento
            </p>
            {order.proof_url && (
              <a
                href={order.proof_url}
                target="_blank"
                rel="noreferrer"
                className="mb-2 block"
              >
                <img
                  src={order.proof_url}
                  alt="Comprovante"
                  className="max-h-40 rounded-lg border border-neutral-700"
                />
              </a>
            )}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleProofUpload}
              disabled={uploading}
              className="block w-full text-xs text-neutral-400 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-xs file:text-white hover:file:bg-neutral-700"
            />
            {uploading && (
              <p className="mt-1 text-xs text-neutral-500">Enviando...</p>
            )}
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-neutral-300">
                Status do pagamento
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  PAYMENT_COLOR[order.payment_status]
                }`}
              >
                {PAYMENT_LABEL[order.payment_status]}
              </span>
            </div>

            <label className="mb-1 block text-sm text-neutral-300">
              Forma de pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPaymentStatus("CONFIRMED")}
                disabled={saving || order.payment_status === "CONFIRMED"}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                Confirmar pagamento
              </button>
              <button
                onClick={() => setPaymentStatus("PROOF_SENT")}
                disabled={saving}
                className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-40"
              >
                Comprovante enviado
              </button>
              <button
                onClick={() => setPaymentStatus("REJECTED")}
                disabled={saving}
                className="rounded-md bg-red-950 px-3 py-1.5 text-sm text-red-300 hover:bg-red-900 disabled:opacity-40"
              >
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
