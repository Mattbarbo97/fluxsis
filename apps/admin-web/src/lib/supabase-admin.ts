import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ATENÇÃO: este client usa a service_role key, que ignora todas as regras de RLS.
// NUNCA importe este arquivo em um componente "use client" — server-only.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
