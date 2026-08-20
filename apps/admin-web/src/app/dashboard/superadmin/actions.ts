"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function assertSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  const admin = createAdminClient();
  const { data } = await admin
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) throw new Error("Acesso negado: conta sem permissão de Super Admin");

  return admin;
}

export async function updateTenantStatus(tenantId: string, status: string) {
  const admin = await assertSuperAdmin();
  await admin.from("tenants").update({ status }).eq("id", tenantId);
  revalidatePath("/dashboard/superadmin");
}

export async function createTenant(formData: FormData) {
  const admin = await assertSuperAdmin();

  const name = String(formData.get("name") || "");
  const slug = String(formData.get("slug") || "");
  const businessType = String(formData.get("business_type") || "adega");

  if (!name || !slug) return;

  await admin.from("tenants").insert({
    name,
    slug,
    business_type: businessType,
  });

  revalidatePath("/dashboard/superadmin");
}
