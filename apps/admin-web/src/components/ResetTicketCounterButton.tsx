"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function ResetTicketCounterButton({
  tenantId,
}: {
  tenantId: string;
}) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (!confirm("Resetar o contador de senha para 0? Essa ação não pode ser desfeita.")) {
      return;
    }
    setSaving(true);
    await supabase.rpc("reset_ticket_counter", { p_tenant_id: tenantId });
    setSaving(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  return (
    <div className="max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="mb-3 text-sm text-neutral-300">
        Contador de senha (sistema de fila/pedido rápido)
      </p>
      <button
        onClick={handleReset}
        disabled={saving}
        className="rounded-lg border border-red-800 px-4 py-2 text-sm text-red-300 hover:bg-red-950 disabled:opacity-50"
      >
        {saving ? "Resetando..." : "Resetar contador de senha"}
      </button>
      {done && (
        <p className="mt-2 text-xs text-emerald-400">
          Contador resetado. A próxima senha será 1.
        </p>
      )}
    </div>
  );
}
