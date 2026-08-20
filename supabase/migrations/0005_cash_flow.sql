-- FluxSis — fluxo de caixa (lançamentos manuais de entrada/saída)

create table if not exists cash_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  type text not null, -- INCOME | EXPENSE
  category text,
  description text,
  amount numeric(10,2) not null,
  occurred_at date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table cash_transactions enable row level security;

create policy tenant_isolation_cash_transactions on cash_transactions
  for all using (tenant_id in (select auth_tenant_ids()));
