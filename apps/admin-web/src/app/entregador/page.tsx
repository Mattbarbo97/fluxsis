"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Order = {
  id: string;
  order_number: number;
  total: number;
  payment_status: string;
  notes: string | null;
  customers: { name: string | null; phone: string } | null;
  customer_addresses: {
    street: string | null;
    number: string | null;
    neighborhood: string | null;
    city: string | null;
  } | null;
};

export default function EntregadorPage() {
  const supabase = createClient();
  const router = useRouter();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/entregador/login");
      return;
    }

    const { data: driver } = await supabase
      .from("delivery_drivers")
      .select("id, name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!driver) {
      setLoading(false);
      setDriverId(null);
      return;
    }

    setDriverId(driver.id);
    setDriverName(driver.name);

    const { data: orderData } = await supabase
      .from("orders")
      .select(
        "id, order_number, total, payment_status, notes, customers(name, phone), customer_addresses(street, number, neighborhood, city)"
      )
      .eq("driver_id", driver.id)
      .eq("order_status", "OUT_FOR_DELIVERY")
      .order("created_at", { ascending: true });

    setOrders((orderData as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markDelivered(orderId: string) {
    setBusyId(orderId);
    await supabase
      .from("orders")
      .update({ order_status: "DELIVERED" })
      .eq("id", orderId);
    await load();
    setBusyId(null);
  }

  async function reportProblem(orderId: string) {
    const note = prompt("Descreva o problema:");
    if (!note) return;
    setBusyId(orderId);
    await supabase
      .from("orders")
      .update({ notes: note })
      .eq("id", orderId);
    await load();
    setBusyId(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/entregador/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        Carregando...
      </div>
    );
  }

  if (!driverId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 px-4 text-center text-neutral-400">
        <p>Sua conta não está vinculada a nenhum entregador.</p>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-white"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 pb-10 text-white">
      <div className="flex items-center justify-between border-b border-neutral-800 p-4">
        <div>
          <p className="text-sm text-neutral-400">Olá,</p>
          <p className="font-semibold">{driverName}</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-neutral-400">
          Sair
        </button>
      </div>

      <div className="p-4">
        <p className="mb-3 text-sm text-neutral-400">
          {orders.length} entrega{orders.length !== 1 && "s"} em rota
        </p>

        {orders.length === 0 && (
          <p className="rounded-lg border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
            Nenhuma entrega atribuída no momento.
          </p>
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">#{order.order_number}</span>
                <span className="text-emerald-400">
                  R$ {order.total.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-neutral-300">
                {order.customers?.name || order.customers?.phone}
              </p>
              <p className="text-sm text-neutral-500">
                {order.customers?.phone}
              </p>
              {order.customer_addresses && (
                <p className="mt-1 text-sm text-neutral-400">
                  {order.customer_addresses.street},{" "}
                  {order.customer_addresses.number} —{" "}
                  {order.customer_addresses.neighborhood}
                </p>
              )}
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                  order.payment_status === "CONFIRMED"
                    ? "bg-emerald-950 text-emerald-300"
                    : "bg-amber-950 text-amber-300"
                }`}
              >
                {order.payment_status === "CONFIRMED"
                  ? "Pago"
                  : "Cobrar na entrega"}
              </span>
              {order.notes && (
                <p className="mt-2 text-xs text-amber-400">
                  Obs: {order.notes}
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => markDelivered(order.id)}
                  disabled={busyId === order.id}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Entregue
                </button>
                <button
                  onClick={() => reportProblem(order.id)}
                  disabled={busyId === order.id}
                  className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-950"
                >
                  Problema
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
