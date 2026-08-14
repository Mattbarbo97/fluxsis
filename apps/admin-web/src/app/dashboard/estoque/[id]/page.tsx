import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getCurrentTenantId } from "@/lib/tenant";
import ProductForm from "@/components/ProductForm";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = await getCurrentTenantId();
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, sku, barcode, volume, price, cost_price, stock_quantity, min_stock, status"
    )
    .eq("id", id)
    .maybeSingle();

  if (!product || !tenantId) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Editar produto</h1>
      <p className="mb-6 text-sm text-neutral-400">{product.name}</p>
      <ProductForm
        tenantId={tenantId}
        initialProduct={{
          id: product.id,
          name: product.name,
          sku: product.sku ?? "",
          barcode: product.barcode ?? "",
          volume: product.volume ?? "",
          price: String(product.price),
          cost_price: product.cost_price ? String(product.cost_price) : "",
          stock_quantity: String(product.stock_quantity),
          min_stock: String(product.min_stock),
          status: product.status,
        }}
      />
    </div>
  );
}
