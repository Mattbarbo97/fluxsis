-- FluxSis — adiciona código de barras e preço de compra ao catálogo

alter table products add column barcode text;
alter table products add column cost_price numeric(10,2);

-- Evita cadastrar o mesmo código de barras duas vezes dentro do mesmo tenant
-- (permite null, então produtos sem código de barras não são bloqueados)
create unique index products_tenant_barcode_idx
  on products (tenant_id, barcode)
  where barcode is not null;
