begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
insert into auth.users(id) values ('77000000-0000-0000-0000-000000000001'),('77000000-0000-0000-0000-000000000002');
insert into public.staff_users(id,role) values ('77000000-0000-0000-0000-000000000001','owner'),('77000000-0000-0000-0000-000000000002','staff');
insert into public.orders(id,display_order_number,customer_name,customer_email,pickup_at,earliest_pickup_at,
  subtotal_cents,tax_rate,tax_cents,total_cents,payment_status,ticket_status) values
  ('77000000-0000-0000-0000-000000000011','REPORT-1','Test','test@example.invalid',now()+interval '1 hour',now()+interval '15 minutes',300,0.0825,25,325,'paid','received'),
  ('77000000-0000-0000-0000-000000000012','REPORT-2','Test','test@example.invalid',now()+interval '1 hour',now()+interval '15 minutes',150,0.0825,12,162,'paid','received'),
  ('77000000-0000-0000-0000-000000000013','REPORT-3','Test','test@example.invalid',now()+interval '1 hour',now()+interval '15 minutes',150,0.0825,12,162,'pending_payment',null),
  ('77000000-0000-0000-0000-000000000014','REPORT-4','Test','test@example.invalid',now()+interval '1 hour',now()+interval '15 minutes',150,0.0825,12,162,'paid','received');
insert into public.payments(order_id,stripe_checkout_session_id,amount_cents,paid_at) values
  ('77000000-0000-0000-0000-000000000011','cs_report_1',325,'2026-11-01T05:00:00Z'),
  ('77000000-0000-0000-0000-000000000012','cs_report_2',162,'2026-11-02T05:59:59Z'),
  ('77000000-0000-0000-0000-000000000014','cs_report_4',162,'2026-11-02T06:00:00Z');
insert into public.order_lines(order_id,item_size_id,quantity,unit_price_cents,item_name_snapshot,size_code_snapshot)
  select '77000000-0000-0000-0000-000000000011',s.id,2,150,'Historical egg roll','regular'
  from public.item_sizes s join public.menu_items m on m.id=s.menu_item_id where m.code='A2';
update public.item_sizes set price_cents=999 where menu_item_id=(select id from public.menu_items where code='A2');
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select throws_ok($$select public.owner_operational_reports('2026-11-01','2026-11-01')$$,'42501',null,'Staff cannot access reports');
reset role;
set local role anon;
select throws_ok($$select public.owner_operational_reports('2026-11-01','2026-11-01')$$,'42501',null,'Guest cannot execute reports');
reset role;
select set_config('request.jwt.claim.sub','77000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select is((public.owner_operational_reports('2026-11-01','2026-11-01')->'summary'->>'orders')::int,2,'Fall-back day includes all 25 hours, excludes next midnight and unpaid');
select is((public.owner_operational_reports('2026-11-01','2026-11-01')->'summary'->>'sales')::int,450,'Sales exclude tax');
select is((public.owner_operational_reports('2026-11-01','2026-11-01')->'summary'->>'collected')::int,487,'Collected includes tax');
select is((public.owner_operational_reports('2026-11-01','2026-11-01')->'items'->0->>'revenue')::int,300,'Item revenue uses historical price, not current 999 cents');
select is(public.owner_operational_reports('2026-11-01','2026-11-01')->'items'->0->>'name','Historical egg roll','Item name comes from sale snapshot');
select lives_ok($$update public.orders set ticket_status='cancelled' where display_order_number='REPORT-2'$$,'Owner cancels order');
select is((public.owner_operational_reports('2026-11-01','2026-11-01')->'summary'->>'orders')::int,1,'Cancelled orders excluded');
select is((public.owner_operational_reports('2026-11-01','2026-11-01')->'summary'->>'sales')::int,300,'Cancelled sales excluded');
select is((public.owner_operational_reports('2026-01-01','2026-01-01')->'summary'->>'orders')::int,0,'Empty report returns zero');
select throws_ok($$select public.owner_operational_reports('2026-11-02','2026-11-01')$$,'22023',null,'Reverse dates rejected');
select throws_ok($$select public.owner_operational_reports('2025-01-01','2026-11-01')$$,'22023',null,'Unbounded report rejected');
reset role;
select * from finish();
rollback;
