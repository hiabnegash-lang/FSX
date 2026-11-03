begin;

-- All writes use the owner's session and existing RLS. Save the item and every size atomically.
create function public.owner_save_menu_item(p_item jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := (p_item->>'id')::uuid;
  v_old public.menu_items;
  v_size jsonb;
  v_position integer := 0;
begin
  if (select private.app_role()) is distinct from 'owner' then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_item->'sizes') is distinct from 'array'
    or jsonb_array_length(p_item->'sizes') not between 1 and 6
    or length(btrim(p_item->>'name')) not between 1 and 120
    or (p_item->>'code') !~ '^[A-Z][0-9]{1,3}$'
    or length(p_item->>'description') > 2000
    or (p_item->>'sortOrder')::integer not between 0 and 10000
    or (select count(distinct s->>'name') from jsonb_array_elements(p_item->'sizes') s) <> jsonb_array_length(p_item->'sizes') then
    raise exception 'Invalid menu item' using errcode = '22023';
  end if;
  if v_id is not null then
    select * into v_old from public.menu_items where id = v_id for update;
    if not found or v_old.updated_at is distinct from (p_item->>'version')::timestamptz then
      raise exception 'Menu item changed' using errcode = '40001';
    end if;
    if v_old.code <> p_item->>'code' then
      raise exception 'Item codes cannot change' using errcode = '22023';
    end if;
    if exists (select 1 from public.item_sizes s where s.menu_item_id = v_id
      and not exists (select 1 from jsonb_array_elements(p_item->'sizes') n where n->>'name' = s.size_code)) then
      raise exception 'Existing sizes must be retained' using errcode = '22023';
    end if;
    update public.menu_items set category_id = (p_item->>'categoryId')::uuid,
      name = btrim(p_item->>'name'), description = p_item->>'description', sort_order = (p_item->>'sortOrder')::integer,
      is_available = (p_item->>'isAvailable')::boolean, is_active = (p_item->>'isActive')::boolean,
      is_spicy_flag = (p_item->>'isSpicyFlag')::boolean, is_catering = (p_item->>'isCatering')::boolean where id = v_id;
  else
    insert into public.menu_items(category_id, code, name, description, sort_order, is_available, is_active, is_spicy_flag, is_catering)
      values ((p_item->>'categoryId')::uuid, p_item->>'code', btrim(p_item->>'name'), p_item->>'description',
        (p_item->>'sortOrder')::integer, (p_item->>'isAvailable')::boolean, (p_item->>'isActive')::boolean,
        (p_item->>'isSpicyFlag')::boolean, (p_item->>'isCatering')::boolean) returning id into v_id;
  end if;
  for v_size in select value from jsonb_array_elements(p_item->'sizes') loop
    insert into public.item_sizes(menu_item_id, size_code, price_cents, sort_order)
      values(v_id, v_size->>'name', (v_size->>'price')::integer, v_position)
      on conflict(menu_item_id, size_code) do update set price_cents = excluded.price_cents, sort_order = excluded.sort_order;
    v_position := v_position + 1;
  end loop;
  return v_id;
end;
$$;
revoke all on function public.owner_save_menu_item(jsonb) from public, anon;
grant execute on function public.owner_save_menu_item(jsonb) to authenticated;

-- Items are archived, never deleted. Empty categories may be removed; the FK protects all items.
grant delete on public.menu_categories to authenticated;
create policy categories_owner_delete on public.menu_categories for delete to authenticated
  using ((select private.app_role()) = 'owner');
commit;
