begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';

create temporary table phase02_row_counts (
  schema_name text not null,
  table_name text not null,
  row_count bigint not null,
  primary key (schema_name, table_name)
) on commit drop;
create temporary table phase02_catalog_contract (contract jsonb not null) on commit drop;

lock table
  public.profiles,
  public.account_roles,
  public.guardian_links,
  public.course_enrollments,
  public.teacher_intake_challenges,
  public.teacher_intake_rate_limits,
  public.teacher_applications,
  public.class_sessions,
  public.session_roster_snapshots,
  public.session_roster_entries,
  public.session_attendance,
  public.session_attendance_events,
  public.course_enrollment_review_audit
in share row exclusive mode;

do $capture_preservation_contract$
declare
  relation record;
  current_count bigint;
begin
  for relation in
    select n.nspname as schema_name, c.relname as table_name
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
    order by n.nspname, c.relname
  loop
    execute format('select count(*) from %I.%I', relation.schema_name, relation.table_name)
      into current_count;
    insert into phase02_row_counts (schema_name, table_name, row_count)
    values (relation.schema_name, relation.table_name, current_count);
  end loop;

  insert into phase02_catalog_contract (contract)
  select jsonb_build_object(
    'table_acls', (
      select jsonb_agg(jsonb_build_object(
        'schema', n.nspname, 'name', c.relname, 'owner', pg_catalog.pg_get_userbyid(c.relowner),
        'acl', c.relacl, 'rls', c.relrowsecurity, 'forced_rls', c.relforcerowsecurity
      ) order by n.nspname, c.relname)
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p', 'v')
        and c.relname <> 'course_enrollment_review_audit'
    ),
    'column_contracts', (
      select jsonb_agg(jsonb_build_object(
        'schema', n.nspname, 'table', c.relname, 'column', a.attname,
        'type', pg_catalog.format_type(a.atttypid, a.atttypmod), 'not_null', a.attnotnull,
        'default', pg_catalog.pg_get_expr(d.adbin, d.adrelid), 'acl', a.attacl
      ) order by n.nspname, c.relname, a.attnum)
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      left join pg_catalog.pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where n.nspname = 'public' and c.relkind in ('r', 'p')
        and a.attnum > 0 and not a.attisdropped
    ),
    'challenge_foreign_keys', (
      select jsonb_agg(jsonb_build_object(
        'name', con.conname, 'definition', pg_catalog.pg_get_constraintdef(con.oid)
      ) order by con.conname)
      from pg_catalog.pg_constraint con
      where con.conrelid = 'public.teacher_intake_challenges'::regclass and con.contype = 'f'
    )
  );
end;
$capture_preservation_contract$;

do $preflight$
declare
  relation_name text;
begin
  if to_regprocedure('liveschool_internal.has_active_role(uuid, text[])') is null
     or to_regprocedure('liveschool_internal.can_read_course_lessons(uuid)') is null
     or to_regprocedure('liveschool_internal.can_access_attendance_session(uuid)') is null
     or to_regprocedure('liveschool_internal.consume_teacher_intake_limit(text, text, integer, interval)') is null
     or to_regprocedure('public.track_teacher_application(uuid)') is null then
    raise exception 'phase02_authorization_baseline_missing';
  end if;

  foreach relation_name in array array[
    'public.profiles',
    'public.account_roles',
    'public.guardian_links',
    'public.course_enrollments',
    'public.teacher_applications',
    'public.teacher_intake_challenges',
    'public.teacher_intake_rate_limits',
    'public.class_sessions',
    'public.session_roster_snapshots',
    'public.session_roster_entries',
    'public.session_attendance',
    'public.session_attendance_events'
  ] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = split_part(relation_name, '.', 1)
        and c.relname = split_part(relation_name, '.', 2)
        and c.relkind in ('r', 'p')
        and c.relrowsecurity
    ) then
      raise exception 'phase02_rls_baseline_missing: %', relation_name;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'course_enrollment_review_audit'
      and c.relkind = 'v'
      and c.reloptions @> array['security_invoker=true']
  ) then
    raise exception 'phase02_audit_view_baseline_missing';
  end if;

  if not has_column_privilege('service_role', 'public.course_assignment_submissions', 'feedback', 'UPDATE') then
    raise exception 'phase02_feedback_column_grant_missing';
  end if;
end;
$preflight$;

