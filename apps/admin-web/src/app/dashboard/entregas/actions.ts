"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantId } from "@/lib/tenant";
import { createAdminClient } from "@/lib/supabase-admin";

export async function createDriverWithLogin(formData: FormData) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error("Tenant não encontrado.");

  const name = String(formData.get("name") || "");
  const phone = String(formData.get("phone") || "");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  if (!name || !email || !password) return;

  const admin = createAdminClient();

  const { data: userData, error: userError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (userError || !userData.user) {
    throw new Error(
      userError?.message ?? "Erro ao criar login do entregador."
    );
  }

  await admin.from("delivery_drivers").insert({
    tenant_id: tenantId,
    user_id: userData.user.id,
    name,
    phone: phone || null,
  });

  revalidatePath("/dashboard/entregas");
}
