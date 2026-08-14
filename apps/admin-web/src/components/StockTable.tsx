"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  volume: string | null;
  price: number;
  stock_quantity: number;
  min_stock: number;
  status: string;
};

export default function StockTable({ products }: { products: Product[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(products);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-900 text-neutral-400">
          <tr>
            <th className="px-4 py-3 font-medium">Produto</th>
            <th className="px-4 py-3 font-medium">SKU</th>
            <th className="px-4 py-3 font-medium">Volume</th>
            <th className="px-4 py-3 font-medium">Preço</th>
            <th className="px-4 py-3 font-medium">Estoque</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800 bg-neutral-950">
          {rows.map((product) => {
            const isLow = product.stock_quantity <= product.min_stock;
            return (
              <tr key={product.id}>
                <td className="px-4 py-3 text-white">{product.name}</td>
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
      </table>
    </div>
  );
}
