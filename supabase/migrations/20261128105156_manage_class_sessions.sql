begin;

create function public.manage_class_session(
  p_session uuid, p_group uuid, p_teacher uuid, p_title text,
  p_starts_at timestamptz, p_duration integer, p_cancel boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $session$
declare
  actor uuid := auth.uid();
  existing public.class_sessions%rowtype;
  assigned_teacher uuid;
  finish_at timestamptz;
  result_id uuid;
begin
  if not coalesce(liveschool_internal.has_active_role(actor, array['owner', 'admin']), false) then
    raise exception 'session_forbidden' using errcode = '42501';
  end if;

  lock table public.class_sessions in share row exclusive mode;

  if p_session is not null then
    select * into existing from public.class_sessions where id = p_session for update;
    if not found or existing.status <> 'scheduled' or existing.starts_at <= clock_timestamp() then
      raise exception 'session_history_locked' using errcode = '23514';
    end if;
    if p_cancel is true then
      update public.class_sessions set status = 'cancelled' where id = p_session;
      return p_session;
    end if;
    if p_group is distinct from existing.group_id or p_teacher is distinct from existing.teacher_id then
      raise exception 'session_roster_locked' using errcode = '23514';
    end if;
  elsif p_cancel is true then
    raise exception 'session_history_locked' using errcode = '23514';
  end if;

  if p_title is null or char_length(btrim(p_title)) not between 2 and 160
    or p_starts_at is null or not isfinite(p_starts_at) or p_starts_at <= clock_timestamp()
    or p_duration is null or p_duration not between 15 and 480 then
    raise exception 'session_invalid' using errcode = '23514';
  end if;

  select g.teacher_id into assigned_teacher
  from public.learning_groups g where g.id = p_group and g.active for update;
  if not found or assigned_teacher is distinct from p_teacher
    or not coalesce(liveschool_internal.has_active_role(assigned_teacher, array['teacher']), false) then
    raise exception 'session_teacher_group' using errcode = '23514';
  end if;

  finish_at := p_starts_at + make_interval(mins => p_duration);
  if exists (
    select 1 from public.class_sessions s
    where s.id is distinct from p_session and s.status <> 'cancelled'
      and (s.group_id = p_group or s.teacher_id = p_teacher)
      and s.starts_at < finish_at and s.ends_at > p_starts_at
  ) then
    raise exception 'session_conflict' using errcode = '23514';
  end if;

  if p_session is null then
    insert into public.class_sessions (group_id, teacher_id, title, starts_at, ends_at)
    values (p_group, p_teacher, btrim(p_title), p_starts_at, finish_at)
    returning id into result_id;
    if not exists (select 1 from public.session_roster_snapshots where session_id = result_id) then
      raise exception 'session_roster_missing' using errcode = '23514';
    end if;
  else
    update public.class_sessions
    set title = btrim(p_title), starts_at = p_starts_at, ends_at = finish_at
    where id = p_session returning id into result_id;
  end if;
  return result_id;
end;
$session$;

revoke all on function public.manage_class_session(uuid, uuid, uuid, text, timestamptz, integer, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.manage_class_session(uuid, uuid, uuid, text, timestamptz, integer, boolean)
  to authenticated;

commit;
