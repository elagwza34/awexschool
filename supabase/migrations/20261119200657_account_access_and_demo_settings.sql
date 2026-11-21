create table public.site_settings (
  id boolean primary key default true check (id),
  demo_enabled boolean not null default true
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from public, anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant select, update on public.site_settings to service_role;
create policy "Demo visibility is public" on public.site_settings for select to anon, authenticated using (true);
insert into public.site_settings (id) values (true);

grant select on public.profiles, public.roles, public.account_roles to authenticated;
grant select, update on public.profiles to service_role;
grant select, insert, update on public.account_roles to service_role;
create policy "Read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "Read own roles" on public.account_roles for select to authenticated using ((select auth.uid()) = user_id);
create policy "Read role labels" on public.roles for select to authenticated using (true);

create schema liveschool_internal;
revoke all on schema liveschool_internal from public, anon, authenticated;

create function liveschool_internal.create_account_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role text;
begin
  assigned_role := case
    when new.raw_app_meta_data ->> 'liveschool_role' in ('student', 'parent', 'teacher', 'support', 'manager', 'admin')
      then new.raw_app_meta_data ->> 'liveschool_role'
    when new.raw_user_meta_data ->> 'account_kind' = 'parent' then 'parent'
    else 'student'
  end;
  insert into public.profiles (user_id, display_name, status)
  values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data ->> 'display_name'), 100), ''), 'مستخدم'), 'active');
  insert into public.account_roles (user_id, role_code) values (new.id, assigned_role);
  return new;
end;
$$;
revoke all on function liveschool_internal.create_account_profile() from public, anon, authenticated;
create trigger liveschool_create_account_profile
after insert on auth.users
for each row execute function liveschool_internal.create_account_profile();
