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
type Product = { id: string; name: string; price: number; volume: string | null; stock_quantity: number };
type Member = { id: string; display_name: string | null };
type TableTotal = { subtotal: number; paid: number };

export default function MesasPage() {
  const supabase = createClient();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tableTotals, setTableTotals] = useState<Record<string, TableTotal>>({});
  const [loading, setLoading] = useState(true);

  const [newSectorName, setNewSectorName] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [newTableSector, setNewTableSector] = useState("");

  const [activeComandaId, setActiveComandaId] = useState<string | null>(null);
  const [activeTableName, setActiveTableName] = useState("");

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
        .select("id, name, price, volume, stock_quantity")
        .eq("status", "ACTIVE")
        .order("name"),
      supabase.from("tenant_members").select("id, display_name"),
      supabase
        .from("comandas")
        .select(
          "table_id, comanda_items(quantity, unit_price), comanda_payments(amount)"
        )
        .eq("status", "OPEN"),
    ]);

    setSectors(sectorData ?? []);
    setTables(tableData ?? []);
    setProducts(productData ?? []);
    setMembers(memberData ?? []);

    const totals: Record<string, TableTotal> = {};
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
      // Uma mesa pode, em teoria, ter mais de uma comanda aberta simultaneamente.
      const existing = totals[c.table_id];
      totals[c.table_id] = existing
        ? { subtotal: existing.subtotal + subtotal, paid: existing.paid + paid }
        : { subtotal, paid };
    });
    setTableTotals(totals);

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

  async function openTable(table: Table) {
    if (table.status === "FREE") {
      const { data: comanda } = await supabase
        .from("comandas")
        .insert({ tenant_id: tenantId, table_id: table.id })
        .select("id")
        .single();

      await supabase
        .from("tables")
        .update({ status: "OCCUPIED" })
        .eq("id", table.id);

      setActiveComandaId(comanda?.id ?? null);
      setActiveTableName(table.name);
      load();
      return;
    }

    const { data: comanda } = await supabase
      .from("comandas")
      .select("id")
      .eq("table_id", table.id)
      .eq("status", "OPEN")
      .maybeSingle();

    setActiveComandaId(comanda?.id ?? null);
    setActiveTableName(table.name);
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
                    total={tableTotals[t.id]}
                    onOpen={() => openTable(t)}
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
                total={tableTotals[t.id]}
                onOpen={() => openTable(t)}
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
  total,
  onOpen,
  onAssignWaiter,
}: {
  table: Table;
  members: Member[];
  total?: TableTotal;
  onOpen: () => void;
  onAssignWaiter: (waiterId: string) => void;
}) {
  const isFree = table.status === "FREE";
  const remaining = total ? total.subtotal - total.paid : 0;
  const hasPartialPayment = !!total && total.paid > 0 && remaining > 0;

  return (
    <div
      className={`rounded-xl border p-3 ${
        isFree
          ? "border-neutral-800 bg-neutral-900"
          : "border-amber-800 bg-amber-950/30"
      }`}
    >
      <button onClick={onOpen} className="mb-2 block w-full text-left">
        <p className="text-sm font-medium text-white">{table.name}</p>
        <p
          className={`text-xs ${
            isFree ? "text-neutral-500" : "text-amber-400"
          }`}
        >
          {isFree ? "Livre" : "Ocupada"}
        </p>
        {!isFree && total && total.subtotal > 0 && (
          <p className="mt-1 text-sm font-semibold text-emerald-400">
            R$ {total.subtotal.toFixed(2)}
          </p>
        )}
        {hasPartialPayment && (
          <p className="text-[11px] text-neutral-400">
            Falta R$ {remaining.toFixed(2)}
          </p>
        )}
      </button>
      <select
        value={table.assigned_waiter_id ?? ""}
        onChange={(e) => onAssignWaiter(e.target.value)}
        onClick={(e) => e.stopPropagation()}
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
