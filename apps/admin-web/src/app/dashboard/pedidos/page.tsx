import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import KanbanBoard from "@/components/KanbanBoard";

export default async function PedidosPage() {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, total, payment_status, order_status, customers(name, phone)"
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Pedidos</h1>
          <p className="text-sm text-neutral-400">
            Acompanhe o pedido do início ao fim.
          </p>
        </div>
        <Link
          href="/dashboard/pedidos/novo"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          + Novo pedido
        </Link>
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
