"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PROOF_SENT: "Comprovante enviado",
  CONFIRMED: "Pago",
  REJECTED: "Rejeitado",
  EXPIRED: "Expirado",
};

export default function ImprimirPedidoPage() {
  const params = useParams();
  const supabase = createClient();
  const [order, setOrder] = useState<any>(null);
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    const id = params.id as string;

    supabase
      .from("orders")
      .select(
        "order_number, subtotal, discount, delivery_fee, total, payment_status, payment_method, notes, created_at, tenant_id, customers(name, phone), order_items(quantity, unit_price, products(name, volume))"
      )
      .eq("id", id)
      .single()
      .then(async ({ data }) => {
        setOrder(data);
        if (data?.tenant_id) {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("name")
            .eq("id", data.tenant_id)
            .single();
          setTenantName(tenant?.name ?? "");
        }
      });
  }, [params.id]);

  useEffect(() => {
    if (order) {
      setTimeout(() => window.print(), 300);
    }
  }, [order]);

  if (!order) {
    return <p className="p-4 text-sm text-neutral-500">Carregando...</p>;
  }

  return (
    <div className="receipt-80mm bg-white p-2 font-mono text-black">
      <div className="mb-2 text-center">
        <p className="text-sm font-bold">{tenantName}</p>
        <p className="text-xs">Pedido #{order.order_number}</p>
        <p className="text-xs">
          {new Date(order.created_at).toLocaleString("pt-BR")}
        </p>
      </div>
      <hr className="my-1 border-dashed border-black" />
      <p className="text-xs">
        Cliente: {order.customers?.name || order.customers?.phone || "—"}
      </p>
      <hr className="my-1 border-dashed border-black" />
      {order.order_items.map((item: any, i: number) => (
        <div key={i} className="mb-1 text-xs">
          <div className="flex justify-between">
            <span>
              {item.quantity}x {item.products?.name}
              {item.products?.volume ? ` (${item.products.volume})` : ""}
            </span>
          </div>
          <div className="flex justify-between text-neutral-700">
            <span>R$ {item.unit_price.toFixed(2)} un.</span>
            <span>R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
          </div>
        </div>
      ))}
      <hr className="my-1 border-dashed border-black" />
      <div className="text-xs">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>R$ {order.subtotal.toFixed(2)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between">
            <span>Desconto</span>
            <span>- R$ {order.discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Entrega</span>
          <span>R$ {order.delivery_fee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>R$ {order.total.toFixed(2)}</span>
        </div>
      </div>
      <hr className="my-1 border-dashed border-black" />
      <p className="text-xs">
        Pagamento: {PAYMENT_LABEL[order.payment_status]}
      </p>
      {order.notes && <p className="text-xs">Obs: {order.notes}</p>}
      <p className="mt-3 text-center text-xs">Obrigado pela preferência!</p>

      <button
        onClick={() => window.print()}
        className="no-print mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
      >
        Imprimir novamente
      </button>
    </div>
  );
}
