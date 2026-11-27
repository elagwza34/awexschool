begin;

insert into public.roles (code, label)
values ('customer_service', 'خدمة العملاء')
on conflict (code) do nothing;

create policy "Customer service can read own active profile"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid())
    and liveschool_internal.has_active_role((select auth.uid()), array['customer_service']));

create policy "Customer service can read own role"
  on public.account_roles for select to authenticated
  using (user_id = (select auth.uid()) and role_code = 'customer_service'
    and liveschool_internal.has_active_role((select auth.uid()), array['customer_service']));

alter table public.support_requests
  add column service_category text,
  add column assigned_staff_id uuid references public.profiles(user_id) on delete restrict,
  add column escalated_manager_id uuid references public.profiles(user_id) on delete restrict,
  add constraint support_request_service_category_check
    check (service_category in ('general', 'registration', 'enrollment', 'complaint', 'technical')),
  add constraint support_request_assignment_requires_category
    check (assigned_staff_id is null or service_category is not null);

create index support_requests_assigned_staff_idx on public.support_requests (assigned_staff_id)
  where assigned_staff_id is not null;
create index support_requests_escalated_manager_idx on public.support_requests (escalated_manager_id)
  where escalated_manager_id is not null;

create table public.support_request_activity (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.support_requests(id) on delete restrict,
  actor_id uuid not null references public.profiles(user_id) on delete restrict,
  event_type text not null check (event_type in ('assigned', 'reply', 'status', 'escalated')),
  status text check (status in ('new', 'in-progress', 'resolved')),
  created_at timestamptz not null default now()
);
create index support_request_activity_request_idx on public.support_request_activity (request_id, id);
alter table public.support_request_activity enable row level security;
revoke all on public.support_request_activity from public, anon, authenticated, service_role;
grant select on public.support_request_activity to authenticated;
grant select (id, title, details, contact_name, contact_email, status, created_at, assigned_staff_id, escalated_manager_id)
  on public.support_requests to authenticated;
grant select (request_id, body, created_at) on public.support_replies to authenticated;

create policy "Assigned staff can read their service requests"
  on public.support_requests for select to authenticated
  using (
    (assigned_staff_id = (select auth.uid()) and (
      (service_category = 'technical' and liveschool_internal.has_active_role((select auth.uid()), array['support']))
      or (service_category in ('general','registration','enrollment','complaint')
        and liveschool_internal.has_active_role((select auth.uid()), array['customer_service']))
    ))
    or (escalated_manager_id = (select auth.uid())
      and liveschool_internal.has_active_role((select auth.uid()), array['manager']))
  );

create policy "Scoped service request replies"
  on public.support_replies for select to authenticated
  using (exists (select 1 from public.support_requests r where r.id = support_replies.request_id));

create policy "Scoped service request activity"
  on public.support_request_activity for select to authenticated
  using (exists (select 1 from public.support_requests r where r.id = support_request_activity.request_id));

create function public.assign_service_request(p_request uuid, p_category text, p_staff uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
begin
  if not liveschool_internal.has_active_role(v_actor, array['owner']) then return false; end if;
  v_role := case
    when p_category = 'technical' then 'support'
    when p_category in ('general','registration','enrollment','complaint') then 'customer_service'
  end;
  if v_role is null or p_staff is null
    or not liveschool_internal.has_active_role(p_staff, array[v_role]) then return false; end if;

  update public.support_requests
  set assigned_staff_id = p_staff, service_category = p_category, escalated_manager_id = null
  where id = p_request and status <> 'resolved';
  if not found then return false; end if;
  insert into public.support_request_activity (request_id, actor_id, event_type)
    values (p_request, v_actor, 'assigned');
  return true;
end;
$$;

create function public.update_assigned_service_request(
  p_request uuid, p_action text, p_value text default null, p_manager uuid default null
)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_request public.support_requests%rowtype;
  v_customer boolean;
  v_allowed boolean;
begin
  if v_actor is null then return false; end if;
  select * into v_request from public.support_requests where id = p_request for update;
  if not found then return false; end if;

  v_customer := v_request.assigned_staff_id = v_actor
    and v_request.service_category in ('general','registration','enrollment','complaint')
    and liveschool_internal.has_active_role(v_actor, array['customer_service']);
  v_allowed := v_customer
    or (v_request.assigned_staff_id = v_actor and v_request.service_category = 'technical'
      and liveschool_internal.has_active_role(v_actor, array['support']))
    or (v_request.escalated_manager_id = v_actor and liveschool_internal.has_active_role(v_actor, array['manager']));
  if v_allowed is distinct from true then return false; end if;

  if p_action = 'reply' and char_length(btrim(p_value)) between 1 and 4000
     and v_request.status <> 'resolved' then
    insert into public.support_replies (request_id, author_id, body) values (p_request, v_actor, btrim(p_value));
    insert into public.support_request_activity (request_id, actor_id, event_type) values (p_request, v_actor, 'reply');
  elsif p_action = 'status' and (
    (v_request.status = 'new' and p_value = 'in-progress')
    or (v_request.status = 'in-progress' and p_value = 'resolved')
  ) then
    update public.support_requests set status = p_value where id = p_request;
    insert into public.support_request_activity (request_id, actor_id, event_type, status)
      values (p_request, v_actor, 'status', p_value);
  elsif p_action = 'escalate' and v_customer is true and v_request.status <> 'resolved'
    and v_request.escalated_manager_id is null and p_manager <> v_actor
    and liveschool_internal.has_active_role(p_manager, array['manager']) then
    update public.support_requests set escalated_manager_id = p_manager where id = p_request;
    insert into public.support_request_activity (request_id, actor_id, event_type) values (p_request, v_actor, 'escalated');
  else
    return false;
  end if;
  return true;
end;
$$;

create function public.service_escalation_targets()
returns table (id uuid, name text) language sql stable security definer set search_path = ''
as $$
  select p.user_id, p.display_name
  from public.profiles p
  where liveschool_internal.has_active_role(auth.uid(), array['customer_service'])
    and p.user_id <> auth.uid()
    and liveschool_internal.has_active_role(p.user_id, array['manager'])
  order by p.display_name, p.user_id;
$$;

revoke all on function public.service_escalation_targets(), public.assign_service_request(uuid, text, uuid),
  public.update_assigned_service_request(uuid, text, text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.service_escalation_targets(), public.assign_service_request(uuid, text, uuid),
  public.update_assigned_service_request(uuid, text, text, uuid) to authenticated;

commit;