create or replace function liveschool_internal.can_read_course_lessons(p_course_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  course_status text;
  course_teacher uuid;
begin
  if actor_id is null then
    return false;
  end if;

  select c.status, c.teacher_id into course_status, course_teacher
  from public.courses c
  where c.id = p_course_id;
  if not found or course_status <> 'published' then
    return false;
  end if;

  if liveschool_internal.has_active_role(actor_id, array['admin', 'owner']) then
    return true;
  end if;
  if liveschool_internal.has_active_role(actor_id, array['teacher'])
     and (
       course_teacher = actor_id
       or exists (
         select 1
         from public.learning_groups lg
         where lg.course_id = p_course_id
           and lg.teacher_id = actor_id
           and lg.active = true
       )
     ) then
    return true;
  end if;
  if liveschool_internal.has_active_role(actor_id, array['student'])
     and exists (
       select 1
       from public.course_enrollments e
       where e.course_id = p_course_id
         and e.status = 'active'
         and e.student_id = actor_id
     ) then
    return true;
  end if;
  if liveschool_internal.has_active_role(actor_id, array['parent'])
     and exists (
       select 1
       from public.course_enrollments e
       join public.guardian_links gl on gl.student_id = e.student_id
       where e.course_id = p_course_id
         and e.status = 'active'
         and gl.guardian_id = actor_id
         and liveschool_internal.has_active_role(e.student_id, array['student'])
     ) then
    return true;
  end if;
  return false;
end;
$function$;

create or replace function liveschool_internal.can_access_attendance_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.class_sessions s
    where s.id = p_session_id
      and (
        (
          s.teacher_id = (select auth.uid())
          and liveschool_internal.has_active_role((select auth.uid()), array['teacher'])
        )
        or exists (
          select 1
          from public.session_roster_entries re
          where re.session_id = s.id
            and re.student_id = (select auth.uid())
            and liveschool_internal.has_active_role(re.student_id, array['student'])
        )
        or exists (
          select 1
          from public.session_roster_entries re
          join public.guardian_links gl on gl.student_id = re.student_id
          where re.session_id = s.id
            and gl.guardian_id = (select auth.uid())
            and liveschool_internal.has_active_role(gl.guardian_id, array['parent'])
            and liveschool_internal.has_active_role(re.student_id, array['student'])
        )
      )
  );
$function$;

create or replace function liveschool_internal.can_read_attendance_row(
  p_session_id uuid,
  p_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.class_sessions s
    where s.id = p_session_id
      and (
        (
          s.teacher_id = (select auth.uid())
          and liveschool_internal.has_active_role((select auth.uid()), array['teacher'])
        )
        or exists (
          select 1
          from public.session_roster_entries re
          where re.session_id = s.id
            and re.student_id = p_student_id
            and re.student_id = (select auth.uid())
            and liveschool_internal.has_active_role(re.student_id, array['student'])
        )
        or exists (
          select 1
          from public.session_roster_entries re
          join public.guardian_links gl on gl.student_id = re.student_id
          where re.session_id = s.id
            and re.student_id = p_student_id
            and gl.guardian_id = (select auth.uid())
            and liveschool_internal.has_active_role(gl.guardian_id, array['parent'])
            and liveschool_internal.has_active_role(re.student_id, array['student'])
        )
      )
  );
$function$;

revoke all on function liveschool_internal.can_read_course_lessons(uuid) from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.can_access_attendance_session(uuid) from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.can_read_attendance_row(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function liveschool_internal.can_read_course_lessons(uuid) to authenticated;
grant execute on function liveschool_internal.can_access_attendance_session(uuid) to authenticated;
grant execute on function liveschool_internal.can_read_attendance_row(uuid, uuid) to authenticated;

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and liveschool_internal.has_active_role(
      (select auth.uid()),
      array['owner', 'admin', 'manager', 'support', 'teacher', 'student', 'parent']
    )
  );

drop policy if exists "Guardians can read linked student profiles" on public.profiles;
create policy "Guardians can read linked student profiles" on public.profiles
  for select to authenticated
  using (
    liveschool_internal.has_active_role((select auth.uid()), array['parent'])
    and liveschool_internal.has_active_role(profiles.user_id, array['student'])
    and exists (
      select 1
      from public.guardian_links gl
      where gl.guardian_id = (select auth.uid())
        and gl.student_id = profiles.user_id
    )
  );

drop policy if exists "Guardians can read their links" on public.guardian_links;
create policy "Guardians can read their links" on public.guardian_links
  for select to authenticated
  using (
    guardian_id = (select auth.uid())
    and liveschool_internal.has_active_role((select auth.uid()), array['parent'])
    and liveschool_internal.has_active_role(guardian_links.student_id, array['student'])
  );

