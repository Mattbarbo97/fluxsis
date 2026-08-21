"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getCurrentTenantIdClient } from "@/lib/tenant-client";
import ComandaModal from "@/components/ComandaModal";

type Sector = { id: string; name: string };
type Table = {
  id: string;
  name: string;
  status: string;
  sector_id: string | null;
  assigned_waiter_id: string | null;
};
type Product = {
  id: string;
  name: string;
  price: number;
  volume: string | null;
  has_composition: boolean;
  composition_items: { name: string; extra_price: number }[];
  stock_quantity: number;
};
type Member = { id: string; display_name: string | null };
type TableComanda = { id: string; subtotal: number; paid: number };

export default function MesasPage() {
  const supabase = createClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [comandasByTable, setComandasByTable] = useState<Record<string, TableComanda[]>>({});
  const [loading, setLoading] = useState(true);

  const [newSectorName, setNewSectorName] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [newTableSector, setNewTableSector] = useState("");

  const [activeComandaId, setActiveComandaId] = useState<string | null>(null);
  const [activeTableName, setActiveTableName] = useState("");
  const [creatingComandaFor, setCreatingComandaFor] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const tid = await getCurrentTenantIdClient(supabase);
    setTenantId(tid);

    const [
      { data: sectorData },
      { data: tableData },
      { data: productData },
      { data: memberData },
      { data: openComandas },
    ] = await Promise.all([
      supabase.from("sectors").select("id, name").order("name"),
      supabase
        .from("tables")
        .select("id, name, status, sector_id, assigned_waiter_id")
        .order("name"),
      supabase
        .from("products")
        .select("id, name, price, volume, has_composition, composition_items, stock_quantity")
        .eq("status", "ACTIVE")
        .order("name"),
      supabase.from("tenant_members").select("id, display_name"),
      supabase
        .from("comandas")
        .select(
          "id, table_id, opened_at, comanda_items(quantity, unit_price), comanda_payments(amount)"
        )
        .eq("status", "OPEN")
        .order("opened_at", { ascending: true }),
    ]);

    setSectors(sectorData ?? []);
    setTables(tableData ?? []);
    setProducts(productData ?? []);
    setMembers(memberData ?? []);

    const grouped: Record<string, TableComanda[]> = {};
    (openComandas ?? []).forEach((c: any) => {
      if (!c.table_id) return;
      const subtotal = (c.comanda_items ?? []).reduce(
        (s: number, i: any) => s + i.unit_price * i.quantity,
        0
      );
      const paid = (c.comanda_payments ?? []).reduce(
        (s: number, p: any) => s + p.amount,
        0
      );
      if (!grouped[c.table_id]) grouped[c.table_id] = [];
      grouped[c.table_id].push({ id: c.id, subtotal, paid });
    });
    setComandasByTable(grouped);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addSector(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !newSectorName) return;
    await supabase
      .from("sectors")
      .insert({ tenant_id: tenantId, name: newSectorName });
    setNewSectorName("");
    load();
  }

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !newTableName) return;
    await supabase.from("tables").insert({
      tenant_id: tenantId,
      name: newTableName,
      sector_id: newTableSector || null,
    });
    setNewTableName("");
    load();
  }

  async function assignWaiter(tableId: string, waiterId: string) {
    await supabase
      .from("tables")
      .update({ assigned_waiter_id: waiterId || null })
      .eq("id", tableId);
    load();
  }

  // Abre uma comanda já existente (o usuário clicou num dos chips "Comanda N").
  function openComanda(table: Table, comandaId: string, index: number) {
    const label = index > 0 ? `${table.name} — Comanda ${index}` : table.name;
    setActiveComandaId(comandaId);
    setActiveTableName(label);
  }

  // Cria uma comanda nova na mesa (mesa livre, ou "dividir" uma mesa já ocupada
  // em outro grupo/comanda separada).
  async function newComanda(table: Table) {
    if (!tenantId || creatingComandaFor) return;
    setCreatingComandaFor(table.id);

    const { data: comanda } = await supabase
      .from("comandas")
      .insert({ tenant_id: tenantId, table_id: table.id })
      .select("id")
      .single();

    if (table.status === "FREE") {
      await supabase
        .from("tables")
        .update({ status: "OCCUPIED" })
        .eq("id", table.id);
    }

    const existingCount = (comandasByTable[table.id] ?? []).length;
    const label =
      existingCount > 0
        ? `${table.name} — Comanda ${existingCount + 1}`
        : table.name;

    setActiveComandaId(comanda?.id ?? null);
    setActiveTableName(label);
    setCreatingComandaFor(null);
    load();
  }

  const tablesBySector = sectors.map((s) => ({
    sector: s,
    tables: tables.filter((t) => t.sector_id === s.id),
  }));
  const noSectorTables = tables.filter((t) => !t.sector_id);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Mesas</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Mapa de mesas e comandas abertas.
      </p>

      <div className="mb-6 flex flex-wrap gap-6">
        <form onSubmit={addSector} className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Novo setor
            </label>
            <input
              value={newSectorName}
              onChange={(e) => setNewSectorName(e.target.value)}
              placeholder="Ex: Salão, Varanda"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <button className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700">
            Adicionar
          </button>
        </form>

        <form onSubmit={addTable} className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Nova mesa
            </label>
            <input
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              placeholder="Ex: Mesa 12"
              className="w-28 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">Setor</label>
            <select
              value={newTableSector}
              onChange={(e) => setNewTableSector(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
            >
              <option value="">Sem setor</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">
            Adicionar mesa
          </button>
        </form>
      </div>

      {loading && <p className="text-sm text-neutral-500">Carregando...</p>}

      {!loading && tables.length === 0 && (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
          Nenhuma mesa cadastrada ainda.
        </p>
      )}

      {tablesBySector.map(
        ({ sector, tables: sectorTables }) =>
          sectorTables.length > 0 && (
            <div key={sector.id} className="mb-6">
              <h2 className="mb-2 text-sm font-medium text-neutral-300">
                {sector.name}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {sectorTables.map((t) => (
                  <TableCard
                    key={t.id}
                    table={t}
                    members={members}
                    comandas={comandasByTable[t.id] ?? []}
                    creating={creatingComandaFor === t.id}
                    onOpenComanda={(comandaId, index) =>
                      openComanda(t, comandaId, index)
                    }
                    onNewComanda={() => newComanda(t)}
                    onAssignWaiter={(waiterId) => assignWaiter(t.id, waiterId)}
                  />
                ))}
              </div>
            </div>
          )
      )}

      {noSectorTables.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-neutral-300">
            Sem setor
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {noSectorTables.map((t) => (
              <TableCard
                key={t.id}
                table={t}
                members={members}
                comandas={comandasByTable[t.id] ?? []}
                creating={creatingComandaFor === t.id}
                onOpenComanda={(comandaId, index) =>
                  openComanda(t, comandaId, index)
                }
                onNewComanda={() => newComanda(t)}
                onAssignWaiter={(waiterId) => assignWaiter(t.id, waiterId)}
              />
            ))}
          </div>
        </div>
      )}

      <ComandaModal
        comandaId={activeComandaId}
        tableName={activeTableName}
        products={products}
        open={activeComandaId !== null}
        onClose={() => setActiveComandaId(null)}
        onClosed={() => {
          setActiveComandaId(null);
          load();
        }}
      />
    </div>
  );
}

