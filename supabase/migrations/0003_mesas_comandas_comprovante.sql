-- FluxSis — comprovante de pagamento, mesas e comandas

-- Comprovante de pagamento (upload manual, já que o WhatsApp bot ainda não existe)
alter table orders add column if not exists proof_url text;

-- Nome de exibição do membro (usado para atribuir garçom sem precisar consultar auth.users)
alter table tenant_members add column if not exists display_name text;

-- Setores (para dividir o salão, opcional)
create table if not exists sectors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Mesas
create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  sector_id uuid references sectors(id) on delete set null,
  name text not null,
  status text not null default 'FREE', -- FREE | OCCUPIED | RESERVED
  assigned_waiter_id uuid references tenant_members(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Comandas (conta aberta em uma mesa)
create table if not exists comandas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  table_id uuid not null references tables(id) on delete cascade,
  status text not null default 'OPEN', -- OPEN | CLOSED
  people_count integer not null default 1,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists comanda_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  comanda_id uuid not null references comandas(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null,
  unit_price numeric(10,2) not null,
  created_at timestamptz not null default now()
);

-- Permite pagamento parcial / conta dividida (várias entradas por comanda)
create table if not exists comanda_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  comanda_id uuid not null references comandas(id) on delete cascade,
  amount numeric(10,2) not null,
  method text,
  created_at timestamptz not null default now()
);

alter table sectors enable row level security;
alter table tables enable row level security;
alter table comandas enable row level security;
alter table comanda_items enable row level security;
alter table comanda_payments enable row level security;

create policy tenant_isolation_sectors on sectors for all using (tenant_id in (select auth_tenant_ids()));
create policy tenant_isolation_tables on tables for all using (tenant_id in (select auth_tenant_ids()));
create policy tenant_isolation_comandas on comandas for all using (tenant_id in (select auth_tenant_ids()));
create policy tenant_isolation_comanda_items on comanda_items for all using (tenant_id in (select auth_tenant_ids()));
create policy tenant_isolation_comanda_payments on comanda_payments for all using (tenant_id in (select auth_tenant_ids()));

-- Bucket de storage para comprovantes de pagamento (upload manual pelo atendente)
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload proofs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'proofs');

create policy "Authenticated users can read proofs"
on storage.objects for select
to authenticated
using (bucket_id = 'proofs');
