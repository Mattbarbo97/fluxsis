"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Customer = {
  id: string;
  name: string | null;
  phone: string;
  classification: string;
};

const CLASSIFICATION_LABEL: Record<string, string> = {
  NEW: "Novo",
  RECURRING: "Recorrente",
  VIP: "VIP",
  INACTIVE: "Inativo",
};

const CLASSIFICATION_COLOR: Record<string, string> = {
  NEW: "bg-neutral-800 text-neutral-300",
  RECURRING: "bg-blue-950 text-blue-300",
  VIP: "bg-amber-950 text-amber-300",
  INACTIVE: "bg-neutral-900 text-neutral-500",
};

export default function CustomerTable({
  customers,
}: {
  customers: Customer[];
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        (c.name ?? "").toLowerCase().includes(term) || c.phone.includes(term)
    );
  }, [customers, search]);

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Classificação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 bg-neutral-950">
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/clientes/${c.id}`}
                    className="text-white hover:text-emerald-400 hover:underline"
                  >
                    {c.name || "(sem nome)"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-400">{c.phone}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      CLASSIFICATION_COLOR[c.classification]
                    }`}
                  >
                    {CLASSIFICATION_LABEL[c.classification]}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-neutral-500"
                >
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
