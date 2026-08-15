"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getCurrentTenantIdClient } from "@/lib/tenant-client";
import CategoryForm from "@/components/CategoryForm";

type Category = { id: string; name: string };

export default function CategoriasPage() {
  const supabase = createClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const tid = await getCurrentTenantIdClient(supabase);
    setTenantId(tid);
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });
    setCategories(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Remover esta categoria? Produtos vinculados ficam sem categoria.")) return;
    await supabase.from("categories").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Categorias</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Organize seus produtos por categoria.
      </p>

      {tenantId && (
        <div className="mb-6 max-w-md">
          <CategoryForm tenantId={tenantId} onSuccess={load} />
        </div>
      )}

      {loading && <p className="text-sm text-neutral-500">Carregando...</p>}

      {!loading && categories.length === 0 && (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
          Nenhuma categoria cadastrada ainda.
        </p>
      )}

      {categories.length > 0 && (
        <ul className="max-w-md divide-y divide-neutral-800 rounded-xl border border-neutral-800">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <span className="text-sm text-white">{c.name}</span>
              <button
                onClick={() => handleDelete(c.id)}
                className="text-xs text-neutral-500 hover:text-red-400"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
