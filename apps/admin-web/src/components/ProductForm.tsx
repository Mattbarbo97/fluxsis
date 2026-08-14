"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { BEVERAGE_CATALOG } from "@/lib/beverage-catalog";

type ProductFormValues = {
  id?: string;
  name: string;
  sku: string;
  volume: string;
  price: string;
  stock_quantity: string;
  min_stock: string;
  status: string;
};

const EMPTY: ProductFormValues = {
  name: "",
  sku: "",
  volume: "",
  price: "",
  stock_quantity: "0",
  min_stock: "0",
  status: "ACTIVE",
};

export default function ProductForm({
  tenantId,
  initialProduct,
}: {
  tenantId: string;
  initialProduct?: ProductFormValues;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [values, setValues] = useState<ProductFormValues>(
    initialProduct ?? EMPTY
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isEditing = Boolean(initialProduct?.id);

  function handleChange(
    field: keyof ProductFormValues,
    value: string
  ) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSelectSuggestion(name: string, volume: string) {
    setValues((prev) => ({ ...prev, name, volume }));
  }

  const suggestions =
    values.name.trim().length > 0
      ? BEVERAGE_CATALOG.filter((item) =>
          item.name.toLowerCase().includes(values.name.trim().toLowerCase())
        ).slice(0, 6)
      : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      tenant_id: tenantId,
      name: values.name,
      sku: values.sku || null,
      volume: values.volume || null,
      price: Number(values.price),
      stock_quantity: Number(values.stock_quantity),
      min_stock: Number(values.min_stock),
      status: values.status,
    };

    const { error } = isEditing
      ? await supabase
          .from("products")
          .update(payload)
          .eq("id", initialProduct!.id)
      : await supabase.from("products").insert(payload);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard/estoque");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="relative">
        <label className="mb-1 block text-sm text-neutral-300">Nome *</label>
        <input
          required
          value={values.name}
          onChange={(e) => {
            handleChange("name", e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          autoComplete="off"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
          placeholder="Ex: Heineken 350ml"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-lg">
            {suggestions.map((item, i) => (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={() =>
                    handleSelectSuggestion(item.name, item.volume)
                  }
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
                >
                  <span>{item.name}</span>
                  <span className="text-neutral-500">{item.volume}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-neutral-300">SKU</label>
          <input
            value={values.sku}
            onChange={(e) => handleChange("sku", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-300">
            Volume
          </label>
          <input
            value={values.volume}
            onChange={(e) => handleChange("volume", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
            placeholder="Ex: 350ml"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm text-neutral-300">
            Preço (R$) *
          </label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={values.price}
            onChange={(e) => handleChange("price", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-300">
            Estoque
          </label>
          <input
            type="number"
            min="0"
            value={values.stock_quantity}
            onChange={(e) => handleChange("stock_quantity", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-300">
            Estoque mínimo
          </label>
          <input
            type="number"
            min="0"
            value={values.min_stock}
            onChange={(e) => handleChange("min_stock", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-neutral-300">Status</label>
        <select
          value={values.status}
          onChange={(e) => handleChange("status", e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
        >
          <option value="ACTIVE">Ativo</option>
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
          {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar produto"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/estoque")}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
