"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function ImprimirComandaPage() {
  const params = useParams();
  const supabase = createClient();
  const [comanda, setComanda] = useState<any>(null);
  const [table, setTable] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    const id = params.id as string;

    async function load() {
      const { data: comandaData } = await supabase
        .from("comandas")
        .select("people_count, opened_at, table_id, tenant_id")
        .eq("id", id)
        .single();

      setComanda(comandaData);

      if (comandaData?.table_id) {
        const { data: tableData } = await supabase
          .from("tables")
          .select("name")
          .eq("id", comandaData.table_id)
          .single();
        setTable(tableData);
      }

      if (comandaData?.tenant_id) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("name")
          .eq("id", comandaData.tenant_id)
          .single();
        setTenantName(tenant?.name ?? "");
      }

      const { data: itemsData } = await supabase
        .from("comanda_items")
        .select("quantity, unit_price, products(name, volume)")
        .eq("comanda_id", id);
      setItems(itemsData ?? []);

      const { data: paymentsData } = await supabase
        .from("comanda_payments")
        .select("amount, method")
        .eq("comanda_id", id);
      setPayments(paymentsData ?? []);
    }

    load();
  }, [params.id]);

  useEffect(() => {
    if (comanda) {
      setTimeout(() => window.print(), 300);
    }
  }, [comanda]);

  if (!comanda) {
    return <p className="p-4 text-sm text-neutral-500">Carregando...</p>;
  }

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const perPerson = comanda.people_count > 0 ? subtotal / comanda.people_count : subtotal;

  return (
    <div className="receipt-80mm bg-white p-2 font-mono text-black">
      <div className="mb-2 text-center">
        <p className="text-sm font-bold">{tenantName}</p>
        <p className="text-xs">Mesa {table?.name}</p>
        <p className="text-xs">
          {new Date(comanda.opened_at).toLocaleString("pt-BR")}
        </p>
      </div>
      <hr className="my-1 border-dashed border-black" />
      {items.map((item, i) => (
        <div key={i} className="mb-1 text-xs">
          <div className="flex justify-between">
            <span>
              {item.quantity}x {item.products?.name}
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
        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>R$ {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Dividido por {comanda.people_count}</span>
          <span>R$ {perPerson.toFixed(2)}/pessoa</span>
        </div>
        {payments.length > 0 && (
          <>
            <div className="mt-1 flex justify-between">
              <span>Pago</span>
              <span>R$ {totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Restante</span>
              <span>R$ {(subtotal - totalPaid).toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
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
