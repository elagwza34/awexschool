begin read only;

do $verification$
begin
  if not exists (
    select 1 from pg_catalog.pg_class
    where oid = 'public.owner_account_activity'::regclass and relrowsecurity
  ) then
    raise exception 'Owner account activity RLS is missing';
  end if;
  if has_table_privilege('anon', 'public.owner_account_activity', 'SELECT')
     or not has_table_privilege('authenticated', 'public.owner_account_activity', 'SELECT')
     or has_table_privilege('authenticated', 'public.owner_account_activity', 'INSERT,UPDATE,DELETE') then
    raise exception 'Unexpected owner activity table grant';
  end if;
  if has_function_privilege('anon', 'public.owner_service_assignment_queue()', 'EXECUTE')
     or has_function_privilege('anon', 'public.owner_change_managed_account(uuid,text,text,text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.owner_service_assignment_queue()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.owner_change_managed_account(uuid,text,text,text)', 'EXECUTE') then
    raise exception 'Unexpected owner administration RPC grants';
  end if;
end;
$verification$;

rollback;
