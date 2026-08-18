"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getCurrentTenantIdClient } from "@/lib/tenant-client";

type Transaction = {
  id: string;
  type: string;
  category: string | null;
  description: string | null;
  amount: number;
  occurred_at: string;
};

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function CaixaPage() {
  const supabase = createClient();
  const [manual, setManual] = useState<Transaction[]>([]);
  const [orderRevenue, setOrderRevenue] = useState(0);
  const [comandaRevenue, setComandaRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(firstDayOfMonth());

  const [type, setType] = useState("EXPENSE");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);

    const [{ data: manualData }, { data: orders }, { data: comandaPayments }] =
      await Promise.all([
        supabase
          .from("cash_transactions")
          .select("id, type, category, description, amount, occurred_at")
          .gte("occurred_at", from)
          .order("occurred_at", { ascending: false }),
        supabase
          .from("orders")
          .select("total, updated_at")
          .eq("payment_status", "CONFIRMED")
          .gte("updated_at", from),
        supabase
          .from("comanda_payments")
          .select("amount, created_at")
          .gte("created_at", from),
      ]);

    setManual(manualData ?? []);
    setOrderRevenue((orders ?? []).reduce((s, o) => s + o.total, 0));
    setComandaRevenue(
      (comandaPayments ?? []).reduce((s, p) => s + p.amount, 0)
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [from]);

  const manualIncome = manual
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const manualExpense = manual
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);

  const totalIncome = orderRevenue + comandaRevenue + manualIncome;
  const totalExpense = manualExpense;
  const balance = totalIncome - totalExpense;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setSaving(true);

    const tenantId = await getCurrentTenantIdClient(supabase);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("cash_transactions").insert({
      tenant_id: tenantId,
      type,
      category: category || null,
      description: description || null,
      amount: Number(amount),
      occurred_at: occurredAt,
      created_by: user?.id ?? null,
    });

    setCategory("");
    setDescription("");
    setAmount("");
    setSaving(false);
    load();
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Fluxo de caixa</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Entradas (pedidos pagos + comandas + manuais) e saídas.
      </p>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-neutral-400">Desde</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white outline-none focus:border-emerald-500"
        />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-2xl font-semibold text-emerald-400">
            R$ {totalIncome.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Entradas (pedidos R$ {orderRevenue.toFixed(2)} + comandas R${" "}
            {comandaRevenue.toFixed(2)} + manual R$ {manualIncome.toFixed(2)})
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-2xl font-semibold text-red-400">
            R$ {totalExpense.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">Saídas</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p
            className={`text-2xl font-semibold ${
              balance >= 0 ? "text-white" : "text-red-400"
            }`}
          >
            R$ {balance.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">Saldo</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4"
      >
        <div>
          <label className="mb-1 block text-xs text-neutral-400">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
          >
            <option value="EXPENSE">Saída</option>
            <option value="INCOME">Entrada</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-400">
            Categoria
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex: Fornecedor"
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-neutral-400">
            Descrição
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-400">
            Valor (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-400">Data</label>
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !amount}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Lançar"}
        </button>
      </form>

      {loading && <p className="text-sm text-neutral-500">Carregando...</p>}

      {!loading && manual.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 bg-neutral-950">
              {manual.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-neutral-400">
                    {t.occurred_at}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        t.type === "INCOME"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {t.type === "INCOME" ? "Entrada" : "Saída"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {t.category || "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {t.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-white">
                    R$ {t.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
