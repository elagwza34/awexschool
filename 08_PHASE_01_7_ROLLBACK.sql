-- PHASE 01.7 OPERATOR-CONTROLLED ROLLBACK / FORWARD RECOVERY.
-- MANUAL SUPABASE SQL EDITOR EXECUTION ONLY — NOT APPROVED OR EXECUTED.
-- Default behavior is refusal. No production data, Auth accounts, baseline tables,
-- canonical migration history, or Phase 01.6 attendance controls are removed.
--
-- Before running, set both session settings in the same SQL Editor session:
--   select set_config('liveschool.phase_01_7_application_stopped', 'true', false);
--   select set_config('liveschool.phase_01_7_rollback_approval', 'phase_01_7_operator_approved', false);
--   select set_config('liveschool.phase_01_7_rollback_mode', 'post_write_forward', false);
-- Use 'pre_write_inverse' only when every new-data guard below is zero and the
-- matching pre-Phase-01.7 application is ready to run. That mode restores known
-- baseline behavior and therefore restores the baseline's previously identified risks.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

lock table public.courses, public.course_enrollments, public.learning_groups,
  public.group_members, public.group_join_requests, public.group_payments,
  public.teacher_applications, public.lessons, public.course_units,
  auth.users, supabase_migrations.schema_migrations
  in share row exclusive mode;

do $rollback$
declare
  v_mode text := current_setting('liveschool.phase_01_7_rollback_mode', true);
  v_approval text := current_setting('liveschool.phase_01_7_rollback_approval', true);
  v_application_stopped text := current_setting('liveschool.phase_01_7_application_stopped', true);
  v_authoritative_enrollments bigint;
  v_intake_identities bigint;
  v_review_events bigint;
  v_challenges bigint;
  v_rate_limits bigint;
