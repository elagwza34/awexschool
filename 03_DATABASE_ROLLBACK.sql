-- Conservative LiveSchool rollback.
-- Run only with the matching application rollback and explicit operator approval.
-- It removes the unified migration's additive read contracts, not data-protection controls.
-- If attendance, roster, session, or reviewed-enrollment history exists, it aborts.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';

do $rollback_guard$
declare
  protected_count bigint;
begin
  if to_regclass('public.session_roster_snapshots') is not null then
    execute 'select count(*) from public.session_roster_snapshots' into protected_count;
    if protected_count > 0 then
      raise exception 'rollback_refused: % roster snapshots contain important records', protected_count;
    end if;
  end if;

  if to_regclass('public.session_roster_entries') is not null then
    execute 'select count(*) from public.session_roster_entries' into protected_count;
    if protected_count > 0 then
      raise exception 'rollback_refused: % roster entries contain important records', protected_count;
    end if;
  end if;

  if to_regclass('public.session_attendance_events') is not null then
    execute 'select count(*) from public.session_attendance_events' into protected_count;
    if protected_count > 0 then
      raise exception 'rollback_refused: % attendance events contain important records', protected_count;
    end if;
  end if;

  if to_regclass('public.session_attendance') is not null then
    execute 'select count(*) from public.session_attendance' into protected_count;
    if protected_count > 0 then
      raise exception 'rollback_refused: % attendance rows contain important records', protected_count;
    end if;
  end if;

  if to_regclass('public.class_sessions') is not null then
    execute 'select count(*) from public.class_sessions' into protected_count;
    if protected_count > 0 then
      raise exception 'rollback_refused: % class sessions require forward reconciliation', protected_count;
    end if;
  end if;

  if to_regclass('public.course_enrollments') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'course_enrollments' and column_name = 'reviewed_by'
     ) then
    select count(*) into protected_count
    from public.course_enrollments
    where reviewed_by is not null or reviewed_at is not null or status <> 'pending';
    if protected_count > 0 then
      raise exception 'rollback_refused: % reviewed enrollments contain audit history', protected_count;
    end if;
  end if;
end;
$rollback_guard$;

drop policy if exists "Read stages" on public.stages;
drop policy if exists "Read grades" on public.grades;
drop policy if exists "Read subjects" on public.subjects;
drop policy if exists "Read active teacher profiles" on public.teacher_profiles;
drop policy if exists "Read published courses" on public.courses;
drop policy if exists "Read published course units" on public.course_units;
drop policy if exists "Read published lessons" on public.lessons;
drop policy if exists "Read active public groups" on public.learning_groups;
drop policy if exists "Read accessible sessions" on public.class_sessions;
drop policy if exists "Read accessible roster snapshots" on public.session_roster_snapshots;
drop policy if exists "Read accessible roster entries" on public.session_roster_entries;
drop policy if exists "Read accessible attendance" on public.session_attendance;
drop policy if exists "Read accessible attendance events" on public.session_attendance_events;

revoke select on public.stages, public.grades, public.subjects,
  public.courses, public.course_units, public.lessons from anon, authenticated;
revoke select (user_id, subject_id, full_name, qualification, experience_years, bio, portrait_path)
  on public.teacher_profiles from anon, authenticated;
revoke select (id, name, weekday, starts_at_local, timezone, course_id, active)
  on public.learning_groups from anon, authenticated;
revoke select (demo_enabled, social_links) on public.site_settings from anon, authenticated;
revoke select on public.class_sessions, public.session_roster_snapshots,
  public.session_roster_entries, public.session_attendance,
  public.session_attendance_events from authenticated;
revoke execute on function liveschool_internal.is_active_teacher(uuid)
  from public, anon, authenticated, service_role;
revoke usage on schema liveschool_internal from anon;
drop function if exists liveschool_internal.can_access_attendance_session(uuid);

select jsonb_build_object(
  'status', 'safe_delta_rolled_back',
  'removed', jsonb_build_array(
    'anonymous and authenticated catalog read contracts',
    'anonymous teacher-directory helper privileges',
    'attendance read policies and helper routine',
    'public catalog and settings column privileges'
  ),
  'retained_for_safety', jsonb_build_array(
    'JWT-aware enrollment review function',
    'frozen roster and attendance event schema',
    'JWT-aware attendance recording function',
    'group-only text-only chat containment',
    'restrictive history foreign keys',
    'immutable roster and event triggers',
    'minimum service-role privileges',
    'production rls_auto_enable event trigger'
  ),
  'data_removed', false,
  'important_history_present', false
) as rollback_result;

commit;
