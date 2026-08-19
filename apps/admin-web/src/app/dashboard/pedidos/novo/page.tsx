import { createClient } from "@/lib/supabase-server";
import { getCurrentTenantId } from "@/lib/tenant";
import OrderForm from "@/components/OrderForm";

export default async function NovoPedidoPage() {
  const tenantId = await getCurrentTenantId();
  const supabase = await createClient();

  const [{ data: customers }, { data: products }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone")
      .order("name", { ascending: true }),
    supabase
      .from("products")
      .select("id, name, price, volume, stock_quantity")
      .eq("status", "ACTIVE")
      .order("name", { ascending: true }),
  ]);

  if (!tenantId) {
    return (
      <p className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
        Seu usuário ainda não está vinculado a nenhum tenant.
      </p>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <div>
        <h1 className="mb-1 text-xl font-semibold">Novo pedido</h1>
        <p className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
          Cadastre pelo menos um cliente antes de criar um pedido.
        </p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div>
        <h1 className="mb-1 text-xl font-semibold">Novo pedido</h1>
        <p className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
          Cadastre pelo menos um produto ativo antes de criar um pedido.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Novo pedido</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Monte o pedido selecionando cliente e produtos.
      </p>
      <OrderForm tenantId={tenantId} customers={customers} products={products} />
    </div>
  );
}
