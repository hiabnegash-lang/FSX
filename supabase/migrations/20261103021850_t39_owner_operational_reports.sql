begin;
-- Aggregate at the database, without shipping order/customer records to the browser.
create function public.owner_operational_reports(p_start date, p_end date) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_result jsonb;
begin
  if (select private.app_role()) is distinct from 'owner' then
    raise exception 'Owner access required' using errcode='42501';
  end if;
  if p_start is null or p_end is null or p_start < date '2000-01-01' or p_end > date '9998-12-31'
    or p_end < p_start or p_end - p_start >= 366 then
    raise exception 'Choose at most 366 calendar days' using errcode='22023';
  end if;
  with base as materialized (
    select o.id, o.subtotal_cents, o.tax_cents, o.total_cents, p.paid_at,
      (p.paid_at at time zone 'America/Chicago')::date as day,
      extract(hour from p.paid_at at time zone 'America/Chicago')::integer as hour
    from public.orders o join public.payments p on p.order_id=o.id
    where o.payment_status='paid' and o.ticket_status is distinct from 'cancelled'
      and p.paid_at >= (p_start::timestamp at time zone 'America/Chicago')
      and p.paid_at < ((p_end + 1)::timestamp at time zone 'America/Chicago')
  ), daily as (
    select day, count(*) as orders, sum(subtotal_cents) as sales, sum(tax_cents) as tax, sum(total_cents) as collected
    from base group by day
  ), items as (
    select m.id, m.code, (array_agg(l.item_name_snapshot order by b.paid_at desc, l.id))[1] as name,
      sum(l.quantity) as quantity, sum(l.quantity::bigint*l.unit_price_cents) as revenue
    from base b join public.order_lines l on l.order_id=b.id
      join public.item_sizes s on s.id=l.item_size_id join public.menu_items m on m.id=s.menu_item_id
    group by m.id,m.code
  ), hourly as (select hour,count(*) as orders from base group by hour)
  select jsonb_build_object(
    'summary',(select jsonb_build_object('orders',count(*),'sales',coalesce(sum(subtotal_cents),0),
      'tax',coalesce(sum(tax_cents),0),'collected',coalesce(sum(total_cents),0)) from base),
    'daily',coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from daily d),'[]'::jsonb),
    'items',coalesce((select jsonb_agg(jsonb_build_object('code',i.code,'name',i.name,'quantity',i.quantity,'revenue',i.revenue) order by i.revenue desc,i.code) from items i),'[]'::jsonb),
    'hourly',coalesce((select jsonb_agg(to_jsonb(h) order by h.hour) from hourly h),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.owner_operational_reports(date,date) from public, anon;
grant execute on function public.owner_operational_reports(date,date) to authenticated;
commit;
