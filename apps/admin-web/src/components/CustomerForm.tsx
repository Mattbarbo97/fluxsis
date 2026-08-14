"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type CustomerFormValues = {
  id?: string;
  name: string;
  phone: string;
  classification: string;
};

const EMPTY: CustomerFormValues = {
  name: "",
  phone: "",
  classification: "NEW",
};

export default function CustomerForm({
  tenantId,
  initialCustomer,
  onSuccess,
}: {
  tenantId: string;
  initialCustomer?: CustomerFormValues;
  onSuccess?: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [values, setValues] = useState<CustomerFormValues>(
    initialCustomer ?? EMPTY
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(initialCustomer?.id);

  function handleChange(field: keyof CustomerFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      tenant_id: tenantId,
      name: values.name || null,
      phone: values.phone,
      classification: values.classification,
    };

    const { error } = isEditing
      ? await supabase
          .from("customers")
          .update(payload)
          .eq("id", initialCustomer!.id)
      : await supabase.from("customers").insert(payload);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/dashboard/clientes");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Nome</label>
        <input
          value={values.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-neutral-300">
          Telefone (WhatsApp) *
        </label>
        <input
          required
          value={values.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
          placeholder="Ex: 5511999998888"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-neutral-300">
          Classificação
        </label>
        <select
          value={values.classification}
          onChange={(e) => handleChange("classification", e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
        >
          <option value="NEW">Novo</option>
          <option value="RECURRING">Recorrente</option>
          <option value="VIP">VIP</option>
          <option value="INACTIVE">Inativo</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving
            ? "Salvando..."
            : isEditing
            ? "Salvar alterações"
            : "Cadastrar cliente"}
        </button>
        <button
          type="button"
          onClick={() => (onSuccess ? onSuccess() : router.push("/dashboard/clientes"))}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
