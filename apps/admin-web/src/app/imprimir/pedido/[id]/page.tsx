"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PROOF_SENT: "Comprovante enviado",
  CONFIRMED: "Pago",
  REJECTED: "Rejeitado",
  EXPIRED: "Expirado",
};

const FONT_SIZES = {
  normal: { base: "text-xs", title: "text-sm", total: "text-sm", ticket: "text-3xl" },
  grande: { base: "text-sm", title: "text-base", total: "text-lg", ticket: "text-5xl" },
};

function Receipt({
  order,
  tenantName,
  via,
  showValues,
  font,
}: {
  order: any;
  tenantName: string;
  via: "ESTABELECIMENTO" | "CLIENTE" | null;
  showValues: boolean;
  font: typeof FONT_SIZES["normal"];
}) {
  return (
    <div className="bg-white p-2 font-mono text-black">
      <div className="mb-2 text-center">
        <p className={`${font.title} font-bold`}>{tenantName}</p>
        {via && <p className="font-bold">— VIA {via} —</p>}
        <p className={font.base}>Pedido #{order.order_number}</p>
        <p className={font.base}>
          {new Date(order.created_at).toLocaleString("pt-BR")}
        </p>
      </div>

      {order.ticket_number && (
        <div className="my-2 text-center">
          <p className={font.base}>SENHA</p>
          <p className={`${font.ticket} font-bold`}>{order.ticket_number}</p>
        </div>
      )}

      <hr className="my-1 border-dashed border-black" />
      <p className={font.base}>
        Cliente:{" "}
        {order.customer_display_name ||
          order.customers?.name ||
          order.customers?.phone ||
          "—"}
      </p>
      <hr className="my-1 border-dashed border-black" />
      {order.order_items.map((item: any, i: number) => (
        <div key={i} className="mb-1">
          <div className={`flex justify-between ${font.base}`}>
            <span>
              {item.quantity}x {item.products?.name}
              {item.products?.volume ? ` (${item.products.volume})` : ""}
            </span>
          </div>
          {item.notes && (
            <div className={`${font.base} pl-2 text-neutral-700`}>
              {item.notes}
            </div>
          )}
          {showValues && (
            <div className={`flex justify-between ${font.base} text-neutral-700`}>
              <span>R$ {item.unit_price.toFixed(2)} un.</span>
              <span>R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
            </div>
          )}
        </div>
      ))}

      {showValues && (
        <>
          <hr className="my-1 border-dashed border-black" />
          <div className={font.base}>
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
            <div className={`flex justify-between ${font.total} font-bold`}>
              <span>TOTAL</span>
              <span>R$ {order.total.toFixed(2)}</span>
            </div>
          </div>
          <hr className="my-1 border-dashed border-black" />
          <p className={font.base}>
            Pagamento: {PAYMENT_LABEL[order.payment_status]}
          </p>
        </>
      )}

      {order.notes && <p className={font.base}>Obs: {order.notes}</p>}
      <p className={`mt-3 text-center ${font.base}`}>Obrigado pela preferência!</p>
    </div>
  );
}

export default function ImprimirPedidoPage() {
  const params = useParams();
  const supabase = createClient();
  const [order, setOrder] = useState<any>(null);
  const [tenantName, setTenantName] = useState("");
  const [fontSize, setFontSize] = useState<"normal" | "grande">("normal");
  const [activeVia, setActiveVia] = useState<"ESTABELECIMENTO" | "CLIENTE">("CLIENTE");
  const sequencing = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("fluxsis_print_font");
    if (saved === "grande" || saved === "normal") setFontSize(saved);
  }, []);

  function changeFontSize(size: "normal" | "grande") {
    setFontSize(size);
    localStorage.setItem("fluxsis_print_font", size);
  }

  useEffect(() => {
    const id = params.id as string;

    supabase
      .from("orders")
      .select(
        "order_number, subtotal, discount, delivery_fee, total, payment_status, payment_method, notes, created_at, tenant_id, customer_display_name, ticket_number, customers(name, phone), order_items(quantity, unit_price, notes, products(name, volume))"
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

  // Depois de imprimir a via Estabelecimento (dentro da sequência automática),
  // troca pra via Cliente e dispara a segunda impressão sozinho.
  useEffect(() => {
    function handleAfterPrint() {
      if (sequencing.current && activeVia === "ESTABELECIMENTO") {
        sequencing.current = false;
        setActiveVia("CLIENTE");
        setTimeout(() => window.print(), 400);
      }
    }
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [activeVia]);

  if (!order) {
    return <p className="p-4 text-sm text-neutral-500">Carregando...</p>;
  }

  const font = FONT_SIZES[fontSize];
  const hasTicket = Boolean(order.ticket_number);

  function printBothInSequence() {
    sequencing.current = true;
    setActiveVia("ESTABELECIMENTO");
    setTimeout(() => window.print(), 100);
  }

  function printSingle(via: "ESTABELECIMENTO" | "CLIENTE") {
    sequencing.current = false;
    setActiveVia(via);
    setTimeout(() => window.print(), 100);
  }

  return (
    <div>
      <div className="no-print mx-auto mb-4 flex max-w-xs flex-col items-center gap-3 p-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">Fonte:</span>
          <button
            onClick={() => changeFontSize("normal")}
            className={`rounded-md px-3 py-1 text-xs ${
              fontSize === "normal" ? "bg-emerald-600 text-white" : "bg-neutral-800 text-neutral-300"
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => changeFontSize("grande")}
            className={`rounded-md px-3 py-1 text-xs ${
              fontSize === "grande" ? "bg-emerald-600 text-white" : "bg-neutral-800 text-neutral-300"
            }`}
          >
            Grande
          </button>
        </div>

        {hasTicket ? (
          <>
            <button
              onClick={printBothInSequence}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
            >
              Imprimir as 2 vias (sequência)
            </button>
            <div className="flex w-full gap-2">
              <button
                onClick={() => printSingle("ESTABELECIMENTO")}
                className="flex-1 rounded-lg border border-neutral-700 px-3 py-2 text-xs text-white"
              >
                Só estabelecimento
              </button>
              <button
                onClick={() => printSingle("CLIENTE")}
                className="flex-1 rounded-lg border border-neutral-700 px-3 py-2 text-xs text-white"
              >
                Só cliente
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => printSingle("CLIENTE")}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            Imprimir
          </button>
        )}
      </div>

      <div className="receipt-80mm">
        <Receipt
          order={order}
          tenantName={tenantName}
          via={hasTicket ? activeVia : null}
          showValues={hasTicket ? activeVia === "CLIENTE" : true}
          font={font}
        />
      </div>
    </div>
  );
}
