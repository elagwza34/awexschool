begin read only;

do $verification$
begin
  if not exists (select 1 from public.roles where code = 'customer_service') then
    raise exception 'Customer Service role missing';
  end if;
  if not has_column_privilege('authenticated', 'public.support_requests', 'assigned_staff_id', 'SELECT')
     or not has_column_privilege('authenticated', 'public.support_replies', 'body', 'SELECT')
     or not has_table_privilege('authenticated', 'public.support_request_activity', 'SELECT') then
    raise exception 'Required scoped read grants missing';
  end if;
  if has_column_privilege('authenticated', 'public.support_requests', 'status', 'UPDATE')
     or has_column_privilege('authenticated', 'public.support_requests', 'assigned_staff_id', 'UPDATE')
     or has_column_privilege('authenticated', 'public.support_replies', 'body', 'INSERT')
     or has_table_privilege('authenticated', 'public.support_request_activity', 'INSERT') then
    raise exception 'A support write bypasses the operational RPC';
  end if;
  if (select count(*) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname in ('support_requests','support_replies','support_request_activity')
        and c.relrowsecurity) <> 3 then
    raise exception 'Required support RLS missing';
  end if;
  if not has_function_privilege('authenticated', 'public.update_assigned_service_request(uuid,text,text,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.update_assigned_service_request(uuid,text,text,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.assign_service_request(uuid,text,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.service_escalation_targets()', 'EXECUTE') then
    raise exception 'Unexpected service RPC permissions';
  end if;
end;
$verification$;

rollback;
