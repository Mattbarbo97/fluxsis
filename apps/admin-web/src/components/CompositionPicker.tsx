"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";

export type CompositionItem = { name: string; extra_price: number };

export type CompositionResult = {
  notes: string | null;
  extraPrice: number;
};

/**
 * Itens com preço adicional 0 vêm marcados por padrão (fazem parte da
 * composição base): desmarcar gera "SEM: <nome>", manter marcado não
 * aparece em lugar nenhum. Itens com preço adicional > 0 vêm desmarcados
 * por padrão (são opcionais/adicionais): marcar soma o preço e aparece
 * "+ <nome> (R$ X)".
 */
export function buildCompositionResult(
  items: CompositionItem[],
  checked: Record<string, boolean>
): CompositionResult {
  const removed: string[] = [];
  const added: CompositionItem[] = [];
  let extraPrice = 0;

  items.forEach((item) => {
    const isChecked = checked[item.name] ?? item.extra_price === 0;
    if (item.extra_price === 0) {
      if (!isChecked) removed.push(item.name);
    } else if (isChecked) {
      added.push(item);
      extraPrice += item.extra_price;
    }
  });

  const parts: string[] = [];
  if (removed.length > 0) parts.push(`SEM: ${removed.join(", ")}`);
  if (added.length > 0) {
    parts.push(
      `+ ${added
        .map((a) => `${a.name} (R$ ${a.extra_price.toFixed(2)})`)
        .join(", ")}`
    );
  }

  return {
    notes: parts.length > 0 ? parts.join(" | ") : null,
    extraPrice,
  };
}

export default function CompositionPicker({
  open,
  productName,
  basePrice,
  items,
  confirmLabel = "Adicionar ao carrinho",
  onClose,
  onConfirm,
}: {
  open: boolean;
  productName: string;
  basePrice: number;
  items: CompositionItem[];
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (result: CompositionResult) => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Reseta as marcações toda vez que o modal abre pra um produto.
  useEffect(() => {
    if (!open) return;
    const initial: Record<string, boolean> = {};
    items.forEach((item) => {
      initial[item.name] = item.extra_price === 0;
    });
    setChecked(initial);
  }, [open, productName]);

  const includedItems = items.filter((i) => i.extra_price === 0);
  const extraItems = items.filter((i) => i.extra_price > 0);

  const extraTotal = extraItems.reduce(
    (sum, item) => sum + (checked[item.name] ? item.extra_price : 0),
    0
  );
  const total = basePrice + extraTotal;

  return (
    <Modal open={open} onClose={onClose} title={productName}>
      {includedItems.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-neutral-400">
            Desmarque o que o cliente não quer:
          </p>
          <div className="space-y-2">
            {includedItems.map((item) => (
              <label
                key={item.name}
                className="flex items-center gap-2 text-sm text-white"
              >
                <input
                  type="checkbox"
                  checked={checked[item.name] ?? true}
                  onChange={(e) =>
                    setChecked((prev) => ({
                      ...prev,
                      [item.name]: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
                />
                {item.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {extraItems.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-neutral-400">Adicionais:</p>
          <div className="space-y-2">
            {extraItems.map((item) => (
              <label
                key={item.name}
                className="flex items-center justify-between text-sm text-white"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked[item.name] ?? false}
                    onChange={(e) =>
                      setChecked((prev) => ({
                        ...prev,
                        [item.name]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
                  />
                  {item.name}
                </span>
                <span className="text-emerald-400">
                  + R$ {item.extra_price.toFixed(2)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex justify-between border-t border-neutral-800 pt-3 text-sm font-medium">
        <span className="text-neutral-400">Total do item</span>
        <span className="text-white">R$ {total.toFixed(2)}</span>
      </div>

      <button
        onClick={() => onConfirm(buildCompositionResult(items, checked))}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
      >
        {confirmLabel}
      </button>
    </Modal>
  );
}
