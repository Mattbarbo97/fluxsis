import { createClient } from "@/lib/supabase-server";
import { getCurrentTenantId } from "@/lib/tenant";
import Link from "next/link";
import KanbanBoard from "@/components/KanbanBoard";
import NewOrderModalButton from "@/components/NewOrderModalButton";

export default async function PedidosPage() {
  const supabase = await createClient();
  const tenantId = await getCurrentTenantId();

  const [{ data: orders, error }, { data: customers }, { data: products }] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, order_number, total, payment_status, order_status, customers(name, phone)"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("customers")
        .select("id, name, phone")
        .order("name", { ascending: true }),
      supabase
        .from("products")
        .select("id, name, price, volume, stock_quantity")
        .eq("status", "ACTIVE")
        .order("name", { ascending: true }),
    ]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Pedidos</h1>
          <p className="text-sm text-neutral-400">
            Acompanhe o pedido do início ao fim.
          </p>
        </div>
        {tenantId && (
          <div className="flex gap-2">
            <Link
              href="/dashboard/pedidos/rapido"
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              ⚡ Pedido rápido
            </Link>
            <NewOrderModalButton
              tenantId={tenantId}
              customers={customers ?? []}
              products={products ?? []}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
          Erro ao carregar pedidos: {error.message}
        </p>
      )}

      {!error && <KanbanBoard orders={(orders as any) ?? []} />}
    </div>
  );
}
