import { getCurrentTenantId } from "@/lib/tenant";
import CustomerForm from "@/components/CustomerForm";

export default async function NovoClientePage() {
  const tenantId = await getCurrentTenantId();

  if (!tenantId) {
    return (
      <p className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
        Seu usuário ainda não está vinculado a nenhum tenant.
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Novo cliente</h1>
      <p className="mb-6 text-sm text-neutral-400">Cadastre um cliente.</p>
      <CustomerForm tenantId={tenantId} />
    </div>
  );
}
