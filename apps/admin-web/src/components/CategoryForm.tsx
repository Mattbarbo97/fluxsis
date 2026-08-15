"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function CategoryForm({
  tenantId,
  onSuccess,
}: {
  tenantId: string;
  onSuccess: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("categories")
      .insert({ tenant_id: tenantId, name });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setSaving(false);
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex: Cervejas"
        className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Adicionar"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
