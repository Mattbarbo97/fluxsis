-- FluxSis — composição de item (marmitex), sistema de senha e nome no pedido

-- Composição padrão do produto (ex: "Arroz, Feijão, Costela, Farofa")
alter table products add column if not exists composition text;

-- Observação por item do pedido (ex: "SEM: Farofa")
alter table order_items add column if not exists notes text;
alter table comanda_items add column if not exists notes text;

-- Nome livre do cliente no pedido (sem precisar criar cadastro completo) e número de senha
alter table orders add column if not exists customer_display_name text;
alter table orders add column if not exists ticket_number integer;

-- Contador de senha por tenant
create table if not exists ticket_sequences (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  current_number integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table ticket_sequences enable row level security;
create policy tenant_isolation_ticket_sequences on ticket_sequences
  for all using (tenant_id in (select auth_tenant_ids()));

-- Pega o próximo número de senha de forma atômica (evita duas pessoas pegarem o mesmo número)
create or replace function next_ticket_number(p_tenant_id uuid)
returns integer
language plpgsql
as $$
declare
  v_number integer;
begin
  insert into ticket_sequences (tenant_id, current_number)
  values (p_tenant_id, 1)
  on conflict (tenant_id)
  do update set current_number = ticket_sequences.current_number + 1,
                updated_at = now()
  returning current_number into v_number;

  return v_number;
end;
$$;

-- Reseta o contador de senha do tenant (usado manualmente pelo estabelecimento)
create or replace function reset_ticket_counter(p_tenant_id uuid)
returns void
language sql
as $$
  insert into ticket_sequences (tenant_id, current_number)
  values (p_tenant_id, 0)
  on conflict (tenant_id) do update set current_number = 0, updated_at = now();
$$;
