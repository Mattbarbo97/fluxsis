import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getCurrentTenantId } from "@/lib/tenant";
import CustomerForm from "@/components/CustomerForm";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = await getCurrentTenantId();
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, classification")
    .eq("id", id)
    .maybeSingle();

  if (!customer || !tenantId) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Editar cliente</h1>
      <p className="mb-6 text-sm text-neutral-400">
        {customer.name || customer.phone}
      </p>
      <CustomerForm
        tenantId={tenantId}
        initialCustomer={{
          id: customer.id,
          name: customer.name ?? "",
          phone: customer.phone,
          classification: customer.classification,
        }}
      />
    </div>
  );
}
