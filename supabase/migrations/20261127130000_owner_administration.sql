begin;

create table public.owner_account_activity (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  account_id uuid not null,
  kind text not null check (kind in ('status', 'staff_role')),
  before_value text not null,
  after_value text not null,
  created_at timestamptz not null default now()
);
alter table public.owner_account_activity enable row level security;
revoke all on public.owner_account_activity from public, anon, authenticated, service_role;
grant select on public.owner_account_activity to authenticated;
create policy "Active owners read account activity" on public.owner_account_activity
  for select to authenticated
  using (liveschool_internal.has_active_role((select auth.uid()), array['owner']));

create function public.owner_change_managed_account(p_account uuid, p_kind text, p_expected text, p_value text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_roles text[];
begin
  if liveschool_internal.has_active_role(v_actor, array['owner']) is distinct from true
     or p_account is null or p_account = v_actor or p_expected is null
     or p_value is null or p_expected = p_value then return false; end if;

  select status into v_status from public.profiles where user_id = p_account for update;
  if not found then return false; end if;
  perform 1 from public.account_roles where user_id = p_account order by role_code for update;
  select array_agg(role_code) into v_roles from public.account_roles where user_id = p_account;
  if v_roles is null or 'owner' = any(v_roles) then return false; end if;

  if p_kind = 'status' and v_status = p_expected and p_value in ('active', 'disabled') then
    update public.profiles set status = p_value where user_id = p_account;
  elsif p_kind = 'staff_role' and cardinality(v_roles) = 1 and v_roles[1] = p_expected
     and p_expected in ('admin', 'manager', 'support', 'customer_service')
     and p_value in ('admin', 'manager', 'support', 'customer_service') then
    update public.account_roles set role_code = p_value where user_id = p_account and role_code = p_expected;
    if not found then return false; end if;
  else
    return false;
  end if;

  insert into public.owner_account_activity (actor_id, account_id, kind, before_value, after_value)
    values (v_actor, p_account, p_kind, p_expected, p_value);
  return true;
end;
$$;

create function public.owner_service_assignment_queue()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select case when liveschool_internal.has_active_role(auth.uid(), array['owner']) then
    jsonb_build_object(
      'tickets', coalesce((
        select jsonb_agg(to_jsonb(t)) from (
          select id, title, status, service_category, assigned_staff_id
          from public.support_requests where status <> 'resolved'
          order by created_at desc, id limit 50
        ) t
      ), '[]'::jsonb),
      'staff', coalesce((
        select jsonb_agg(to_jsonb(s)) from (
          select p.user_id as id, p.display_name as name, r.role_code as role
          from public.profiles p join public.account_roles r on r.user_id = p.user_id
          where p.status = 'active' and r.role_code in ('support','customer_service')
          order by p.display_name, p.user_id, r.role_code
        ) s
      ), '[]'::jsonb)
    )
  else null end;
$$;

revoke all on function public.owner_change_managed_account(uuid,text,text,text),
  public.owner_service_assignment_queue() from public, anon, authenticated, service_role;
grant execute on function public.owner_change_managed_account(uuid,text,text,text),
  public.owner_service_assignment_queue() to authenticated;

commit;