drop policy if exists "Read own roles" on public.account_roles;
create policy "Read own roles" on public.account_roles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and liveschool_internal.has_active_role(
      (select auth.uid()),
      array['owner', 'admin', 'manager', 'support', 'teacher', 'student', 'parent']
    )
  );

drop policy if exists "Requesters can read their unresolved legacy enrollments" on public.course_enrollments;
create policy "Requesters can read their unresolved legacy enrollments" on public.course_enrollments
  for select to authenticated
  using (
    student_id is null
    and requester_id = (select auth.uid())
    and liveschool_internal.has_active_role(
      (select auth.uid()),
      array['owner', 'admin', 'manager', 'support', 'teacher', 'student', 'parent']
    )
  );

drop policy if exists "Students can read their authoritative enrollments" on public.course_enrollments;
create policy "Students can read their authoritative enrollments" on public.course_enrollments
  for select to authenticated
  using (
    student_id = (select auth.uid())
    and liveschool_internal.has_active_role((select auth.uid()), array['student'])
  );

drop policy if exists "Guardians can read linked student enrollments" on public.course_enrollments;
create policy "Guardians can read linked student enrollments" on public.course_enrollments
  for select to authenticated
  using (
    liveschool_internal.has_active_role((select auth.uid()), array['parent'])
    and liveschool_internal.has_active_role(course_enrollments.student_id, array['student'])
    and exists (
      select 1
      from public.guardian_links gl
      where gl.guardian_id = (select auth.uid())
        and gl.student_id = course_enrollments.student_id
    )
  );

drop policy if exists "Requesters can read their own teacher applications" on public.teacher_applications;
create policy "Requesters can read their own teacher applications" on public.teacher_applications
  for select to authenticated
  using (
    requester_id = (select auth.uid())
    and liveschool_internal.has_active_role(
      (select auth.uid()),
      array['owner', 'admin', 'manager', 'support', 'teacher', 'student', 'parent']
    )
  );

drop policy if exists "Read accessible roster entries" on public.session_roster_entries;
create policy "Read accessible roster entries" on public.session_roster_entries
  for select to authenticated
  using (liveschool_internal.can_read_attendance_row(session_roster_entries.session_id, session_roster_entries.student_id));

drop policy if exists "Read accessible attendance" on public.session_attendance;
create policy "Read accessible attendance" on public.session_attendance
  for select to authenticated
  using (liveschool_internal.can_read_attendance_row(session_attendance.session_id, session_attendance.student_id));

drop policy if exists "Read accessible attendance events" on public.session_attendance_events;
create policy "Read accessible attendance events" on public.session_attendance_events
  for select to authenticated
  using (liveschool_internal.can_read_attendance_row(session_attendance_events.session_id, session_attendance_events.student_id));

revoke all on table public.course_enrollment_review_audit from public, anon, authenticated, service_role;
grant select on table public.course_enrollment_review_audit to authenticated;

do $teacher_intake_preflight$
declare
  expected_functions text[] := array[
    'liveschool_internal.consume_teacher_intake_limit(text,text,integer,interval)',
    'public.track_teacher_application(uuid)'
  ];
  expected_function text;
begin
  foreach expected_function in array expected_functions loop
    if not exists (
      select 1
      from pg_proc p
      where p.oid = expected_function::regprocedure
        and p.prosecdef
        and pg_get_userbyid(p.proowner) = 'postgres'
        and exists (select 1 from unnest(p.proconfig) as setting where setting = 'search_path=""')
    ) then
      raise exception 'phase02_teacher_intake_function_baseline_missing: %', expected_function;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_constraint con
    where con.conrelid = 'public.teacher_intake_challenges'::regclass
      and con.conname = 'teacher_intake_challenges_application_id_fkey'
      and con.contype = 'f'
      and con.confrelid = 'public.teacher_applications'::regclass
      and con.conkey = array[(select attnum from pg_attribute where attrelid = 'public.teacher_intake_challenges'::regclass and attname = 'application_id')]::smallint[]
  ) then
    raise exception 'phase02_teacher_intake_reference_fk_baseline_missing';
  end if;

  if exists (
    select 1
    from pg_constraint con
    where con.conrelid = 'public.teacher_intake_challenges'::regclass
      and con.contype = 'f'
      and con.confrelid = 'public.teacher_applications'::regclass
      and con.conname <> 'teacher_intake_challenges_application_id_fkey'
  ) then
    raise exception 'phase02_teacher_intake_unexpected_reference_fk';
  end if;
end;
$teacher_intake_preflight$;

