create function public.save_learning_group(
  p_actor uuid,
  p_group uuid,
  p_course uuid,
  p_teacher uuid,
  p_name text,
  p_capacity integer,
  p_fee_minor bigint,
  p_weekday integer,
  p_time time,
  p_active boolean,
  p_students uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_group uuid := p_group;
  selected_students uuid[];
  current_member_count integer;
  new_member_count integer;
begin
  if not exists (
    select 1 from public.account_roles ar join public.profiles p on p.user_id = ar.user_id
    where ar.user_id = p_actor and ar.role_code in ('admin', 'owner') and p.status = 'active'
  ) then
    raise exception 'group_forbidden';
  end if;

  if (
    length(btrim(p_name)) between 2 and 160
    and p_capacity between 1 and 500 and p_fee_minor between 0 and 99999999
    and p_weekday between 1 and 7 and p_time is not null and p_active is not null
    and cardinality(p_students) <= 500
  ) is not true then
    raise exception 'group_invalid';
  end if;
  if not exists (select 1 from public.courses where id = p_course and status = 'published') then
    raise exception 'group_course';
  end if;
  if not exists (
    select 1 from public.teacher_profiles t
    join public.profiles p on p.user_id = t.user_id
    join public.account_roles ar on ar.user_id = t.user_id
    where t.user_id = p_teacher and p.status = 'active' and ar.role_code = 'teacher'
  ) then
    raise exception 'group_teacher';
  end if;

  select coalesce(array_agg(distinct id), '{}'::uuid[]) into selected_students
  from unnest(p_students) as requested(id);
  if exists (
    select 1 from unnest(selected_students) as requested(id)
    where not exists (
      select 1 from public.profiles p join public.account_roles ar on ar.user_id = p.user_id
      where p.user_id = requested.id and p.status = 'active' and ar.role_code = 'student'
    )
  ) then
    raise exception 'group_students';
  end if;

  if saved_group is not null then
    perform 1 from public.learning_groups where id = saved_group for update;
    if not found then raise exception 'group_missing'; end if;
    select count(*) into current_member_count from public.group_members where group_id = saved_group;
    select count(*) into new_member_count from unnest(selected_students) as requested(id)
    where not exists (
      select 1 from public.group_members where group_id = saved_group and student_id = requested.id
    );
  else
    current_member_count := 0;
    new_member_count := cardinality(selected_students);
  end if;
  if current_member_count + new_member_count > p_capacity then
    raise exception 'group_capacity';
  end if;

  if saved_group is null then
    insert into public.learning_groups (course_id, teacher_id, name, capacity, fee_minor, weekday, starts_at_local, timezone, active)
    values (p_course, p_teacher, btrim(p_name), p_capacity, p_fee_minor, p_weekday, p_time, 'Africa/Cairo', p_active)
    returning id into saved_group;
  else
    update public.learning_groups
    set course_id = p_course, teacher_id = p_teacher, name = btrim(p_name), capacity = p_capacity,
        fee_minor = p_fee_minor, weekday = p_weekday, starts_at_local = p_time, timezone = 'Africa/Cairo', active = p_active
    where id = saved_group;
  end if;

  insert into public.group_members (group_id, student_id)
  select saved_group, id from unnest(selected_students) as requested(id)
  on conflict (group_id, student_id) do nothing;

  return saved_group;
end;
$$;

revoke all on function public.save_learning_group(uuid, uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid[]) from public, anon, authenticated;
grant execute on function public.save_learning_group(uuid, uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid[]) to service_role;
