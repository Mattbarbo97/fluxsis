import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

export default async function DashboardIndex() {
  const supabase = await createClient();

  const [
    { count: totalProducts },
    { count: totalCustomers },
    { count: openOrders },
    { data: lowStock },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .not("order_status", "in", "(DELIVERED,CANCELLED)"),
    supabase.from("products").select("id, name, stock_quantity, min_stock"),
  ]);

  const lowStockItems = (lowStock ?? []).filter(
    (p) => p.stock_quantity <= p.min_stock
  );

  const cards = [
    { label: "Produtos cadastrados", value: totalProducts ?? 0, href: "/dashboard/estoque" },
    { label: "Clientes", value: totalCustomers ?? 0, href: "/dashboard/clientes" },
    { label: "Pedidos em aberto", value: openOrders ?? 0, href: "/dashboard/pedidos" },
    { label: "Produtos com estoque baixo", value: lowStockItems.length, href: "/dashboard/estoque" },
  ];

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Visão geral</h1>
      <p className="mb-6 text-sm text-neutral-400">Resumo do seu negócio.</p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:border-emerald-700"
          >
            <p className="text-2xl font-semibold text-white">{card.value}</p>
            <p className="mt-1 text-xs text-neutral-400">{card.label}</p>
          </Link>
        ))}
      </div>

      {lowStockItems.length > 0 && (
        <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4">
          <h2 className="mb-2 text-sm font-medium text-red-300">
            Estoque baixo
          </h2>
          <ul className="space-y-1 text-sm text-neutral-300">
            {lowStockItems.slice(0, 5).map((p) => (
              <li key={p.id}>
                {p.name} — {p.stock_quantity} unidade(s) (mínimo: {p.min_stock})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
