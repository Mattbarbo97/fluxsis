"use client";

import { useState, useTransition } from "react";
import { updateTenantStatus } from "@/app/dashboard/superadmin/actions";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  plan: string;
  status: string;
  created_at: string;
  productCount: number;
  orderCount: number;
  revenue: number;
};

const STATUS_OPTIONS = [
  "ACTIVE",
  "PAYMENT_PENDING",
  "OVERDUE",
  "RESTRICTED",
  "SUSPENDED",
  "CANCELLED",
];

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  PAYMENT_PENDING: "Pagamento pendente",
  OVERDUE: "Em atraso",
  RESTRICTED: "Restrito",
  SUSPENDED: "Suspenso",
  CANCELLED: "Cancelado",
};

export default function TenantsAdminTable({
  tenants,
}: {
  tenants: TenantRow[];
}) {
  const [rows, setRows] = useState(tenants);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(id: string, status: string) {
    setRows((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    startTransition(() => {
      updateTenantStatus(id, status);
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-900 text-neutral-400">
          <tr>
            <th className="px-4 py-3 font-medium">Tenant</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Plano</th>
            <th className="px-4 py-3 font-medium">Produtos</th>
            <th className="px-4 py-3 font-medium">Pedidos</th>
            <th className="px-4 py-3 font-medium">Receita</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800 bg-neutral-950">
          {rows.map((t) => (
            <tr key={t.id}>
              <td className="px-4 py-3">
                <p className="text-white">{t.name}</p>
                <p className="text-xs text-neutral-500">{t.slug}</p>
              </td>
              <td className="px-4 py-3 text-neutral-400">{t.business_type}</td>
              <td className="px-4 py-3 text-neutral-400 capitalize">{t.plan}</td>
              <td className="px-4 py-3 text-neutral-400">{t.productCount}</td>
              <td className="px-4 py-3 text-neutral-400">{t.orderCount}</td>
              <td className="px-4 py-3 text-emerald-400">
                R$ {t.revenue.toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <select
                  value={t.status}
                  disabled={isPending}
                  onChange={(e) => handleStatusChange(t.id, e.target.value)}
                  className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                Nenhum tenant cadastrado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
