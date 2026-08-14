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
      <h1 className="mb-1 text-xl font-semibold">Estoque</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Produtos cadastrados e quantidade disponível.
      </p>

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
