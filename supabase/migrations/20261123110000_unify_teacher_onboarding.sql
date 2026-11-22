alter table public.teacher_profiles
  add column onboarding_details jsonb not null default '{}'::jsonb
  check (jsonb_typeof(onboarding_details) = 'object');

alter table public.teacher_applications
  add column teacher_user_id uuid references public.teacher_profiles(user_id) on delete set null;

create function public.complete_teacher_onboarding(
  p_actor uuid, p_user uuid, p_application uuid, p_profile jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.account_roles r join public.profiles p on p.user_id = r.user_id
    where r.user_id = p_actor and r.role_code in ('admin', 'owner') and p.status = 'active'
  ) then raise exception 'teacher_forbidden'; end if;

  if p_application is not null then
    perform 1 from public.teacher_applications a join auth.users u on u.id = p_user
    where a.id = p_application and a.status in ('pending', 'accepted')
      and a.teacher_user_id is null and lower(a.email) = lower(u.email)
    for update of a;
    if not found then raise exception 'teacher_application_unavailable'; end if;
  end if;

  if not public.assign_created_account_role(p_user, 'teacher') then
    raise exception 'teacher_role_failed';
  end if;

  insert into public.teacher_profiles (
    user_id, subject_id, full_name, qualification, experience_years, bio, portrait_path, onboarding_details
  )
  values (
    p_user, p_profile->>'subject', p_profile->>'fullName', p_profile->>'qualification',
    (p_profile->>'experience')::smallint, p_profile->>'bio', nullif(p_profile->>'portrait', ''),
    jsonb_build_object(
      'phone', p_profile->>'phone', 'governorate', p_profile->>'governorate', 'approach', p_profile->>'approach',
      'grades', p_profile->'grades', 'video', p_profile->>'video'
    )
  );

  if p_application is not null then
    update public.teacher_applications
    set status = 'accepted', teacher_user_id = p_user where id = p_application;
  end if;
end;
$$;

revoke all on function public.complete_teacher_onboarding(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.complete_teacher_onboarding(uuid, uuid, uuid, jsonb) to service_role;