begin
  if v_approval is distinct from 'phase_01_7_operator_approved' then
    raise exception 'rollback_refused_operator_approval_required';
  end if;
  if v_application_stopped is distinct from 'true' then
    raise exception 'rollback_refused_application_must_be_stopped';
  end if;
  if v_mode is null or v_mode not in ('pre_write_inverse', 'post_write_forward') then
    raise exception 'rollback_refused_invalid_mode';
  end if;
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'rollback_refused_postgresql_17_required';
  end if;

  if to_regclass('public.course_enrollment_review_events') is null
     or to_regclass('public.teacher_intake_challenges') is null
     or to_regclass('public.teacher_intake_rate_limits') is null
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'course_enrollments' and column_name = 'student_id'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'teacher_applications' and column_name = 'requester_id'
     ) then
    raise exception 'rollback_refused_schema_mismatch';
  end if;

  select count(*) into v_authoritative_enrollments
  from public.course_enrollments where student_id is not null;
  select count(*) into v_intake_identities
  from public.teacher_applications where requester_id is not null or email_verified_at is not null;
  select count(*) into v_review_events from public.course_enrollment_review_events;
  select count(*) into v_challenges from public.teacher_intake_challenges;
  select count(*) into v_rate_limits from public.teacher_intake_rate_limits;

  if v_mode = 'post_write_forward' then
    perform set_config('liveschool.phase_01_7_rollback_result', jsonb_build_object(
      'status', 'forward_reconciliation_required',
      'mode', v_mode,
      'data_removed', false,
      'preserve_authoritative_identity', true,
      'preserve_review_events', true,
      'preserve_intake_history', true,
      'preserve_auth_accounts', true,
      'preserve_migration_history', true,
      'counts', jsonb_build_object(
        'authoritative_enrollments', v_authoritative_enrollments,
        'intake_identities', v_intake_identities,
        'review_events', v_review_events,
        'challenges', v_challenges,
        'rate_limits', v_rate_limits
      ),
      'required_action', 'Keep the Phase 01.7 schema and matching application; run 07_PHASE_01_7_VERIFICATION.sql and reconcile forward.'
    )::text, true);
    return;
  end if;

  if v_authoritative_enrollments > 0 then
    raise exception 'rollback_refused_new_authoritative_enrollment: %', v_authoritative_enrollments;
  end if;
  if v_intake_identities > 0 then
    raise exception 'rollback_refused_new_intake_identity: %', v_intake_identities;
  end if;
  if v_review_events > 0 then
    raise exception 'rollback_refused_new_review_history: %', v_review_events;
  end if;
  if v_challenges > 0 or v_rate_limits > 0 then
    raise exception 'rollback_refused_new_intake_history: challenges=%, rate_limits=%', v_challenges, v_rate_limits;
  end if;

  drop trigger if exists course_archive_enrollment_guard on public.courses;
  drop trigger if exists enrollment_identity_guard on public.course_enrollments;
  drop trigger if exists group_member_enrollment_guard on public.group_members;
  drop trigger if exists group_course_member_enrollment_guard on public.learning_groups;
  drop trigger if exists group_request_lifecycle_guard on public.group_join_requests;
  drop trigger if exists group_member_capacity_guard on public.group_members;
  drop trigger if exists group_request_capacity_guard on public.group_join_requests;
  drop trigger if exists group_capacity_change_guard on public.learning_groups;
  drop trigger if exists enrollment_review_events_immutable on public.course_enrollment_review_events;

  revoke all on function public.request_course_enrollment(uuid, uuid) from public, anon, authenticated, service_role;
  revoke all on function public.acknowledge_legacy_enrollment_as_admin(uuid, uuid, text) from public, anon, authenticated, service_role;
  revoke all on function public.save_learning_group(uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid[]) from public, anon, authenticated, service_role;
  revoke all on function public.complete_teacher_onboarding(uuid, uuid, jsonb) from public, anon, authenticated, service_role;
  revoke all on function public.submit_teacher_application(uuid, text, jsonb) from public, anon, authenticated, service_role;
  revoke all on function public.track_teacher_application(uuid) from public, anon, authenticated, service_role;
  revoke all on function public.review_teacher_application_as_admin(uuid, text) from public, anon, authenticated, service_role;
  revoke all on function public.reserve_group_seat(uuid) from public, anon, authenticated, service_role;
  revoke all on function public.approve_group_join_request_as_admin(uuid) from public, anon, authenticated, service_role;

  drop function public.request_course_enrollment(uuid, uuid);
  drop function public.acknowledge_legacy_enrollment_as_admin(uuid, uuid, text);
  drop function public.save_learning_group(uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid[]);
  drop function public.complete_teacher_onboarding(uuid, uuid, jsonb);
  drop function public.submit_teacher_application(uuid, text, jsonb);
  drop function public.track_teacher_application(uuid);
  drop function public.review_teacher_application_as_admin(uuid, text);
  drop function public.reserve_group_seat(uuid);
  drop function public.approve_group_join_request_as_admin(uuid);
  revoke all on function public.can_read_course_lessons(uuid) from public, anon, authenticated, service_role;
  drop function if exists public.can_read_course_lessons(uuid);

  drop policy if exists "Read authorized course lessons" on public.lessons;
  drop policy if exists "Requesters can read their unresolved legacy enrollments" on public.course_enrollments;
  drop policy if exists "Students can read their authoritative enrollments" on public.course_enrollments;
  drop policy if exists "Guardians can read linked student enrollments" on public.course_enrollments;
  drop policy if exists "Administrators can read course enrollments" on public.course_enrollments;
  drop policy if exists "Requesters can read their own teacher applications" on public.teacher_applications;
  drop policy if exists "Administrators can read teacher applications" on public.teacher_applications;
  drop policy if exists "Administrators can read enrollment review events" on public.course_enrollment_review_events;

  drop function if exists liveschool_internal.has_active_role(uuid, text[]);
  drop function if exists liveschool_internal.has_active_course_enrollment(uuid, uuid);
  drop function if exists liveschool_internal.can_read_course_lessons(uuid);
  drop function if exists liveschool_internal.group_occupied_seats(uuid, timestamptz);
  drop function if exists liveschool_internal.consume_teacher_intake_limit(text, text, integer, interval);
  drop function if exists liveschool_internal.validate_enrollment_identity();
  drop function if exists liveschool_internal.prevent_course_archive_with_active_enrollments();
  drop function if exists liveschool_internal.validate_group_member_enrollment();
  drop function if exists liveschool_internal.validate_group_course_members();
  drop function if exists liveschool_internal.prepare_group_request_write();
  drop function if exists liveschool_internal.enforce_group_capacity();
  drop function if exists liveschool_internal.expire_group_reservations();
  drop function if exists liveschool_internal.reject_enrollment_review_event_mutation();

  drop view if exists public.course_enrollment_review_audit;
  drop table if exists public.course_enrollment_review_events;
  drop table if exists public.teacher_intake_challenges;
  drop table if exists public.teacher_intake_rate_limits;

  alter table public.course_enrollments drop column if exists student_id;
  alter table public.teacher_applications drop column if exists requester_id;
  alter table public.teacher_applications drop column if exists email_verified_at;

  revoke all on function public.review_course_enrollment_as_admin(uuid, uuid, text) from public, anon, authenticated, service_role;
  drop function public.review_course_enrollment_as_admin(uuid, uuid, text);

  create or replace function public.review_course_enrollment_as_admin(
    p_course uuid,
    p_requester uuid,
    p_status text
  )
  returns boolean
  language plpgsql
  security definer
  set search_path = ''
  as $function$
  declare
    actor_id uuid := (select auth.uid());
    actor_status text;
    course_status text;
    enrollment public.course_enrollments%rowtype;
    changed_count integer;
  begin
    if p_course is null or p_requester is null or p_status is null then
      return false;
    end if;
    if p_status not in ('active', 'declined') then
      return false;
    end if;
    if actor_id is null then
      raise exception 'enrollment_forbidden' using errcode = '42501';
    end if;

    select p.status into actor_status
    from public.profiles p
    where p.user_id = actor_id
    for update;
    if not found or actor_status <> 'active' then
      raise exception 'enrollment_forbidden' using errcode = '42501';
    end if;

    perform 1 from public.account_roles r where r.user_id = actor_id for update;
    if not exists (
      select 1 from public.account_roles r
      where r.user_id = actor_id and r.role_code in ('admin', 'owner')
    ) then
      raise exception 'enrollment_forbidden' using errcode = '42501';
    end if;

    select c.status into course_status
    from public.courses c
    where c.id = p_course
    for update;
    if not found then
      return false;
    end if;

    select e.* into enrollment
    from public.course_enrollments e
    where e.course_id = p_course and e.requester_id = p_requester
    for update;
    if not found then
      return false;
    end if;

    if enrollment.status = p_status and enrollment.reviewed_by = actor_id then
      return true;
    end if;
    if enrollment.status <> 'pending' then
      return false;
    end if;
    if p_status = 'active' and course_status <> 'published' then
      return false;
    end if;

    update public.course_enrollments e
    set status = p_status, reviewed_by = actor_id, reviewed_at = clock_timestamp()
    where e.course_id = p_course and e.requester_id = p_requester and e.status = 'pending';
    get diagnostics changed_count = row_count;
    return changed_count = 1;
  end;
  $function$;

  create or replace function public.save_learning_group(
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
  as $function$
  declare
    saved_group uuid := p_group;
    selected_students uuid[];
    current_member_count integer;
    new_member_count integer;
  begin
    if not exists (
      select 1
      from public.account_roles ar
      join public.profiles p on p.user_id = ar.user_id
      where ar.user_id = p_actor and ar.role_code in ('admin', 'owner') and p.status = 'active'
    ) then
      raise exception 'group_forbidden' using errcode = '42501';
    end if;

    if (
      length(btrim(p_name)) between 2 and 160
      and p_capacity between 1 and 500 and p_fee_minor between 0 and 99999999
      and p_weekday between 1 and 7 and p_time is not null and p_active is not null
      and cardinality(p_students) <= 500
    ) is not true then
      raise exception 'group_invalid' using errcode = '22023';
    end if;

    if not exists (select 1 from public.courses where id = p_course and status = 'published') then
      raise exception 'group_course' using errcode = '23514';
    end if;

    if not exists (
      select 1
      from public.teacher_profiles t
      join public.profiles p on p.user_id = t.user_id
      join public.account_roles ar on ar.user_id = t.user_id
      where t.user_id = p_teacher and p.status = 'active' and ar.role_code = 'teacher'
    ) then
      raise exception 'group_teacher' using errcode = '23514';
    end if;

    select coalesce(array_agg(distinct id), '{}'::uuid[]) into selected_students
    from unnest(p_students) as requested(id);

    if exists (
      select 1
      from unnest(selected_students) as requested(id)
      where not exists (
        select 1
        from public.profiles p
        join public.account_roles ar on ar.user_id = p.user_id
        where p.user_id = requested.id and p.status = 'active' and ar.role_code = 'student'
      )
    ) then
      raise exception 'group_students' using errcode = '23514';
    end if;

    if saved_group is not null then
      perform 1 from public.learning_groups where id = saved_group for update;
      if not found then raise exception 'group_missing' using errcode = '23503'; end if;
      select count(*) into current_member_count from public.group_members where group_id = saved_group;
      select count(*) into new_member_count
      from unnest(selected_students) as requested(id)
      where not exists (
        select 1 from public.group_members
        where group_id = saved_group and student_id = requested.id
      );
    else
      current_member_count := 0;
      new_member_count := cardinality(selected_students);
    end if;

    if current_member_count + new_member_count > p_capacity then
      raise exception 'group_capacity' using errcode = '23514';
    end if;

    if saved_group is null then
      insert into public.learning_groups (
        course_id, teacher_id, name, capacity, fee_minor, weekday, starts_at_local, timezone, active
      ) values (
        p_course, p_teacher, btrim(p_name), p_capacity, p_fee_minor, p_weekday, p_time, 'Africa/Cairo', p_active
      ) returning id into saved_group;
    else
      update public.learning_groups
      set course_id = p_course, teacher_id = p_teacher, name = btrim(p_name), capacity = p_capacity,
          fee_minor = p_fee_minor, weekday = p_weekday, starts_at_local = p_time,
          timezone = 'Africa/Cairo', active = p_active
      where id = saved_group;
    end if;

    insert into public.group_members (group_id, student_id)
    select saved_group, id from unnest(selected_students) as requested(id)
    on conflict (group_id, student_id) do nothing;

    return saved_group;
  end;
  $function$;

  create or replace function public.complete_teacher_onboarding(
    p_actor uuid, p_user uuid, p_application uuid, p_profile jsonb
  )
  returns void
  language plpgsql
  security definer
  set search_path = ''
  as $function$
  begin
    if not exists (
      select 1
      from public.account_roles r
      join public.profiles p on p.user_id = r.user_id
      where r.user_id = p_actor and r.role_code in ('admin', 'owner') and p.status = 'active'
    ) then
      raise exception 'teacher_forbidden' using errcode = '42501';
    end if;

    if p_application is not null then
      perform 1
      from public.teacher_applications a
      join auth.users u on u.id = p_user
      where a.id = p_application
        and a.status in ('pending', 'accepted')
        and a.teacher_user_id is null
        and lower(a.email) = lower(u.email)
      for update of a;
      if not found then raise exception 'teacher_application_unavailable' using errcode = '23514'; end if;
    end if;

    if not public.assign_created_account_role(p_user, 'teacher') then
      raise exception 'teacher_role_failed' using errcode = '23514';
    end if;

    insert into public.teacher_profiles (
      user_id, subject_id, full_name, qualification, experience_years, bio,
      portrait_path, onboarding_details
    ) values (
      p_user, p_profile->>'subject', p_profile->>'fullName', p_profile->>'qualification',
      (p_profile->>'experience')::smallint, p_profile->>'bio', nullif(p_profile->>'portrait', ''),
      jsonb_build_object(
        'phone', p_profile->>'phone', 'governorate', p_profile->>'governorate',
        'approach', p_profile->>'approach', 'grades', p_profile->'grades', 'video', p_profile->>'video'
      )
    );

    if p_application is not null then
      update public.teacher_applications
      set status = 'accepted', teacher_user_id = p_user
      where id = p_application;
    end if;
  end;
  $function$;

  create policy "Read published lessons" on public.lessons
    for select to anon, authenticated
    using (
      exists (
        select 1
        from public.course_units u
        join public.courses c on c.id = u.course_id
        where u.id = lessons.unit_id and c.status = 'published'
      )
    );
  create policy "Requesters can read their own course enrollments" on public.course_enrollments
    for select to authenticated using ((select auth.uid()) = requester_id);

  grant select on public.lessons to anon;
  grant select, insert on public.teacher_applications to service_role;
  grant update (status) on public.teacher_applications to service_role;
  grant select, insert on public.course_enrollments to service_role;
  revoke all on function public.review_course_enrollment_as_admin(uuid, uuid, text)
    from public, anon, authenticated, service_role;
  grant execute on function public.review_course_enrollment_as_admin(uuid, uuid, text) to authenticated;
  revoke all on function public.save_learning_group(uuid, uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid[])
    from public, anon, authenticated, service_role;
  revoke all on function public.complete_teacher_onboarding(uuid, uuid, uuid, jsonb)
    from public, anon, authenticated, service_role;
  grant execute on function public.save_learning_group(uuid, uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid[]) to service_role;
  grant execute on function public.complete_teacher_onboarding(uuid, uuid, uuid, jsonb) to service_role;

  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'class_sessions'
      and t.tgname = 'session_roster_capture' and t.tgenabled = 'O'
      and t.tgfoid = to_regprocedure('liveschool_internal.capture_session_roster_on_insert()')::oid
  ) then
    raise exception 'rollback_refused_attendance_baseline_control_missing';
  end if;
  if not exists (
    select 1 from supabase_migrations.schema_migrations where version = '20261124010000'
  ) then
    raise exception 'rollback_refused_migration_history_missing';
  end if;

  perform set_config('liveschool.phase_01_7_rollback_result', jsonb_build_object(
    'status', 'pre_write_inverse_completed',
    'mode', v_mode,
    'data_removed', false,
    'baseline_tables_preserved', true,
    'auth_accounts_preserved', true,
    'migration_history_preserved', true,
    'attendance_controls_preserved', true,
    'new_data_guard_counts', jsonb_build_object(
      'authoritative_enrollments', v_authoritative_enrollments,
      'intake_identities', v_intake_identities,
      'review_events', v_review_events,
      'challenges', v_challenges,
      'rate_limits', v_rate_limits
    ),
    'warning', 'The matching pre-Phase-01.7 application and its known baseline risks are restored. Do not run the Phase 01.7 application against this schema.'
  )::text, true);
end;
$rollback$;

select current_setting('liveschool.phase_01_7_rollback_result', true)::jsonb as result;

commit;
