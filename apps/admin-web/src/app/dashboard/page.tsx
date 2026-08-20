import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export default async function DashboardIndex() {
  const supabase = await createClient();

  const todayStart = startOfToday();
  const monthStart = startOfMonth();

  const [
    { count: totalProducts },
    { count: totalCustomers },
    { count: openOrders },
    { data: lowStock },
    { data: ordersToday },
    { data: ordersMonth },
    { data: comandaPaymentsToday },
    { data: comandaPaymentsMonth },
    { data: topItems },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .not("order_status", "in", "(DELIVERED,CANCELLED)"),
    supabase.from("products").select("id, name, stock_quantity, min_stock"),
    supabase
      .from("orders")
      .select("total")
      .eq("payment_status", "CONFIRMED")
      .gte("updated_at", todayStart),
    supabase
      .from("orders")
      .select("total")
      .eq("payment_status", "CONFIRMED")
      .gte("updated_at", monthStart),
    supabase
      .from("comanda_payments")
      .select("amount")
      .gte("created_at", todayStart),
    supabase
      .from("comanda_payments")
      .select("amount")
      .gte("created_at", monthStart),
    supabase
      .from("order_items")
      .select("quantity, products(name)")
      .gte("created_at", monthStart),
  ]);

  const lowStockItems = (lowStock ?? []).filter(
    (p) => p.stock_quantity <= p.min_stock
  );

  const revenueToday =
    (ordersToday ?? []).reduce((s, o) => s + o.total, 0) +
    (comandaPaymentsToday ?? []).reduce((s, p) => s + p.amount, 0);

  const revenueMonth =
    (ordersMonth ?? []).reduce((s, o) => s + o.total, 0) +
    (comandaPaymentsMonth ?? []).reduce((s, p) => s + p.amount, 0);

  const orderCountMonth = (ordersMonth ?? []).length;
  const avgTicket = orderCountMonth > 0 ? revenueMonth / orderCountMonth : 0;

  const productTotals = new Map<string, number>();
  (topItems ?? []).forEach((item: any) => {
    const name = item.products?.name ?? "—";
    productTotals.set(name, (productTotals.get(name) ?? 0) + item.quantity);
  });
  const topProducts = Array.from(productTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const metricCards = [
    { label: "Faturamento hoje", value: `R$ ${revenueToday.toFixed(2)}`, highlight: true },
    { label: "Faturamento no mês", value: `R$ ${revenueMonth.toFixed(2)}`, highlight: true },
    { label: "Ticket médio (mês)", value: `R$ ${avgTicket.toFixed(2)}`, highlight: false },
    { label: "Pedidos em aberto", value: String(openOrders ?? 0), highlight: false },
  ];

  const quickLinks = [
    { label: "⚡ Pedido rápido", href: "/dashboard/pedidos/rapido" },
    { label: "+ Novo pedido", href: "/dashboard/pedidos" },
    { label: "Mesas", href: "/dashboard/mesas" },
    { label: "Estoque", href: "/dashboard/estoque" },
    { label: "📊 Relatórios", href: "/dashboard/relatorios" },
  ];

  const secondaryCards = [
    { label: "Produtos cadastrados", value: totalProducts ?? 0, href: "/dashboard/estoque" },
    { label: "Clientes", value: totalCustomers ?? 0, href: "/dashboard/clientes" },
    { label: "Produtos com estoque baixo", value: lowStockItems.length, href: "/dashboard/estoque" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Visão geral</h1>
          <p className="text-sm text-neutral-400">Resumo do seu negócio.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-white hover:bg-neutral-800"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <p
              className={`text-2xl font-semibold ${
                card.highlight ? "text-emerald-400" : "text-white"
              }`}
            >
              {card.value}
            </p>
            <p className="mt-1 text-xs text-neutral-400">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {secondaryCards.map((card) => (
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {topProducts.length > 0 && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <h2 className="mb-2 text-sm font-medium text-neutral-300">
              Mais vendidos no mês
            </h2>
            <ul className="space-y-1 text-sm text-neutral-300">
              {topProducts.map(([name, qty]) => (
                <li key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span className="text-neutral-500">{qty} un.</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {lowStockItems.length > 0 && (
          <div className="rounded-xl border border-red-900 bg-red-950/30 p-4">
            <h2 className="mb-2 text-sm font-medium text-red-300">
              Estoque baixo
            </h2>
            <ul className="space-y-1 text-sm text-neutral-300">
              {lowStockItems.slice(0, 5).map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.name}</span>
                  <span className="text-red-400">
                    {p.stock_quantity} (mín: {p.min_stock})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
