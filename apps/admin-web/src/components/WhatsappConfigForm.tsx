"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function WhatsappConfigForm({
  tenantId,
}: {
  tenantId: string;
}) {
  const supabase = createClient();
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("tenant_whatsapp_config")
      .select("phone_number_id")
      .eq("tenant_id", tenantId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.phone_number_id) setPhoneNumberId(data.phone_number_id);
      });
  }, [tenantId]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    await supabase.from("tenant_whatsapp_config").upsert({
      tenant_id: tenantId,
      phone_number_id: phoneNumberId,
    });

    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="mb-3 text-sm text-neutral-300">
        Phone Number ID (WhatsApp Cloud API)
      </p>
      <div className="flex gap-2">
        <input
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          placeholder="Ex: 109876543210987"
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
      {saved && (
        <p className="mt-2 text-xs text-emerald-400">Salvo com sucesso.</p>
      )}
      <p className="mt-3 text-xs text-neutral-500">
        Encontrado no Meta Business — WhatsApp &gt; Configuração da API &gt;
        número de telefone. É esse ID que liga suas mensagens do WhatsApp a
        este tenant.
      </p>
    </div>
  );
}
