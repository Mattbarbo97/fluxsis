"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  volume: string | null;
  price: number;
  cost_price: number | null;
  stock_quantity: number;
  min_stock: number;
  status: string;
  categories: { name: string } | null;
};

export default function StockTable({ products }: { products: Product[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(products);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPercent, setBulkPercent] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter((p) => {
      const matchesSearch = p.name
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      const isLow = p.stock_quantity <= p.min_stock;
      return matchesSearch && (!onlyLowStock || isLow);
    });
  }, [rows, search, onlyLowStock]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const p of filtered) {
      const key = p.categories?.name ?? "Sem categoria";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    const entries = Array.from(groups.entries());
    entries.sort((a, b) => {
      if (a[0] === "Sem categoria") return 1;
      if (b[0] === "Sem categoria") return -1;
      return a[0].localeCompare(b[0]);
    });
    return entries;
  }, [filtered]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggleSelectAll() {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((p) => next.add(p.id));
      return next;
    });
  }

  function toggleSelectOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function updateStock(id: string, newQuantity: number) {
    setSavingId(id);
    const { error } = await supabase
      .from("products")
      .update({ stock_quantity: newQuantity })
      .eq("id", id);

    if (!error) {
      setRows((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, stock_quantity: newQuantity } : p
        )
      );
    }
    setSavingId(null);
  }

  async function bulkSetStatus(status: "ACTIVE" | "INACTIVE") {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkSaving(true);

    const { error } = await supabase
      .from("products")
      .update({ status })
      .in("id", ids);

    if (!error) {
      setRows((prev) =>
        prev.map((p) => (ids.includes(p.id) ? { ...p, status } : p))
      );
    }
    setBulkSaving(false);
  }

  async function bulkAdjustPrice() {
    const percent = Number(bulkPercent);
    const ids = Array.from(selected);
    if (ids.length === 0 || Number.isNaN(percent) || percent === 0) return;

    setBulkSaving(true);

    const targets = rows.filter((p) => ids.includes(p.id));
    const updates = targets.map((p) => {
      const newPrice = Number((p.price * (1 + percent / 100)).toFixed(2));
      return supabase
        .from("products")
        .update({ price: newPrice })
        .eq("id", p.id)
        .then(() => ({ id: p.id, newPrice }));
    });

    const results = await Promise.all(updates);

    setRows((prev) =>
      prev.map((p) => {
        const match = results.find((r) => r.id === p.id);
        return match ? { ...p, price: match.newPrice } : p;
      })
    );

    setBulkPercent("");
    setBulkSaving(false);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(e) => setOnlyLowStock(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
          />
          Somente estoque baixo
        </label>
        <span className="text-sm text-neutral-500">
          {filtered.length} produto{filtered.length !== 1 && "s"}
        </span>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3">
          <span className="text-sm text-emerald-300">
            {selected.size} selecionado{selected.size !== 1 && "s"}
          </span>

          <button
            onClick={() => bulkSetStatus("ACTIVE")}
            disabled={bulkSaving}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Ativar
          </button>
          <button
            onClick={() => bulkSetStatus("INACTIVE")}
            disabled={bulkSaving}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            Desativar
          </button>

          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              placeholder="% ex: 10 ou -5"
              value={bulkPercent}
              onChange={(e) => setBulkPercent(e.target.value)}
              className="w-32 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
            />
            <button
              onClick={bulkAdjustPrice}
              disabled={bulkSaving || !bulkPercent}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Reajustar preço
            </button>
          </div>

          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-sm text-neutral-400 hover:text-white"
          >
            Limpar seleção
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
                />
              </th>
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Volume</th>
              <th className="px-4 py-3 font-medium">Preço</th>
              <th className="px-4 py-3 font-medium">Margem</th>
              <th className="px-4 py-3 font-medium">Estoque</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          {grouped.map(([categoryName, items]) => (
            <tbody key={categoryName} className="divide-y divide-neutral-800 bg-neutral-950">
              <tr className="bg-neutral-900/60">
                <td colSpan={8} className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
                  {categoryName} <span className="text-neutral-600">({items.length})</span>
                </td>
              </tr>
              {items.map((product) => {
              const isLow = product.stock_quantity <= product.min_stock;
              return (
                <tr key={product.id}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggleSelectOne(product.id)}
                      className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/estoque/${product.id}`}
                      className="text-white hover:text-emerald-400 hover:underline"
                    >
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {product.sku ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {product.volume ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    R$ {product.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {product.cost_price ? (
                      <span className="text-emerald-400">
                        R$ {(product.price - product.cost_price).toFixed(2)}{" "}
                        <span className="text-neutral-500">
                          (
                          {(
                            ((product.price - product.cost_price) /
                              product.price) *
                            100
                          ).toFixed(0)}
                          %)
                        </span>
                      </span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={product.stock_quantity}
                      disabled={savingId === product.id}
                      onBlur={(e) =>
                        updateStock(product.id, Number(e.target.value))
                      }
                      className={`w-20 rounded-md border bg-neutral-900 px-2 py-1 text-white outline-none focus:border-emerald-500 ${
                        isLow ? "border-red-600" : "border-neutral-700"
                      }`}
                    />
                    {isLow && (
                      <span className="ml-2 text-xs text-red-400">baixo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        product.status === "ACTIVE"
                          ? "bg-emerald-950 text-emerald-400"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {product.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              );
              })}
            </tbody>
          ))}

          {filtered.length === 0 && (
            <tbody>
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-neutral-500"
                >
                  Nenhum produto encontrado com esse filtro.
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}
