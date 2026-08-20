-- FluxSis — controle de acesso ao painel Super Admin
-- Esta tabela NÃO tem políticas de RLS liberando acesso via anon/authenticated:
-- só é legível através da service_role key, usada exclusivamente no servidor.

create table if not exists super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table super_admins enable row level security;
-- Propositalmente sem nenhuma policy: ninguém acessa via chave anon/authenticated.