create or replace function liveschool_internal.consume_teacher_intake_limit(
  p_scope text,
  p_subject_key text,
  p_max_attempts integer,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  observed_at timestamptz := clock_timestamp();
  counter public.teacher_intake_rate_limits%rowtype;
begin
  loop
    select * into counter
    from public.teacher_intake_rate_limits
    where scope = p_scope
      and subject_key = p_subject_key
    for update;

    if found then
      if counter.window_started_at <= observed_at - p_window then
        update public.teacher_intake_rate_limits
        set window_started_at = observed_at,
            attempt_count = 1
        where scope = p_scope
          and subject_key = p_subject_key;
        return true;
      end if;
      if counter.attempt_count >= p_max_attempts then
        return false;
      end if;
      update public.teacher_intake_rate_limits
      set attempt_count = attempt_count + 1
      where scope = p_scope
        and subject_key = p_subject_key;
      return true;
    end if;

    begin
      insert into public.teacher_intake_rate_limits (scope, subject_key, window_started_at, attempt_count)
      values (p_scope, p_subject_key, observed_at, 1);
      return true;
    exception when unique_violation then
      null;
    end;
  end loop;
end;
$function$;

create or replace function public.consume_teacher_tracking_admission(
  p_actor_id uuid,
  p_ip_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  if p_actor_id is not null and not exists (
    select 1 from auth.users u
    where u.id = p_actor_id and u.email_confirmed_at is not null
  ) then
    return false;
  end if;
  if p_actor_id is not null
     and not liveschool_internal.consume_teacher_intake_limit('track', 'user:' || p_actor_id::text, 30, interval '1 hour') then
    return false;
  end if;
  return liveschool_internal.consume_teacher_intake_limit('track', 'ip:' || p_ip_hash, 30, interval '1 hour');
end;
$function$;

create or replace function public.discard_teacher_intake_challenge(p_challenge uuid)
returns void
language sql
security definer
set search_path = ''
as $function$
  delete from public.teacher_intake_challenges
  where id = p_challenge and purpose in ('submit', 'track');
$function$;

revoke all on function public.consume_teacher_tracking_admission(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.discard_teacher_intake_challenge(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.consume_teacher_tracking_admission(uuid, text) to service_role;
grant execute on function public.discard_teacher_intake_challenge(uuid) to service_role;

create or replace function public.track_teacher_application(p_challenge uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  challenge public.teacher_intake_challenges%rowtype;
  application public.teacher_applications%rowtype;
  expected_email_hash text;
begin
  select * into challenge from public.teacher_intake_challenges
  where id = p_challenge for update;
  if not found or challenge.purpose <> 'track'
     or challenge.actor_id is distinct from actor_id
     or challenge.consumed_at is not null or challenge.expires_at <= clock_timestamp() then
    return null;
  end if;

  update public.teacher_intake_challenges
  set consumed_at = clock_timestamp()
  where id = p_challenge;

  delete from public.teacher_intake_challenges
  where ctid in (
    select stale.ctid
    from public.teacher_intake_challenges stale
    where (stale.consumed_at is not null and stale.consumed_at <= clock_timestamp() - interval '1 hour')
       or (stale.consumed_at is null and stale.expires_at <= clock_timestamp() - interval '1 hour')
    limit 1000
  );

  delete from public.teacher_intake_rate_limits
  where ctid in (
    select stale.ctid
    from public.teacher_intake_rate_limits stale
    where (stale.scope = 'track' and stale.window_started_at <= clock_timestamp() - interval '1 hour')
       or (stale.scope = 'submit' and stale.window_started_at <= clock_timestamp() - interval '24 hours')
    limit 1000
  );

  if actor_id is not null
     and not liveschool_internal.consume_teacher_intake_limit('track', 'user:' || actor_id::text, 30, interval '1 hour') then
    return null;
  end if;
  if not liveschool_internal.consume_teacher_intake_limit('track', 'ip:' || challenge.ip_hash, 30, interval '1 hour') then
    return null;
  end if;

  select * into application from public.teacher_applications
  where id = challenge.application_id for update;
  if not found then
    return null;
  end if;

  if application.requester_id is not null then
    if actor_id is null or application.requester_id <> actor_id
       or not liveschool_internal.has_active_role(actor_id, array['student', 'parent'])
       or not exists (select 1 from auth.users where id = actor_id and email_confirmed_at is not null) then
      return null;
    end if;
  else
    expected_email_hash := encode(
      pg_catalog.sha256(pg_catalog.convert_to(lower(btrim(application.email)), 'UTF8')),
      'hex'
    );
    if expected_email_hash is distinct from challenge.email_hash then
      return null;
    end if;
  end if;

  return application.status;
end;
$function$;

revoke all on function liveschool_internal.consume_teacher_intake_limit(text, text, integer, interval)
  from public, anon, authenticated, service_role;
revoke all on function public.track_teacher_application(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.track_teacher_application(uuid) to anon, authenticated;

do $phase02_postflight$
declare
  expected_catalog jsonb;
  actual_catalog jsonb;
  preserved record;
  current_count bigint;
  expected_function text;
begin
  for preserved in select * from phase02_row_counts loop
    execute format('select count(*) from %I.%I', preserved.schema_name, preserved.table_name)
      into current_count;
    if current_count is distinct from preserved.row_count then
      raise exception 'phase02_row_count_changed: %.%', preserved.schema_name, preserved.table_name;
    end if;
  end loop;

  select contract into expected_catalog from phase02_catalog_contract;
  select jsonb_build_object(
    'table_acls', (
      select jsonb_agg(jsonb_build_object(
        'schema', n.nspname, 'name', c.relname, 'owner', pg_catalog.pg_get_userbyid(c.relowner),
        'acl', c.relacl, 'rls', c.relrowsecurity, 'forced_rls', c.relforcerowsecurity
      ) order by n.nspname, c.relname)
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p', 'v')
        and c.relname <> 'course_enrollment_review_audit'
    ),
    'column_contracts', (
      select jsonb_agg(jsonb_build_object(
        'schema', n.nspname, 'table', c.relname, 'column', a.attname,
        'type', pg_catalog.format_type(a.atttypid, a.atttypmod), 'not_null', a.attnotnull,
        'default', pg_catalog.pg_get_expr(d.adbin, d.adrelid), 'acl', a.attacl
      ) order by n.nspname, c.relname, a.attnum)
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      left join pg_catalog.pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where n.nspname = 'public' and c.relkind in ('r', 'p')
        and a.attnum > 0 and not a.attisdropped
    ),
    'challenge_foreign_keys', (
      select jsonb_agg(jsonb_build_object(
        'name', con.conname, 'definition', pg_catalog.pg_get_constraintdef(con.oid)
      ) order by con.conname)
      from pg_catalog.pg_constraint con
      where con.conrelid = 'public.teacher_intake_challenges'::regclass and con.contype = 'f'
    )
  ) into actual_catalog;
  if actual_catalog is distinct from expected_catalog then
    raise exception 'phase02_catalog_preservation_mismatch';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint con
    where con.conrelid = 'public.teacher_intake_challenges'::regclass
      and con.conname = 'teacher_intake_challenges_application_id_fkey'
      and con.contype = 'f'
      and con.confrelid = 'public.teacher_applications'::regclass
  ) then
    raise exception 'phase02_teacher_intake_reference_fk_missing';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc p
    where p.oid = 'public.track_teacher_application(uuid)'::regprocedure
      and p.prosecdef
      and pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
      and exists (select 1 from unnest(p.proconfig) as setting where setting = 'search_path=""')
      and has_function_privilege('anon', p.oid, 'EXECUTE')
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not has_function_privilege('service_role', p.oid, 'EXECUTE')
  ) then
    raise exception 'phase02_teacher_tracking_contract_mismatch';
  end if;

  foreach expected_function in array array[
    'public.consume_teacher_tracking_admission(uuid,text)',
    'public.discard_teacher_intake_challenge(uuid)'
  ] loop
    if not exists (
      select 1
      from pg_catalog.pg_proc p
      where p.oid = expected_function::regprocedure
        and p.prosecdef
        and pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
        and exists (select 1 from unnest(p.proconfig) as setting where setting = 'search_path=""')
        and has_function_privilege('service_role', p.oid, 'EXECUTE')
        and not has_function_privilege('anon', p.oid, 'EXECUTE')
        and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
    ) then
      raise exception 'phase02_teacher_intake_helper_contract_mismatch: %', expected_function;
    end if;
  end loop;

  if has_table_privilege('service_role', 'public.course_enrollment_review_audit', 'SELECT')
     or has_table_privilege('service_role', 'public.course_enrollment_review_audit', 'INSERT')
     or has_table_privilege('service_role', 'public.course_enrollment_review_audit', 'UPDATE')
     or has_table_privilege('service_role', 'public.course_enrollment_review_audit', 'DELETE')
     or not has_table_privilege('authenticated', 'public.course_enrollment_review_audit', 'SELECT') then
    raise exception 'phase02_audit_view_privilege_mismatch';
  end if;
end;
$phase02_postflight$;

commit;
