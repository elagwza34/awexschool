create or replace function public.record_session_attendance(
  p_session uuid,
  p_student uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
<<record_session_attendance>>
declare
  actor_id uuid := (select auth.uid());
  actor_status text;
  session public.class_sessions%rowtype;
  attendance public.session_attendance%rowtype;
  marked_at timestamptz := clock_timestamp();
begin
  if p_session is null or p_student is null or p_status is null then
    return false;
  end if;
  if p_status not in ('present', 'absent', 'late') then
    return false;
  end if;
  if actor_id is null then
    raise exception 'attendance_forbidden' using errcode = '42501';
  end if;

  select p.status into actor_status
  from public.profiles p
  where p.user_id = actor_id
  for update;
  if not found or actor_status <> 'active' then
    raise exception 'attendance_forbidden' using errcode = '42501';
  end if;

  perform 1 from public.account_roles r where r.user_id = actor_id for update;
  if not exists (
    select 1 from public.account_roles r
    where r.user_id = actor_id and r.role_code = 'teacher'
  ) then
    raise exception 'attendance_forbidden' using errcode = '42501';
  end if;

  select s.* into session
  from public.class_sessions s
  where s.id = p_session
  for update;
  if not found
     or session.teacher_id <> actor_id
     or session.status = 'cancelled'
     or session.starts_at > marked_at then
    return false;
  end if;

  if not exists (
    select 1 from public.session_roster_snapshots rs where rs.session_id = p_session
  ) then
    return false;
  end if;

  perform 1
  from public.session_roster_entries re
  where re.session_id = p_session and re.student_id = p_student
  for update;
  if not found then
    return false;
  end if;

  select sa.* into attendance
  from public.session_attendance sa
  where sa.session_id = p_session and sa.student_id = p_student
  for update;

  if found and attendance.status = p_status then
    return true;
  end if;

  if found then
    update public.session_attendance sa
    set status = p_status,
        marked_at = record_session_attendance.marked_at,
        marked_by = actor_id
    where sa.session_id = p_session and sa.student_id = p_student;
  else
    insert into public.session_attendance (session_id, student_id, status, marked_at, marked_by)
    values (p_session, p_student, p_status, marked_at, actor_id);
  end if;

  insert into public.session_attendance_events (
    session_id, student_id, previous_status, new_status, marked_by, marked_at
  ) values (
    p_session, p_student, attendance.status, p_status, actor_id, marked_at
  );

  return true;
end;
$function$;
