"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { createTenant } from "@/app/dashboard/superadmin/actions";

export default function NewTenantModalButton() {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await createTenant(formData);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
      >
        + Novo tenant
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo tenant">
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-neutral-300">
              Nome *
            </label>
            <input
              required
              name="name"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
              placeholder="Ex: Adega do João"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">
              Slug (identificador único) *
            </label>
            <input
              required
              name="slug"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
              placeholder="Ex: adega-do-joao"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">
              Tipo de negócio
            </label>
            <select
              name="business_type"
              defaultValue="adega"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
            >
              <option value="adega">Adega</option>
              <option value="lanchonete">Lanchonete</option>
              <option value="confeitaria">Confeitaria</option>
              <option value="restaurante">Restaurante</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
          >
            Criar tenant
          </button>
        </form>
      </Modal>
    </>
  );
}
