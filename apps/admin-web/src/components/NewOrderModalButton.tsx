"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import OrderForm from "@/components/OrderForm";

type Customer = { id: string; name: string | null; phone: string };
type Product = { id: string; name: string; price: number; volume: string | null };

export default function NewOrderModalButton({
  tenantId,
  customers,
  products,
}: {
  tenantId: string;
  customers: Customer[];
  products: Product[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  const disabled = customers.length === 0 || products.length === 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={
          disabled
            ? "Cadastre um cliente e um produto ativo primeiro"
            : undefined
        }
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Novo pedido
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo pedido">
        <OrderForm
          tenantId={tenantId}
          customers={customers}
          products={products}
          onSuccess={handleSuccess}
        />
      </Modal>
    </>
  );
}
