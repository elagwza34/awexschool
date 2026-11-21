create or replace function liveschool_internal.create_account_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, status)
  values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data ->> 'display_name'), 100), ''), 'مستخدم'), 'active');
  insert into public.account_roles (user_id, role_code)
  values (new.id, case when new.raw_user_meta_data ->> 'account_kind' = 'parent' then 'parent' else 'student' end);
  return new;
end;
$$;

create function public.assign_created_account_role(account_id uuid, assigned_role text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if assigned_role not in ('student', 'parent', 'teacher', 'support', 'manager', 'admin') then
    return false;
  end if;
  update public.account_roles
    set role_code = assigned_role
    where user_id = account_id
      and role_code in ('student', 'parent')
      and not exists (
        select 1 from public.account_roles as existing
        where existing.user_id = account_id and existing.role_code not in ('student', 'parent')
      );
  return found;
end;
$$;
revoke all on function public.assign_created_account_role(uuid, text) from public, anon, authenticated;
grant execute on function public.assign_created_account_role(uuid, text) to service_role;
