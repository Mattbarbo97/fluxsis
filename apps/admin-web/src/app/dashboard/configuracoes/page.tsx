import { createClient } from "@/lib/supabase-server";
import { getCurrentTenantId } from "@/lib/tenant";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  PAYMENT_PENDING: "Pagamento pendente",
  OVERDUE: "Em atraso",
  RESTRICTED: "Restrito",
  SUSPENDED: "Suspenso",
  CANCELLED: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-950 text-emerald-300",
  PAYMENT_PENDING: "bg-amber-950 text-amber-300",
  OVERDUE: "bg-orange-950 text-orange-300",
  RESTRICTED: "bg-red-950 text-red-300",
  SUSPENDED: "bg-red-950 text-red-300",
  CANCELLED: "bg-neutral-900 text-neutral-500",
};

export default async function ConfiguracoesPage() {
  const tenantId = await getCurrentTenantId();
  const supabase = await createClient();

  const { data: tenant } = tenantId
    ? await supabase
        .from("tenants")
        .select("name, slug, business_type, plan, status, created_at")
        .eq("id", tenantId)
        .maybeSingle()
    : { data: null };

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Configurações</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Dados da sua conta no FluxSis.
      </p>

      {tenant && (
        <div className="max-w-md space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Nome</span>
            <span className="text-white">{tenant.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Tipo de negócio</span>
            <span className="text-white">{tenant.business_type}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Plano</span>
            <span className="text-white capitalize">{tenant.plan}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">Status</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                STATUS_COLOR[tenant.status]
              }`}
            >
              {STATUS_LABEL[tenant.status]}
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 max-w-md rounded-xl border border-dashed border-neutral-800 p-4 text-sm text-neutral-500">
        Cobrança recorrente automática ainda não está conectada. Isso
        depende de escolher e contratar um provedor de pagamentos
        recorrentes (ex: Stripe, Asaas, Iugu) antes de integrar os
        webhooks de cobrança. Por enquanto, o status acima é controlado
        manualmente.
      </div>
    </div>
  );
}
