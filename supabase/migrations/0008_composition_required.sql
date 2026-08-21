-- FluxSis — separa "vem por padrão" (obrigatório) de "tem preço adicional"
-- na composição dos produtos.
--
-- Antes, um item só vinha incluso por padrão se o preço adicional fosse
-- zero. Agora isso é um campo explícito (`required`), então dá pra ter um
-- item opcional sem custo (ex: "Farofa extra grátis") ou, em tese, um item
-- obrigatório com custo. Essa migration só preenche o campo pros dados que
-- já existem, mantendo o comportamento de antes (preço zero = obrigatório).

update products
set composition_items = (
  select coalesce(
    jsonb_agg(
      case
        when item ? 'required' then item
        else item || jsonb_build_object('required', (item->>'extra_price')::numeric = 0)
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(composition_items) as item
)
where has_composition = true
  and composition_items <> '[]'::jsonb;
