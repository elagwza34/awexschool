delete from public.account_roles as learner
where learner.role_code in ('student', 'parent')
  and exists (
    select 1 from public.account_roles as owner_role
    where owner_role.user_id = learner.user_id and owner_role.role_code = 'owner'
  );

create function public.assign_owner_role(account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_roles (user_id, role_code)
  values (account_id, 'owner')
  on conflict (user_id, role_code) do nothing;

  delete from public.account_roles
  where user_id = account_id and role_code in ('student', 'parent');
end;
$$;

revoke all on function public.assign_owner_role(uuid) from public, anon, authenticated;
grant execute on function public.assign_owner_role(uuid) to service_role;
