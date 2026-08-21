-- FluxSis — composição estruturada por item (ingrediente + preço adicional opcional)
--
-- Antes, "composition" era um texto simples separado por vírgula, sempre
-- removível e sem custo (ex: "Arroz, Feijão, Costela, Farofa"). Agora cada
-- ingrediente pode ter um preço adicional opcional:
--   - preço adicional 0 (ou vazio): item incluso por padrão. Se o cliente
--     tirar, aparece "SEM: <nome>". Se mantido, não aparece nada.
--   - preço adicional > 0: item opcional (adicional). Fica desmarcado por
--     padrão. Se o cliente adicionar, soma o preço e aparece "+ <nome>".

alter table products add column if not exists has_composition boolean not null default false;
alter table products add column if not exists composition_items jsonb not null default '[]'::jsonb;

-- Migra composições antigas (texto simples) pro novo formato estruturado,
-- preservando o comportamento atual: todo item migrado tem preço adicional
-- zero (ou seja, continua incluso por padrão / removível, sem custo extra).
update products
set
  composition_items = (
    select coalesce(
      jsonb_agg(jsonb_build_object('name', trim(item), 'extra_price', 0)),
      '[]'::jsonb
    )
    from unnest(string_to_array(composition, ',')) as item
    where trim(item) <> ''
  ),
  has_composition = true
where composition is not null
  and trim(composition) <> ''
  and (composition_items = '[]'::jsonb or composition_items is null);
