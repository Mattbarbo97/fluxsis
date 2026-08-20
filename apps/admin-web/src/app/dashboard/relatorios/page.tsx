"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type ProductRow = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
};

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Soma um dia pra incluir o dia final inteiro nos filtros gte/lte.
function endOfDayIso(dateStr: string) {
  const d = new Date(dateStr + "T23:59:59.999");
  return d.toISOString();
}

function startOfDayIso(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00.000");
  return d.toISOString();
}

export default function RelatoriosPage() {
  const supabase = createClient();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const fromIso = startOfDayIso(from);
    const toIso = endOfDayIso(to);

    const [{ data: orderItems, error: orderErr }, { data: comandaItems, error: comandaErr }] =
      await Promise.all([
        supabase
          .from("order_items")
          .select(
            "quantity, unit_price, product_id, products(name, cost_price), orders!inner(payment_status, updated_at)"
          )
          .eq("orders.payment_status", "CONFIRMED")
          .gte("orders.updated_at", fromIso)
          .lte("orders.updated_at", toIso),
        supabase
          .from("comanda_items")
          .select(
            "quantity, unit_price, product_id, products(name, cost_price), comandas!inner(status, closed_at)"
          )
          .eq("comandas.status", "CLOSED")
          .gte("comandas.closed_at", fromIso)
          .lte("comandas.closed_at", toIso),
      ]);

    if (orderErr || comandaErr) {
      setError((orderErr ?? comandaErr)?.message ?? "Erro ao carregar relatório.");
      setLoading(false);
      return;
    }

    const totals = new Map<string, ProductRow>();

    function addItem(item: any) {
      const productId = item.product_id;
      const name = item.products?.name ?? "Produto removido";
      const costPrice = item.products?.cost_price ?? 0;
      const revenue = item.unit_price * item.quantity;
      const cost = costPrice * item.quantity;

      const existing = totals.get(productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += revenue;
        existing.cost += cost;
        existing.profit += revenue - cost;
      } else {
        totals.set(productId, {
          productId,
          name,
          quantity: item.quantity,
          revenue,
          cost,
          profit: revenue - cost,
        });
      }
    }

    (orderItems ?? []).forEach(addItem);
    (comandaItems ?? []).forEach(addItem);

    const sorted = Array.from(totals.values()).sort((a, b) => b.revenue - a.revenue);
    setRows(sorted);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        quantity: acc.quantity + r.quantity,
        revenue: acc.revenue + r.revenue,
        cost: acc.cost + r.cost,
        profit: acc.profit + r.profit,
      }),
      { quantity: 0, revenue: 0, cost: 0, profit: 0 }
    );
  }, [rows]);

  function exportCsv() {
    const header = ["Produto", "Qtd vendida", "Receita", "Custo", "Lucro", "Margem"];
    const lines = rows.map((r) => {
      const margin = r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0;
      return [
        r.name,
        r.quantity,
        r.revenue.toFixed(2),
        r.cost.toFixed(2),
        r.profit.toFixed(2),
        margin.toFixed(1) + "%",
      ].join(";");
    });
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-vendas-${from}-a-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Relatório de vendas e lucro</h1>
          <p className="text-sm text-neutral-400">
            Por produto: quantidade vendida, receita, custo e lucro no período.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">De</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">Até</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-2xl font-semibold text-white">{summary.quantity}</p>
          <p className="mt-1 text-xs text-neutral-400">Itens vendidos</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-2xl font-semibold text-emerald-400">
            R$ {summary.revenue.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">Receita</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-2xl font-semibold text-white">
            R$ {summary.cost.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">Custo (preço de compra)</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p
            className={`text-2xl font-semibold ${
              summary.profit >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            R$ {summary.profit.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">Lucro estimado</p>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-neutral-500">Carregando...</p>}

      {!loading && rows.length === 0 && !error && (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
          Nenhuma venda confirmada no período selecionado.
        </p>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Qtd</th>
                <th className="px-3 py-2 font-medium">Receita</th>
                <th className="px-3 py-2 font-medium">Custo</th>
                <th className="px-3 py-2 font-medium">Lucro</th>
                <th className="px-3 py-2 font-medium">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {rows.map((r) => {
                const margin = r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0;
                return (
                  <tr key={r.productId}>
                    <td className="px-3 py-2 text-white">{r.name}</td>
                    <td className="px-3 py-2 text-neutral-300">{r.quantity}</td>
                    <td className="px-3 py-2 text-neutral-300">
                      R$ {r.revenue.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-neutral-400">
                      R$ {r.cost.toFixed(2)}
                    </td>
                    <td
                      className={`px-3 py-2 font-medium ${
                        r.profit >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      R$ {r.profit.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-neutral-400">
                      {margin.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-neutral-500">
        Receita considera pedidos com pagamento confirmado e comandas fechadas no
        período. Custo usa o preço de compra atual cadastrado no produto — se ele
        mudou desde a venda, o lucro de vendas antigas é uma estimativa. Produtos
        sem preço de compra cadastrado aparecem com custo R$ 0,00.
      </p>
    </div>
  );
}