function TableCard({
  table,
  members,
  comandas,
  creating,
  onOpenComanda,
  onNewComanda,
  onAssignWaiter,
}: {
  table: Table;
  members: Member[];
  comandas: TableComanda[];
  creating: boolean;
  onOpenComanda: (comandaId: string, index: number) => void;
  onNewComanda: () => void;
  onAssignWaiter: (waiterId: string) => void;
}) {
  const isFree = table.status === "FREE" && comandas.length === 0;

  return (
    <div
      className={`rounded-xl border p-3 ${
        isFree
          ? "border-neutral-800 bg-neutral-900"
          : "border-amber-800 bg-amber-950/30"
      }`}
    >
      <div className="mb-2">
        <p className="text-sm font-medium text-white">{table.name}</p>
        <p className={`text-xs ${isFree ? "text-neutral-500" : "text-amber-400"}`}>
          {isFree
            ? "Livre"
            : comandas.length > 1
            ? `Ocupada — ${comandas.length} comandas`
            : "Ocupada"}
        </p>
      </div>

      {isFree ? (
        <button
          onClick={onNewComanda}
          disabled={creating}
          className="mb-2 w-full rounded-md border border-emerald-700 bg-emerald-950/40 px-2 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-50"
        >
          Abrir mesa
        </button>
      ) : (
        <div className="mb-2 space-y-1">
          {comandas.map((c, idx) => {
            const remaining = c.subtotal - c.paid;
            const hasPartial = c.paid > 0 && remaining > 0;
            return (
              <button
                key={c.id}
                onClick={() => onOpenComanda(c.id, comandas.length > 1 ? idx + 1 : 0)}
                className="flex w-full items-center justify-between rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-left text-xs hover:border-emerald-600"
              >
                <span className="text-neutral-300">
                  {comandas.length > 1 ? `Comanda ${idx + 1}` : "Comanda"}
                  {hasPartial && (
                    <span className="ml-1 text-amber-400">(parcial)</span>
                  )}
                </span>
                <span className="font-semibold text-emerald-400">
                  R$ {c.subtotal.toFixed(2)}
                </span>
              </button>
            );
          })}
          <button
            onClick={onNewComanda}
            disabled={creating}
            className="w-full rounded-md border border-dashed border-neutral-700 px-2 py-1 text-[11px] text-neutral-400 hover:border-emerald-600 hover:text-emerald-400 disabled:opacity-50"
          >
            + Nova comanda
          </button>
        </div>
      )}

      <select
        value={table.assigned_waiter_id ?? ""}
        onChange={(e) => onAssignWaiter(e.target.value)}
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-1.5 py-1 text-xs text-white outline-none focus:border-emerald-500"
      >
        <option value="">Sem garçom</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.display_name || "Sem nome"}
          </option>
        ))}
      </select>
    </div>
  );
}
