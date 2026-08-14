import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import StockTable from "@/components/StockTable";

export default async function EstoquePage() {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, sku, volume, price, stock_quantity, min_stock, status")
    .order("name", { ascending: true });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Estoque</h1>
          <p className="text-sm text-neutral-400">
            Produtos cadastrados e quantidade disponível.
          </p>
        </div>
        <Link
          href="/dashboard/estoque/novo"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          + Novo produto
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
          Erro ao carregar produtos: {error.message}
        </p>
      )}

      {!error && (!products || products.length === 0) && (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
          Nenhum produto cadastrado ainda para este tenant.
        </p>
      )}

      {products && products.length > 0 && <StockTable products={products} />}
    </div>
  );
}
