"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import ProductForm from "@/components/ProductForm";

export default function NewProductModalButton({
  tenantId,
}: {
  tenantId: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
      >
        + Novo produto
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo produto">
        <ProductForm tenantId={tenantId} onSuccess={handleSuccess} />
      </Modal>
    </>
  );
}
