import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import CustomerTable from "@/components/CustomerTable";

export default async function ClientesPage() {
  const supabase = await createClient();

  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, phone, classification")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Clientes</h1>
          <p className="text-sm text-neutral-400">Base de clientes (CRM).</p>
        </div>
        <Link
          href="/dashboard/clientes/novo"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          + Novo cliente
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
          Erro ao carregar clientes: {error.message}
        </p>
      )}

      {!error && (!customers || customers.length === 0) && (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
          Nenhum cliente cadastrado ainda.
        </p>
      )}

      {customers && customers.length > 0 && (
        <CustomerTable customers={customers} />
      )}
    </div>
  );
}
