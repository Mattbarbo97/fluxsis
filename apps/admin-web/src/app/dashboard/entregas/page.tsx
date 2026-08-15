"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getCurrentTenantIdClient } from "@/lib/tenant-client";
import DriverForm from "@/components/DriverForm";

type Driver = { id: string; name: string; phone: string | null; status: string };
type OrderInRoute = {
  id: string;
  order_number: number;
  total: number;
  driver_id: string | null;
  customers: { name: string | null; phone: string } | null;
};

export default function EntregasPage() {
  const supabase = createClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<OrderInRoute[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const tid = await getCurrentTenantIdClient(supabase);
    setTenantId(tid);

    const [{ data: driverData }, { data: orderData }] = await Promise.all([
      supabase
        .from("delivery_drivers")
        .select("id, name, phone, status")
        .order("name", { ascending: true }),
      supabase
        .from("orders")
        .select("id, order_number, total, driver_id, customers(name, phone)")
        .in("order_status", ["READY", "OUT_FOR_DELIVERY"])
        .order("created_at", { ascending: false }),
    ]);

    setDrivers(driverData ?? []);
    setOrders((orderData as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function assignDriver(orderId: string, driverId: string) {
    await supabase
      .from("orders")
      .update({
        driver_id: driverId || null,
        order_status: driverId ? "OUT_FOR_DELIVERY" : "READY",
      })
      .eq("id", orderId);
    load();
  }

  async function toggleDriverStatus(driverId: string, status: string) {
    await supabase
      .from("delivery_drivers")
      .update({ status: status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })
      .eq("id", driverId);
    load();
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Entregas</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Entregadores e pedidos prontos para sair.
      </p>

      <div className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-neutral-300">
          Entregadores
        </h2>
        {tenantId && (
          <div className="mb-4 max-w-lg">
            <DriverForm tenantId={tenantId} onSuccess={load} />
          </div>
        )}

        {drivers.length === 0 && !loading && (
          <p className="text-sm text-neutral-500">
            Nenhum entregador cadastrado ainda.
          </p>
        )}

        {drivers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {drivers.map((d) => (
              <button
                key={d.id}
                onClick={() => toggleDriverStatus(d.id, d.status)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  d.status === "ACTIVE"
                    ? "bg-emerald-950 text-emerald-300"
                    : "bg-neutral-800 text-neutral-500"
                }`}
              >
                {d.name} {d.status === "ACTIVE" ? "● ativo" : "○ inativo"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-300">
          Pedidos prontos / em rota
        </h2>

        {loading && <p className="text-sm text-neutral-500">Carregando...</p>}

        {!loading && orders.length === 0 && (
          <p className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
            Nenhum pedido pronto para entrega no momento.
          </p>
        )}

        {orders.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Entregador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 bg-neutral-950">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 text-white">#{o.order_number}</td>
                    <td className="px-4 py-3 text-neutral-400">
                      {o.customers?.name || o.customers?.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      R$ {o.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={o.driver_id ?? ""}
                        onChange={(e) => assignDriver(o.id, e.target.value)}
                        className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                      >
                        <option value="">Sem entregador</option>
                        {drivers
                          .filter((d) => d.status === "ACTIVE")
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
