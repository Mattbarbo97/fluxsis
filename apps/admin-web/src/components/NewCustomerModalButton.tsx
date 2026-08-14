"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import CustomerForm from "@/components/CustomerForm";

export default function NewCustomerModalButton({
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
        + Novo cliente
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo cliente">
        <CustomerForm tenantId={tenantId} onSuccess={handleSuccess} />
      </Modal>
    </>
  );
}
