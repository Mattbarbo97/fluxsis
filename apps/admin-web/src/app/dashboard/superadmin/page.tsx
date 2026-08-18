import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import TenantsAdminTable from "@/components/TenantsAdminTable";
import NewTenantModalButton from "@/components/NewTenantModalButton";

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <p className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
        Não autenticado.
      </p>
    );
  }

  const admin = createAdminClient();

  const { data: superAdminRow } = await admin
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!superAdminRow) {
    return (
      <div>
        <h1 className="mb-1 text-xl font-semibold">Super Admin</h1>
        <p className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
          Acesso restrito. Sua conta não tem permissão de Super Admin.
        </p>
      </div>
    );
  }

  const [{ data: tenants }, { data: products }, { data: orders }] =
    await Promise.all([
      admin
        .from("tenants")
        .select("id, name, slug, business_type, plan, status, created_at")
        .order("created_at", { ascending: false }),
      admin.from("products").select("tenant_id"),
      admin.from("orders").select("tenant_id, total"),
    ]);

  const productCountMap: Record<string, number> = {};
  (products ?? []).forEach((p: any) => {
    productCountMap[p.tenant_id] = (productCountMap[p.tenant_id] ?? 0) + 1;
  });

  const orderStatsMap: Record<string, { count: number; revenue: number }> = {};
  (orders ?? []).forEach((o: any) => {
    if (!orderStatsMap[o.tenant_id])
      orderStatsMap[o.tenant_id] = { count: 0, revenue: 0 };
    orderStatsMap[o.tenant_id].count += 1;
    orderStatsMap[o.tenant_id].revenue += o.total;
  });

  const tenantsWithStats = (tenants ?? []).map((t) => ({
    ...t,
    productCount: productCountMap[t.id] ?? 0,
    orderCount: orderStatsMap[t.id]?.count ?? 0,
    revenue: orderStatsMap[t.id]?.revenue ?? 0,
  }));

  const totalRevenue = tenantsWithStats.reduce((s, t) => s + t.revenue, 0);
  const activeCount = tenantsWithStats.filter((t) => t.status === "ACTIVE").length;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Super Admin</h1>
          <p className="text-sm text-neutral-400">
            Todos os tenants da plataforma FluxSis.
          </p>
        </div>
        <NewTenantModalButton />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-2xl font-semibold text-white">
            {tenantsWithStats.length}
          </p>
          <p className="mt-1 text-xs text-neutral-400">Tenants totais</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-2xl font-semibold text-white">{activeCount}</p>
          <p className="mt-1 text-xs text-neutral-400">Tenants ativos</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-2xl font-semibold text-emerald-400">
            R$ {totalRevenue.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Receita agregada (todos os tenants)
          </p>
        </div>
      </div>

      <TenantsAdminTable tenants={tenantsWithStats} />
    </div>
  );
}
