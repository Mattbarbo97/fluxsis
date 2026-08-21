"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { BEVERAGE_CATALOG } from "@/lib/beverage-catalog";

type CompositionItemInput = { name: string; extra_price: string; required: boolean };

type ProductFormValues = {
  id?: string;
  name: string;
  sku: string;
  barcode: string;
  volume: string;
  price: string;
  cost_price: string;
  has_composition: boolean;
  composition_items: CompositionItemInput[];
  stock_quantity: string;
  min_stock: string;
  status: string;
  category_id: string;
};

const EMPTY: ProductFormValues = {
  name: "",
  sku: "",
  barcode: "",
  volume: "",
  price: "",
  cost_price: "",
  has_composition: false,
  composition_items: [],
  stock_quantity: "0",
  min_stock: "0",
  status: "ACTIVE",
  category_id: "",
};

export default function ProductForm({
  tenantId,
  initialProduct,
  onSuccess,
}: {
  tenantId: string;
  initialProduct?: ProductFormValues;
  onSuccess?: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [values, setValues] = useState<ProductFormValues>(
    initialProduct ?? EMPTY
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  async function loadCategories() {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });
    setCategories(data ?? []);
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);

    const { data, error } = await supabase
      .from("categories")
      .insert({ tenant_id: tenantId, name: newCategoryName.trim() })
      .select("id, name")
      .single();

    if (!error && data) {
      setCategories((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
      );
      handleChange("category_id", data.id);
      setNewCategoryName("");
      setAddingCategory(false);
    }
    setSavingCategory(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const isEditing = Boolean(initialProduct?.id);

  function handleChange(
    field: keyof ProductFormValues,
    value: string
  ) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function toggleHasComposition(enabled: boolean) {
    setValues((prev) => ({
      ...prev,
      has_composition: enabled,
      composition_items:
        enabled && prev.composition_items.length === 0
          ? [{ name: "", extra_price: "", required: true }]
          : prev.composition_items,
    }));
  }

  function addCompositionItem() {
    setValues((prev) => ({
      ...prev,
      composition_items: [
        ...prev.composition_items,
        { name: "", extra_price: "", required: true },
      ],
    }));
  }

  function updateCompositionItem(
    index: number,
    field: keyof CompositionItemInput,
    value: string | boolean
  ) {
    setValues((prev) => {
      const next = [...prev.composition_items];
      next[index] = { ...next[index], [field]: value } as CompositionItemInput;
      return { ...prev, composition_items: next };
    });
  }

  function removeCompositionItem(index: number) {
    setValues((prev) => ({
      ...prev,
      composition_items: prev.composition_items.filter((_, i) => i !== index),
    }));
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

    // Só leva pro banco os itens com nome preenchido; preço vazio vira 0
    // (sem custo adicional).
    const cleanCompositionItems = values.has_composition
      ? values.composition_items
          .filter((item) => item.name.trim() !== "")
          .map((item) => ({
            name: item.name.trim(),
            extra_price: item.extra_price ? Number(item.extra_price) : 0,
            required: item.required,
          }))
      : [];

    const payload = {
      tenant_id: tenantId,
      name: values.name,
      sku: values.sku || null,
      barcode: values.barcode || null,
      volume: values.volume || null,
      price: Number(values.price),
      cost_price: values.cost_price ? Number(values.cost_price) : null,
      has_composition: values.has_composition && cleanCompositionItems.length > 0,
      composition_items: cleanCompositionItems,
      stock_quantity: Number(values.stock_quantity),
      min_stock: Number(values.min_stock),
      status: values.status,
      category_id: values.category_id || null,
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

    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/dashboard/estoque");
      router.refresh();
    }
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
            Código de barras
          </label>
          <input
            value={values.barcode}
            onChange={(e) => handleChange("barcode", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
            placeholder="EAN/GTIN"
          />
        </div>
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm text-neutral-300">
            Preço de venda (R$) *
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
            Preço de compra (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.cost_price}
            onChange={(e) => handleChange("cost_price", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
            placeholder="Opcional"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={values.has_composition}
            onChange={(e) => toggleHasComposition(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
          />
          Informar composição (ex: marmitex com ingredientes e adicionais)
        </label>

        {values.has_composition && (
          <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
            <p className="text-xs text-neutral-500">
              Marque "Comum" pros ingredientes que vêm por padrão no prato
              (ex: Arroz, Feijão, Farofa) — o cliente poderá tirar (ex: "sem
              farofa"). Deixe desmarcado pros itens opcionais (ex: escolha de
              carne) — o cliente decide se quer adicionar. Preencher um preço
              é opcional em qualquer um dos dois casos.
            </p>

            <div className="flex items-center gap-2 px-1 text-[11px] text-neutral-500">
              <span className="flex-1">Ingrediente</span>
              <span className="w-28 text-center">Preço adicional</span>
              <span className="w-16 text-center">Comum</span>
              <span className="w-4"></span>
            </div>

            {values.composition_items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={item.name}
                  onChange={(e) =>
                    updateCompositionItem(index, "name", e.target.value)
                  }
                  placeholder="Ex: Arroz, Linguiça..."
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.extra_price}
                  onChange={(e) =>
                    updateCompositionItem(index, "extra_price", e.target.value)
                  }
                  placeholder="R$ 0,00"
                  className="w-28 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
                <input
                  type="checkbox"
                  checked={item.required}
                  onChange={(e) =>
                    updateCompositionItem(index, "required", e.target.checked)
                  }
                  title="Vem por padrão (o cliente pode tirar)"
                  className="h-4 w-16 rounded border-neutral-600 bg-neutral-900"
                />
                <button
                  type="button"
                  onClick={() => removeCompositionItem(index)}
                  className="text-neutral-500 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addCompositionItem}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              + Adicionar item
            </button>
          </div>
        )}
      </div>

      {values.price && values.cost_price && Number(values.cost_price) > 0 && (
        <p className="text-sm text-neutral-400">
          Margem estimada:{" "}
          <span className="text-emerald-400">
            R${" "}
            {(Number(values.price) - Number(values.cost_price)).toFixed(2)}{" "}
            (
            {(
              ((Number(values.price) - Number(values.cost_price)) /
                Number(values.price)) *
              100
            ).toFixed(1)}
            %)
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
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
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm text-neutral-300">Categoria</label>
          <button
            type="button"
            onClick={() => setAddingCategory((v) => !v)}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            {addingCategory ? "Cancelar" : "+ Nova categoria"}
          </button>
        </div>

        {addingCategory && (
          <div className="mb-2 flex gap-2">
            <input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              placeholder="Ex: Sucos"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={savingCategory || !newCategoryName.trim()}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {savingCategory ? "..." : "Adicionar"}
            </button>
          </div>
        )}

        <select
          value={values.category_id}
          onChange={(e) => handleChange("category_id", e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
        >
          <option value="">Sem categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
          onClick={() => (onSuccess ? onSuccess() : router.push("/dashboard/estoque"))}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
