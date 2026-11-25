-- REVIEW ONLY — DO NOT EXECUTE.
-- This is not an applied migration. It is a consolidated Phase 01.7 proposal for manual review.
-- Required before any execution: approved product policies, coordinated application changes,
-- an isolated PostgreSQL 17.11/Supabase environment, real-JWT RLS tests, concurrency tests,
-- clean preflight, operator approval, and a separate production execution window.
-- Do not run against production from this repository. Do not rerun 20261124010000.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

-- Preflight: refuse unknown baseline objects or existing integrity violations.
do $preflight$
declare
  invalid_members bigint;
  overcapacity_groups bigint;
  invalid_requests bigint;
begin
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'remediation_requires_postgresql_17';
  end if;

  if to_regclass('auth.users') is null
     or to_regclass('public.profiles') is null
     or to_regclass('public.account_roles') is null
     or to_regclass('public.guardian_links') is null
     or to_regclass('public.courses') is null
     or to_regclass('public.course_enrollments') is null
     or to_regclass('public.learning_groups') is null
     or to_regclass('public.group_members') is null
     or to_regclass('public.group_join_requests') is null
     or to_regclass('public.group_payments') is null
     or to_regclass('public.teacher_applications') is null
     or to_regclass('public.lessons') is null then
    raise exception 'remediation_baseline_missing';
  end if;

  if to_regclass('public.direct_chat_threads') is not null
     or to_regclass('public.direct_chat_messages') is not null then
    raise exception 'remediation_unexpected_direct_chat_schema';
  end if;

  select count(*) into invalid_members
  from public.group_members gm
  join public.learning_groups g on g.id = gm.group_id
  where not exists (
    select 1
    from public.course_enrollments e
    where e.course_id = g.course_id
      and e.status = 'active'
      and e.requester_id = gm.student_id
  );
  if invalid_members > 0 then
    raise exception 'remediation_members_without_active_enrollment: %', invalid_members
      using errcode = '23514';
  end if;

  with occupied as (
    select g.id, g.capacity,
      (select count(*) from public.group_members gm where gm.group_id = g.id)
      + (
        select count(*)
        from public.group_join_requests r
        where r.group_id = g.id
          and (r.status = 'paid' or (r.status = 'reserved' and r.expires_at > clock_timestamp()))
          and not exists (
            select 1 from public.group_members gm
            where gm.group_id = r.group_id and gm.student_id = r.student_id
          )
      ) as occupied_seats
    from public.learning_groups g
  )
  select count(*) into overcapacity_groups from occupied where occupied_seats > capacity;
  if overcapacity_groups > 0 then
    raise exception 'remediation_groups_over_capacity: %', overcapacity_groups
      using errcode = '23514';
  end if;

  select count(*) into invalid_requests
  from public.group_join_requests r
  join public.learning_groups g on g.id = r.group_id
  where (
    r.status in ('reserved', 'paid', 'approved')
    and not exists (
      select 1 from public.course_enrollments e
      where e.course_id = g.course_id and e.status = 'active' and e.requester_id = r.student_id
    )
  ) or (
    r.status in ('paid', 'approved')
    and not exists (
      select 1 from public.group_payments gp
      where gp.request_id = r.id and gp.status = 'succeeded'
        and gp.amount_minor = r.fee_minor and gp.currency = 'EGP'
    )
  ) or (
    r.status = 'approved'
    and (
      not exists (
        select 1 from public.group_members gm
        where gm.group_id = r.group_id and gm.student_id = r.student_id
      )
      or r.reviewed_by is null
      or r.reviewed_at is null
      or not exists (
        select 1
        from public.profiles p
        join public.account_roles ar on ar.user_id = p.user_id
        where p.user_id = r.reviewed_by
          and p.status = 'active'
          and ar.role_code in ('admin', 'owner')
      )
    )
  );
  if invalid_requests > 0 then
    raise exception 'remediation_group_requests_invalid: %', invalid_requests
      using errcode = '23514';
  end if;

  perform set_config(
    'liveschool.remediation.legacy_unreviewed_count',
    (select count(*)::text from public.course_enrollments
     where status in ('active', 'declined') and reviewed_by is null and reviewed_at is null),
    true
  );
  perform set_config(
    'liveschool.remediation.enrollment_count',
    (select count(*)::text from public.course_enrollments),
    true
  );
  perform set_config(
    'liveschool.remediation.teacher_application_count',
    (select count(*)::text from public.teacher_applications),
    true
  );
end;
$preflight$;

-- Additive identity columns. Existing rows remain null and are treated as unresolved legacy identity.
alter table public.course_enrollments
  add column if not exists student_id uuid;
alter table public.course_enrollments
  add constraint course_enrollments_student_id_fkey
  foreign key (student_id) references public.profiles(user_id) on delete restrict;
create index if not exists course_enrollments_student_id_idx
  on public.course_enrollments (student_id);
create unique index if not exists course_enrollments_student_course_active_idx
  on public.course_enrollments (student_id, course_id)
  where student_id is not null and status = 'active';

alter table public.teacher_applications
  add column if not exists requester_id uuid;
alter table public.teacher_applications
  add constraint teacher_applications_requester_id_fkey
  foreign key (requester_id) references public.profiles(user_id) on delete restrict;
alter table public.teacher_applications
  add column if not exists email_verified_at timestamptz;
create index if not exists teacher_applications_requester_id_idx
  on public.teacher_applications (requester_id);

-- Append-only review provenance. Legacy enrollment fields are never backfilled.
create table if not exists public.course_enrollment_review_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  requester_id uuid not null references public.profiles(user_id) on delete restrict,
  event_type text not null check (event_type in ('reviewed', 'legacy_acknowledged')),
  actor_id uuid not null references public.profiles(user_id) on delete restrict,
  occurred_at timestamptz not null default clock_timestamp(),
  previous_status text check (previous_status in ('pending', 'active', 'declined')),
  new_status text check (new_status in ('active', 'declined')),
  note text check (note is null or char_length(btrim(note)) between 1 and 1000),
  check (
    (event_type = 'reviewed' and previous_status = 'pending' and new_status in ('active', 'declined') and note is null)
    or (event_type = 'legacy_acknowledged' and previous_status in ('active', 'declined') and new_status is null)
  )
);
create unique index if not exists course_enrollment_one_review_event_idx
  on public.course_enrollment_review_events (course_id, requester_id)
  where event_type = 'reviewed';
create unique index if not exists course_enrollment_one_legacy_acknowledgment_idx
  on public.course_enrollment_review_events (course_id, requester_id)
  where event_type = 'legacy_acknowledged';
alter table public.course_enrollment_review_events enable row level security;

create or replace view public.course_enrollment_review_audit
with (security_invoker = true)
as
select e.course_id, e.requester_id, e.student_id, e.status,
  e.reviewed_by, e.reviewed_at,
  case
    when e.status = 'pending' then 'pending'
    when e.reviewed_by is not null and e.reviewed_at is not null then 'reviewed'
    else 'legacy_unreviewed'
  end as review_state,
  a.actor_id as acknowledged_by,
  a.occurred_at as acknowledged_at,
  a.note as acknowledgment_note
from public.course_enrollments e
left join public.course_enrollment_review_events a
  on a.course_id = e.course_id
 and a.requester_id = e.requester_id
 and a.event_type = 'legacy_acknowledged';

-- One-time challenges are created only by the trusted server after provider CAPTCHA verification.
create table if not exists public.teacher_intake_challenges (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('submit', 'track')),
  actor_id uuid references public.profiles(user_id) on delete restrict,
  ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
  application_id uuid references public.teacher_applications(id) on delete restrict,
  email_hash text check (email_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  check (expires_at > created_at),
  check (consumed_at is null or consumed_at >= created_at),
  check (
    (purpose = 'submit' and actor_id is not null and application_id is null and email_hash is null)
    or (purpose = 'track' and application_id is not null and email_hash is not null)
  )
);
create index if not exists teacher_intake_challenges_expiry_idx
  on public.teacher_intake_challenges (expires_at) where consumed_at is null;
alter table public.teacher_intake_challenges enable row level security;

create table if not exists public.teacher_intake_rate_limits (
  scope text not null check (scope in ('submit', 'track')),
  subject_key text not null check (subject_key in ('user', 'ip') or subject_key like 'user:%' or subject_key like 'ip:%'),
  window_started_at timestamptz not null,
  attempt_count integer not null check (attempt_count > 0),
  primary key (scope, subject_key)
);
alter table public.teacher_intake_rate_limits enable row level security;

create or replace function liveschool_internal.has_active_role(p_user_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles p
    join public.account_roles r on r.user_id = p.user_id
    where p.user_id = p_user_id
      and p.status = 'active'
      and r.role_code = any(p_roles)
  );
$function$;

create or replace function liveschool_internal.has_active_course_enrollment(p_student_id uuid, p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.course_enrollments e
    where e.course_id = p_course_id
      and e.status = 'active'
      and (
        e.student_id = p_student_id
        or (e.student_id is null and e.requester_id = p_student_id)
      )
  );
$function$;

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
  if course_teacher = actor_id
     and liveschool_internal.has_active_role(actor_id, array['teacher']) then
    return true;
  end if;
  if liveschool_internal.has_active_role(actor_id, array['student'])
     and exists (
       select 1 from public.course_enrollments e
       where e.course_id = p_course_id and e.status = 'active'
         and (e.student_id = actor_id or (e.student_id is null and e.requester_id = actor_id))
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
     ) then
    return true;
  end if;
  return false;
end;
$function$;

create or replace function liveschool_internal.group_occupied_seats(p_group_id uuid, p_at timestamptz)
returns integer
language sql
stable
security definer
set search_path = ''
as $function$
  select (
    (select count(*)::integer from public.group_members gm where gm.group_id = p_group_id)
    + (
      select count(*)::integer
      from public.group_join_requests r
      where r.group_id = p_group_id
        and (status = 'paid' or (status = 'reserved' and expires_at > p_at))
        and not exists (
          select 1 from public.group_members gm
          where gm.group_id = r.group_id and gm.student_id = r.student_id
        )
    )
  );
$function$;

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
  attempts integer;
begin
  insert into public.teacher_intake_rate_limits (scope, subject_key, window_started_at, attempt_count)
  values (p_scope, p_subject_key, observed_at, 1)
  on conflict (scope, subject_key) do update
  set window_started_at = case
        when teacher_intake_rate_limits.window_started_at <= observed_at - p_window then observed_at
        else teacher_intake_rate_limits.window_started_at
      end,
      attempt_count = case
        when teacher_intake_rate_limits.window_started_at <= observed_at - p_window then 1
        else teacher_intake_rate_limits.attempt_count + 1
      end
  returning attempt_count into attempts;
  return attempts <= p_max_attempts;
end;
$function$;

create or replace function liveschool_internal.reject_enrollment_review_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception 'enrollment_review_events_are_append_only' using errcode = '23514';
end;
$function$;

drop trigger if exists enrollment_review_events_immutable on public.course_enrollment_review_events;
create trigger enrollment_review_events_immutable
before update or delete on public.course_enrollment_review_events
for each row execute function liveschool_internal.reject_enrollment_review_event_mutation();

create or replace function liveschool_internal.validate_enrollment_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    if new.student_id is null then
      raise exception 'enrollment_student_identity_required' using errcode = '23514';
    end if;
    if new.student_id = new.requester_id then
      if not liveschool_internal.has_active_role(new.requester_id, array['student']) then
        raise exception 'enrollment_self_identity_forbidden' using errcode = '42501';
      end if;
    else
      if not liveschool_internal.has_active_role(new.requester_id, array['parent'])
         or not liveschool_internal.has_active_role(new.student_id, array['student'])
         or not exists (
           select 1 from public.guardian_links gl
           where gl.guardian_id = new.requester_id and gl.student_id = new.student_id
         ) then
        raise exception 'enrollment_guardian_link_forbidden' using errcode = '42501';
      end if;
    end if;
  elsif new.student_id is distinct from old.student_id
     or new.requester_id is distinct from old.requester_id then
    raise exception 'enrollment_identity_immutable' using errcode = '23514';
  end if;
  return new;
end;
$function$;

drop trigger if exists enrollment_identity_guard on public.course_enrollments;
create trigger enrollment_identity_guard
before insert or update of student_id, requester_id on public.course_enrollments
for each row execute function liveschool_internal.validate_enrollment_identity();

create or replace function liveschool_internal.prevent_course_archive_with_active_enrollments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status = 'archived' and old.status <> 'archived' then
    perform 1 from public.courses where id = new.id for update;
    if exists (
      select 1 from public.course_enrollments
      where course_id = new.id and status = 'active'
    ) then
      raise exception 'course_archive_active_enrollments' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists course_archive_enrollment_guard on public.courses;
create trigger course_archive_enrollment_guard
before update of status on public.courses
for each row execute function liveschool_internal.prevent_course_archive_with_active_enrollments();

create or replace function public.request_course_enrollment(p_course uuid, p_student uuid default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  course_status text;
  learner_id uuid;
  learner_name text;
  inserted_count integer;
begin
  if actor_id is null or p_course is null then
    raise exception 'enrollment_forbidden' using errcode = '42501';
  end if;

  select c.status into course_status from public.courses c where c.id = p_course for update;
  if not found or course_status <> 'published' then
    return false;
  end if;

  if p_student is null then
    if not liveschool_internal.has_active_role(actor_id, array['student']) then
      raise exception 'enrollment_forbidden' using errcode = '42501';
    end if;
    learner_id := actor_id;
  else
    if not liveschool_internal.has_active_role(actor_id, array['parent'])
       or not liveschool_internal.has_active_role(p_student, array['student'])
       or not exists (
         select 1 from public.guardian_links gl
         where gl.guardian_id = actor_id and gl.student_id = p_student
       ) then
      raise exception 'enrollment_forbidden' using errcode = '42501';
    end if;
    learner_id := p_student;
  end if;

  select p.display_name into learner_name from public.profiles p where p.user_id = learner_id;
  if learner_name is null or char_length(btrim(learner_name)) not between 2 and 100 then
    raise exception 'enrollment_identity_invalid' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.course_enrollments
    where course_id = p_course and requester_id = actor_id and student_id is null
  ) then
    raise exception 'enrollment_identity_unresolved' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.course_enrollments
    where course_id = p_course and student_id = learner_id and status = 'active'
  ) then
    return false;
  end if;

  insert into public.course_enrollments (requester_id, student_id, course_id, learner_name)
  values (actor_id, learner_id, p_course, btrim(learner_name))
  on conflict (requester_id, course_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
exception
  when unique_violation then
    return false;
end;
$function$;

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
  perform 1 from public.profiles where user_id = actor_id for update;
  if not found then
    raise exception 'enrollment_forbidden' using errcode = '42501';
  end if;
  perform 1 from public.account_roles where user_id = actor_id for update;
  if not liveschool_internal.has_active_role(actor_id, array['admin', 'owner']) then
    raise exception 'enrollment_forbidden' using errcode = '42501';
  end if;

  select c.status into course_status from public.courses c where c.id = p_course for update;
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
  if p_status = 'active' and enrollment.student_id is null then
    raise exception 'enrollment_identity_unresolved' using errcode = '23514';
  end if;

  update public.course_enrollments e
  set status = p_status, reviewed_by = actor_id, reviewed_at = clock_timestamp()
  where e.course_id = p_course and e.requester_id = p_requester and e.status = 'pending';
  get diagnostics changed_count = row_count;
  if changed_count = 1 then
    insert into public.course_enrollment_review_events (
      course_id, requester_id, event_type, actor_id, previous_status, new_status
    ) values (
      p_course, p_requester, 'reviewed', actor_id, 'pending', p_status
    );
  end if;
  return changed_count = 1;
end;
$function$;

create or replace function public.acknowledge_legacy_enrollment_as_admin(
  p_course uuid,
  p_requester uuid,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  enrollment public.course_enrollments%rowtype;
begin
  if actor_id is null or not liveschool_internal.has_active_role(actor_id, array['admin', 'owner']) then
    raise exception 'enrollment_forbidden' using errcode = '42501';
  end if;
  if p_note is not null and char_length(btrim(p_note)) not between 1 and 1000 then
    raise exception 'enrollment_acknowledgment_invalid' using errcode = '23514';
  end if;

  perform 1 from public.courses where id = p_course for update;
  select e.* into enrollment
  from public.course_enrollments e
  where e.course_id = p_course and e.requester_id = p_requester
  for update;
  if not found or enrollment.status not in ('active', 'declined')
     or enrollment.reviewed_by is not null or enrollment.reviewed_at is not null then
    return false;
  end if;

  insert into public.course_enrollment_review_events (
    course_id, requester_id, event_type, actor_id, previous_status, note
  ) values (
    p_course, p_requester, 'legacy_acknowledged', actor_id, enrollment.status, nullif(btrim(p_note), '')
  );
  return true;
end;
$function$;

-- Published course/unit metadata remains public; lesson bodies require course authorization.
drop policy if exists "Read published lessons" on public.lessons;
create policy "Read authorized course lessons" on public.lessons
  for select to authenticated
  using (
    liveschool_internal.can_read_course_lessons(
      (select u.course_id from public.course_units u where u.id = lessons.unit_id)
    )
  );

drop policy if exists "Requesters can read their own course enrollments" on public.course_enrollments;
drop policy if exists "Students can read their authoritative enrollments" on public.course_enrollments;
create policy "Students can read their authoritative enrollments" on public.course_enrollments
  for select to authenticated
  using (student_id = (select auth.uid()));
drop policy if exists "Guardians can read linked student enrollments" on public.course_enrollments;
create policy "Guardians can read linked student enrollments" on public.course_enrollments
  for select to authenticated
  using (
    exists (
      select 1 from public.guardian_links gl
      where gl.guardian_id = (select auth.uid()) and gl.student_id = course_enrollments.student_id
    )
  );
drop policy if exists "Administrators can read course enrollments" on public.course_enrollments;
create policy "Administrators can read course enrollments" on public.course_enrollments
  for select to authenticated
  using (liveschool_internal.has_active_role((select auth.uid()), array['admin', 'owner']));

-- Group membership and capacity guards.
create or replace function liveschool_internal.validate_group_member_enrollment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  group_course uuid;
begin
  select g.course_id into group_course
  from public.learning_groups g
  where g.id = new.group_id
  for update;
  if not found then
    raise exception 'group_missing' using errcode = '23503';
  end if;
  if not liveschool_internal.has_active_role(new.student_id, array['student'])
     or not liveschool_internal.has_active_course_enrollment(new.student_id, group_course) then
    raise exception 'group_student_enrollment_required' using errcode = '23514';
  end if;
  return new;
end;
$function$;

drop trigger if exists group_member_enrollment_guard on public.group_members;
create trigger group_member_enrollment_guard
before insert or update of group_id, student_id on public.group_members
for each row execute function liveschool_internal.validate_group_member_enrollment();

create or replace function liveschool_internal.validate_group_course_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.course_id is distinct from old.course_id then
    perform 1 from public.learning_groups where id = new.id for update;
    if exists (
      select 1 from public.group_members gm
      where gm.group_id = new.id
        and not liveschool_internal.has_active_course_enrollment(gm.student_id, new.course_id)
    ) then
      raise exception 'group_course_member_enrollment_required' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists group_course_member_enrollment_guard on public.learning_groups;
create trigger group_course_member_enrollment_guard
before update of course_id on public.learning_groups
for each row execute function liveschool_internal.validate_group_course_members();

create or replace function liveschool_internal.prepare_group_request_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  group_course uuid;
begin
  select g.course_id into group_course
  from public.learning_groups g
  where g.id = new.group_id
  for update;
  if not found then
    raise exception 'group_missing' using errcode = '23503';
  end if;
  if not liveschool_internal.has_active_role(new.student_id, array['student'])
     or not liveschool_internal.has_active_course_enrollment(new.student_id, group_course) then
    raise exception 'group_student_enrollment_required' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'reserved' or new.expires_at <= clock_timestamp() then
      raise exception 'group_request_requires_live_reservation' using errcode = '23514';
    end if;
    update public.group_join_requests
    set status = 'expired'
    where group_id = new.group_id
      and student_id = new.student_id
      and status = 'reserved'
      and expires_at <= clock_timestamp()
      and id <> new.id;
  else
    if new.group_id <> old.group_id or new.student_id <> old.student_id then
      raise exception 'group_request_identity_immutable' using errcode = '23514';
    end if;
    if old.status in ('expired', 'approved', 'rejected') and new.status <> old.status then
      raise exception 'group_request_status_final' using errcode = '23514';
    end if;
    if new.status = 'paid' and old.status <> 'reserved' then
      raise exception 'group_request_paid_transition_invalid' using errcode = '23514';
    end if;
    if new.status = 'approved' and old.status <> 'paid' then
      raise exception 'group_request_approval_requires_payment' using errcode = '23514';
    end if;
    if new.status = 'expired' and old.status <> 'reserved' then
      raise exception 'group_request_expiry_transition_invalid' using errcode = '23514';
    end if;
    if new.status = 'rejected' and old.status not in ('reserved', 'paid') then
      raise exception 'group_request_rejection_transition_invalid' using errcode = '23514';
    end if;
  end if;

  if new.status in ('paid', 'approved') and not exists (
    select 1 from public.group_payments gp
    where gp.request_id = new.id
      and gp.status = 'succeeded'
      and gp.amount_minor = new.fee_minor
      and gp.currency = 'EGP'
  ) then
    raise exception 'group_request_payment_required' using errcode = '23514';
  end if;
  if new.status in ('approved', 'rejected') then
    if new.reviewed_by is null or new.reviewed_at is null
       or new.reviewed_by <> (select auth.uid())
       or not liveschool_internal.has_active_role(new.reviewed_by, array['admin', 'owner']) then
      raise exception 'group_request_reviewer_forbidden' using errcode = '42501';
    end if;
  end if;
  if new.status = 'approved' and not exists (
    select 1 from public.group_members gm
    where gm.group_id = new.group_id and gm.student_id = new.student_id
  ) then
    raise exception 'group_request_membership_required' using errcode = '23514';
  end if;
  return new;
end;
$function$;

drop trigger if exists group_request_lifecycle_guard on public.group_join_requests;
create trigger group_request_lifecycle_guard
before insert or update of status, expires_at, group_id, student_id, fee_minor, reviewed_by, reviewed_at on public.group_join_requests
for each row execute function liveschool_internal.prepare_group_request_write();

create or replace function liveschool_internal.enforce_group_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  checked_group uuid;
  checked_capacity integer;
  occupied integer;
begin
  if tg_table_name = 'learning_groups' then
    checked_group := new.id;
    checked_capacity := new.capacity;
  elsif tg_table_name = 'group_members' then
    checked_group := new.group_id;
    select g.capacity into checked_capacity from public.learning_groups g where g.id = checked_group;
  else
    checked_group := new.group_id;
    select g.capacity into checked_capacity from public.learning_groups g where g.id = checked_group;
  end if;

  perform 1 from public.learning_groups where id = checked_group for update;
  occupied := liveschool_internal.group_occupied_seats(checked_group, clock_timestamp());
  if occupied > checked_capacity then
    raise exception 'group_capacity' using errcode = '23514';
  end if;
  return null;
end;
$function$;

drop trigger if exists group_member_capacity_guard on public.group_members;
create trigger group_member_capacity_guard
after insert or update of group_id, student_id on public.group_members
for each row execute function liveschool_internal.enforce_group_capacity();
drop trigger if exists group_request_capacity_guard on public.group_join_requests;
create trigger group_request_capacity_guard
after insert or update of status, expires_at, group_id, student_id on public.group_join_requests
for each row execute function liveschool_internal.enforce_group_capacity();
drop trigger if exists group_capacity_change_guard on public.learning_groups;
create trigger group_capacity_change_guard
after update of capacity on public.learning_groups
for each row execute function liveschool_internal.enforce_group_capacity();

revoke all on function public.save_learning_group(uuid, uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid[])
  from public, anon, authenticated, service_role;
drop function public.save_learning_group(uuid, uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid[]);

create or replace function public.save_learning_group(
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
  actor_id uuid := (select auth.uid());
  saved_group uuid := p_group;
  selected_students uuid[];
  occupied integer;
  additional integer;
begin
  if actor_id is null or not liveschool_internal.has_active_role(actor_id, array['admin', 'owner']) then
    raise exception 'group_forbidden' using errcode = '42501';
  end if;
  if (
    length(btrim(p_name)) between 2 and 160
    and p_capacity between 1 and 500 and p_fee_minor between 0 and 99999999
    and p_weekday between 1 and 7 and p_time is not null and p_active is not null
    and p_students is not null and cardinality(p_students) <= 500
  ) is not true then
    raise exception 'group_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from public.courses where id = p_course and status = 'published') then
    raise exception 'group_course' using errcode = '23514';
  end if;
  if not liveschool_internal.has_active_role(p_teacher, array['teacher'])
     or not exists (select 1 from public.teacher_profiles where user_id = p_teacher) then
    raise exception 'group_teacher' using errcode = '23514';
  end if;

  select coalesce(array_agg(distinct requested.id), '{}'::uuid[]) into selected_students
  from unnest(p_students) as requested(id);
  if exists (
    select 1 from unnest(selected_students) as requested(id)
    where not liveschool_internal.has_active_role(requested.id, array['student'])
       or not liveschool_internal.has_active_course_enrollment(requested.id, p_course)
  ) then
    raise exception 'group_students' using errcode = '23514';
  end if;

  if saved_group is not null then
    perform 1 from public.learning_groups where id = saved_group for update;
    if not found then
      raise exception 'group_missing' using errcode = '23503';
    end if;
    if exists (
      select 1 from public.group_members gm
      where gm.group_id = saved_group
        and not liveschool_internal.has_active_course_enrollment(gm.student_id, p_course)
    ) then
      raise exception 'group_course' using errcode = '23514';
    end if;
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

  occupied := liveschool_internal.group_occupied_seats(saved_group, clock_timestamp());
  select count(*) into additional
  from unnest(selected_students) as requested(id)
  where not exists (
    select 1 from public.group_members gm
    where gm.group_id = saved_group and gm.student_id = requested.id
  )
  and not exists (
    select 1 from public.group_join_requests r
    where r.group_id = saved_group and r.student_id = requested.id
      and (r.status = 'paid' or (r.status = 'reserved' and r.expires_at > clock_timestamp()))
  );
  if occupied + additional > p_capacity then
    raise exception 'group_capacity' using errcode = '23514';
  end if;

  insert into public.group_members (group_id, student_id)
  select saved_group, requested.id from unnest(selected_students) as requested(id)
  on conflict (group_id, student_id) do nothing;

  update public.group_join_requests
  set status = 'expired'
  where group_id = saved_group
    and student_id = any(selected_students)
    and status = 'reserved';
  update public.group_join_requests
  set status = 'approved', reviewed_by = actor_id, reviewed_at = clock_timestamp()
  where group_id = saved_group
    and student_id = any(selected_students)
    and status = 'paid';
  return saved_group;
end;
$function$;

-- These workflow functions are defined for review but deliberately left non-executable.
create or replace function public.reserve_group_seat(p_group uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  reserved_group uuid;
  course_id uuid;
  request_id uuid;
  reserved_fee bigint;
begin
  if actor_id is null or not liveschool_internal.has_active_role(actor_id, array['student']) then
    raise exception 'group_forbidden' using errcode = '42501';
  end if;
  select g.id, g.course_id into reserved_group, course_id
  from public.learning_groups g
  where g.id = p_group and g.active
  for update;
  if not found or not exists (select 1 from public.courses where id = course_id and status = 'published') then
    raise exception 'group_missing' using errcode = '23503';
  end if;
  if not liveschool_internal.has_active_course_enrollment(actor_id, course_id) then
    raise exception 'group_student_enrollment_required' using errcode = '23514';
  end if;
  if exists (select 1 from public.group_members where group_id = p_group and student_id = actor_id)
     or exists (
       select 1 from public.group_join_requests
       where group_id = p_group and student_id = actor_id and status in ('reserved', 'paid')
     ) then
    raise exception 'group_request_already_open' using errcode = '23505';
  end if;
  if liveschool_internal.group_occupied_seats(p_group, clock_timestamp()) >=
     (select capacity from public.learning_groups where id = p_group) then
    raise exception 'group_capacity' using errcode = '23514';
  end if;

  select g.fee_minor into reserved_fee from public.learning_groups g where g.id = p_group;
  insert into public.group_join_requests (group_id, student_id, fee_minor, expires_at)
  values (p_group, actor_id, reserved_fee, clock_timestamp() + interval '15 minutes')
  returning id into request_id;
  return request_id;
end;
$function$;

create or replace function liveschool_internal.expire_group_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  checked_group uuid;
  expired_count integer := 0;
  changed integer;
begin
  for checked_group in
    select g.id from public.learning_groups g
    where exists (
      select 1 from public.group_join_requests r
      where r.group_id = g.id and r.status = 'reserved' and r.expires_at <= clock_timestamp()
    )
    order by g.id
    for update
  loop
    update public.group_join_requests
    set status = 'expired'
    where group_id = checked_group and status = 'reserved' and expires_at <= clock_timestamp();
    get diagnostics changed = row_count;
    expired_count := expired_count + changed;
  end loop;
  return expired_count;
end;
$function$;

-- Teacher intake: verified Auth identity plus a one-time server-created CAPTCHA challenge.
create or replace function public.submit_teacher_application(
  p_challenge uuid,
  p_subject_id text,
  p_profile jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  account_email text;
  account_confirmed timestamptz;
  challenge public.teacher_intake_challenges%rowtype;
  full_name_value text;
  phone_value text;
  qualification_value text;
  governorate_value text;
  experience_value text;
  bio_value text;
  approach_value text;
  video_value text;
  grade_ids text[];
  application_id uuid;
begin
  if actor_id is null or not liveschool_internal.has_active_role(actor_id, array['admin', 'owner', 'manager', 'support', 'teacher', 'student', 'parent']) then
    raise exception 'teacher_intake_forbidden' using errcode = '42501';
  end if;
  select u.email, u.email_confirmed_at into account_email, account_confirmed
  from auth.users u where u.id = actor_id;
  if not found or account_confirmed is null then
    raise exception 'teacher_intake_email_unverified' using errcode = '42501';
  end if;
  if jsonb_typeof(p_profile) <> 'object' or jsonb_typeof(p_profile -> 'grades') <> 'array' then
    raise exception 'teacher_intake_invalid' using errcode = '23514';
  end if;

  select * into challenge from public.teacher_intake_challenges
  where id = p_challenge for update;
  if not found or challenge.purpose <> 'submit' or challenge.actor_id <> actor_id
     or challenge.consumed_at is not null or challenge.expires_at <= clock_timestamp() then
    raise exception 'teacher_intake_challenge_invalid' using errcode = '42501';
  end if;

  full_name_value := btrim(coalesce(p_profile ->> 'fullName', ''));
  phone_value := btrim(coalesce(p_profile ->> 'phone', ''));
  qualification_value := btrim(coalesce(p_profile ->> 'qualification', ''));
  governorate_value := btrim(coalesce(p_profile ->> 'governorate', ''));
  experience_value := btrim(coalesce(p_profile ->> 'experience', ''));
  bio_value := btrim(coalesce(p_profile ->> 'bio', ''));
  approach_value := btrim(coalesce(p_profile ->> 'approach', ''));
  video_value := btrim(coalesce(p_profile ->> 'video', ''));
  select coalesce(array_agg(distinct value), '{}'::text[]) into grade_ids
  from jsonb_array_elements_text(p_profile -> 'grades') as requested(value);

  if char_length(full_name_value) not between 2 and 160
     or phone_value !~ '^\+?[0-9 ()-]{8,25}$'
     or char_length(qualification_value) not between 2 and 160
     or char_length(governorate_value) not between 2 and 80
     or experience_value !~ '^[0-9]{1,2}$' or experience_value::integer > 70
     or char_length(bio_value) not between 20 and 1500
     or char_length(approach_value) not between 10 and 1000
     or cardinality(grade_ids) not between 1 and 20
     or char_length(video_value) > 2048
     or (video_value <> '' and (video_value !~* '^https://' or video_value ~* '^https://[^/]*@')) then
    raise exception 'teacher_intake_invalid' using errcode = '23514';
  end if;
  if not exists (select 1 from public.subjects where id = p_subject_id)
     or (select count(*) from public.grades where id = any(grade_ids)) <> cardinality(grade_ids) then
    raise exception 'teacher_intake_catalog_invalid' using errcode = '23514';
  end if;
  if not liveschool_internal.consume_teacher_intake_limit('submit', 'user:' || actor_id::text, 5, interval '24 hours')
     or not liveschool_internal.consume_teacher_intake_limit('submit', 'ip:' || challenge.ip_hash, 20, interval '24 hours') then
    return null;
  end if;

  insert into public.teacher_applications (
    requester_id, email, email_verified_at, full_name, subject_id, details
  ) values (
    actor_id, lower(btrim(account_email)), clock_timestamp(), full_name_value, p_subject_id,
    jsonb_build_object(
      'phone', phone_value, 'qualification', qualification_value,
      'governorate', governorate_value, 'experience', experience_value::integer,
      'bio', bio_value, 'approach', approach_value, 'grades', to_jsonb(grade_ids), 'video', video_value
    )
  ) returning id into application_id;

  update public.teacher_intake_challenges
  set consumed_at = clock_timestamp()
  where id = p_challenge;
  return application_id;
end;
$function$;

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
     or challenge.consumed_at is not null or challenge.expires_at <= clock_timestamp() then
    raise exception 'teacher_tracking_challenge_invalid' using errcode = '42501';
  end if;
  select * into application from public.teacher_applications
  where id = challenge.application_id for update;
  if not found then
    return null;
  end if;

  if application.requester_id is not null then
    if actor_id is null or application.requester_id <> actor_id
       or not liveschool_internal.has_active_role(actor_id, array['admin', 'owner', 'manager', 'support', 'teacher', 'student', 'parent'])
       or not exists (select 1 from auth.users where id = actor_id and email_confirmed_at is not null) then
      raise exception 'teacher_tracking_forbidden' using errcode = '42501';
    end if;
  else
    expected_email_hash := encode(
      pg_catalog.sha256(pg_catalog.convert_to(lower(btrim(application.email)), 'UTF8')),
      'hex'
    );
    if expected_email_hash <> challenge.email_hash then
      raise exception 'teacher_tracking_forbidden' using errcode = '42501';
    end if;
  end if;

  if (actor_id is not null
      and not liveschool_internal.consume_teacher_intake_limit('track', 'user:' || actor_id::text, 30, interval '1 hour'))
     or not liveschool_internal.consume_teacher_intake_limit('track', 'ip:' || challenge.ip_hash, 30, interval '1 hour') then
    return null;
  end if;
  update public.teacher_intake_challenges
  set consumed_at = clock_timestamp()
  where id = p_challenge;
  return application.status;
end;
$function$;

revoke all on function public.complete_teacher_onboarding(uuid, uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;
drop function public.complete_teacher_onboarding(uuid, uuid, uuid, jsonb);

create or replace function public.complete_teacher_onboarding(
  p_user uuid,
  p_application uuid,
  p_profile jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  target_email text;
  target_confirmed timestamptz;
begin
  if actor_id is null or not liveschool_internal.has_active_role(actor_id, array['admin', 'owner']) then
    raise exception 'teacher_forbidden' using errcode = '42501';
  end if;
  if p_user is null or jsonb_typeof(p_profile) <> 'object'
     or not liveschool_internal.has_active_role(p_user, array['student', 'parent'])
     or not exists (select 1 from public.profiles where user_id = p_user and status = 'active') then
    raise exception 'teacher_target_invalid' using errcode = '23514';
  end if;
  select u.email, u.email_confirmed_at into target_email, target_confirmed
  from auth.users u where u.id = p_user;
  if not found or target_confirmed is null then
    raise exception 'teacher_target_email_unverified' using errcode = '23514';
  end if;
  if not exists (select 1 from public.subjects where id = p_profile ->> 'subject') then
    raise exception 'teacher_subject_invalid' using errcode = '23514';
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
    if not found then
      raise exception 'teacher_application_unavailable' using errcode = '23514';
    end if;
  end if;
  if not public.assign_created_account_role(p_user, 'teacher') then
    raise exception 'teacher_role_failed' using errcode = '23514';
  end if;

  insert into public.teacher_profiles (
    user_id, subject_id, full_name, qualification, experience_years, bio,
    portrait_path, onboarding_details
  ) values (
    p_user, p_profile ->> 'subject', p_profile ->> 'fullName', p_profile ->> 'qualification',
    (p_profile ->> 'experience')::smallint, p_profile ->> 'bio', nullif(p_profile ->> 'portrait', ''),
    jsonb_build_object(
      'phone', p_profile ->> 'phone', 'governorate', p_profile ->> 'governorate',
      'approach', p_profile ->> 'approach', 'grades', p_profile -> 'grades', 'video', p_profile ->> 'video'
    )
  );
  if p_application is not null then
    update public.teacher_applications
    set status = 'accepted', teacher_user_id = p_user
    where id = p_application;
  end if;
end;
$function$;

create or replace function public.review_teacher_application_as_admin(p_application uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  changed_count integer;
begin
  if actor_id is null or not liveschool_internal.has_active_role(actor_id, array['admin', 'owner']) then
    raise exception 'teacher_forbidden' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('accepted', 'rejected') then
    return false;
  end if;
  update public.teacher_applications
  set status = p_status
  where id = p_application and status = 'pending' and teacher_user_id is null;
  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$function$;

create or replace function public.approve_group_join_request_as_admin(p_request uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  requested_group uuid;
  request public.group_join_requests%rowtype;
  group_course uuid;
  group_capacity integer;
begin
  if actor_id is null or not liveschool_internal.has_active_role(actor_id, array['admin', 'owner']) then
    raise exception 'group_forbidden' using errcode = '42501';
  end if;
  select r.group_id into requested_group from public.group_join_requests r where r.id = p_request;
  if not found then
    return false;
  end if;
  select g.course_id, g.capacity into group_course, group_capacity
  from public.learning_groups g
  where g.id = requested_group
  for update;
  if not found then
    return false;
  end if;
  select * into request from public.group_join_requests where id = p_request for update;
  if not found or request.status <> 'paid' then
    return false;
  end if;
  if not liveschool_internal.has_active_course_enrollment(request.student_id, group_course)
     or not exists (
       select 1 from public.group_payments gp
       where gp.request_id = request.id
         and gp.status = 'succeeded'
         and gp.amount_minor = request.fee_minor
         and gp.currency = 'EGP'
     ) then
    raise exception 'group_request_approval_invalid' using errcode = '23514';
  end if;
  if liveschool_internal.group_occupied_seats(requested_group, clock_timestamp()) > group_capacity then
    raise exception 'group_capacity' using errcode = '23514';
  end if;

  insert into public.group_members (group_id, student_id)
  values (requested_group, request.student_id)
  on conflict (group_id, student_id) do nothing;
  update public.group_join_requests
  set status = 'approved', reviewed_by = actor_id, reviewed_at = clock_timestamp()
  where id = p_request and status = 'paid';
  return found;
end;
$function$;

-- Least-privilege policies and grants.
drop policy if exists "Administrators can read enrollment review events" on public.course_enrollment_review_events;
create policy "Administrators can read enrollment review events" on public.course_enrollment_review_events
  for select to authenticated
  using (liveschool_internal.has_active_role((select auth.uid()), array['admin', 'owner']));

drop policy if exists "Requesters can read their own teacher applications" on public.teacher_applications;
create policy "Requesters can read their own teacher applications" on public.teacher_applications
  for select to authenticated
  using (requester_id = (select auth.uid()));
drop policy if exists "Administrators can read teacher applications" on public.teacher_applications;
create policy "Administrators can read teacher applications" on public.teacher_applications
  for select to authenticated
  using (liveschool_internal.has_active_role((select auth.uid()), array['admin', 'owner']));

revoke select on public.lessons from anon;
grant select on public.lessons to authenticated;
revoke insert, update on public.teacher_applications from service_role;
revoke update (status) on public.teacher_applications from service_role;
revoke insert on public.course_enrollments from service_role;
revoke all on public.course_enrollment_review_events from public, anon, authenticated, service_role;
revoke all on public.teacher_intake_challenges from public, anon, authenticated, service_role;
revoke all on public.teacher_intake_rate_limits from public, anon, authenticated, service_role;
grant select on public.course_enrollment_review_events to authenticated, service_role;
grant insert, select on public.teacher_intake_challenges to service_role;
grant select on public.course_enrollment_review_audit to authenticated, service_role;

revoke all on function liveschool_internal.has_active_role(uuid, text[]) from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.has_active_course_enrollment(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.can_read_course_lessons(uuid) from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.group_occupied_seats(uuid, timestamptz) from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.consume_teacher_intake_limit(text, text, integer, interval) from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.validate_enrollment_identity() from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.prevent_course_archive_with_active_enrollments() from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.validate_group_member_enrollment() from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.validate_group_course_members() from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.prepare_group_request_write() from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.enforce_group_capacity() from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.expire_group_reservations() from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.reject_enrollment_review_event_mutation() from public, anon, authenticated, service_role;

revoke all on function public.request_course_enrollment(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.review_course_enrollment_as_admin(uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.acknowledge_legacy_enrollment_as_admin(uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.save_learning_group(uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid[]) from public, anon, authenticated, service_role;
revoke all on function public.complete_teacher_onboarding(uuid, uuid, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.submit_teacher_application(uuid, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.track_teacher_application(uuid) from public, anon, authenticated, service_role;
revoke all on function public.review_teacher_application_as_admin(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.reserve_group_seat(uuid) from public, anon, authenticated, service_role;
revoke all on function public.approve_group_join_request_as_admin(uuid) from public, anon, authenticated, service_role;

grant execute on function liveschool_internal.has_active_role(uuid, text[]) to authenticated;
grant execute on function liveschool_internal.can_read_course_lessons(uuid) to authenticated;
grant execute on function public.request_course_enrollment(uuid, uuid) to authenticated;
grant execute on function public.review_course_enrollment_as_admin(uuid, uuid, text) to authenticated;
grant execute on function public.acknowledge_legacy_enrollment_as_admin(uuid, uuid, text) to authenticated;
grant execute on function public.save_learning_group(uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid[]) to authenticated;
grant execute on function public.complete_teacher_onboarding(uuid, uuid, jsonb) to authenticated;
grant execute on function public.submit_teacher_application(uuid, text, jsonb) to authenticated;
grant execute on function public.track_teacher_application(uuid) to anon, authenticated;
grant execute on function public.review_teacher_application_as_admin(uuid, text) to authenticated;

-- Final assertions: fail closed if the proposed contract is incomplete.
do $final_assertions$
declare
  expected record;
begin
  if to_regclass('public.course_enrollments') is null
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'course_enrollments'
         and column_name = 'student_id' and data_type = 'uuid'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'teacher_applications'
         and column_name = 'requester_id' and data_type = 'uuid'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'teacher_applications'
         and column_name = 'email_verified_at' and data_type = 'timestamp with time zone'
     ) then
    raise exception 'remediation_final_identity_columns_missing';
  end if;

  if exists (
    select 1 from public.course_enrollments where student_id is not null
  ) then
    raise exception 'remediation_final_legacy_identity_backfilled';
  end if;
  if exists (
    select 1 from public.teacher_applications
    where requester_id is not null or email_verified_at is not null
  ) then
    raise exception 'remediation_final_intake_identity_backfilled';
  end if;
  if to_regclass('public.course_enrollment_review_events') is null
     or to_regclass('public.teacher_intake_challenges') is null
     or to_regclass('public.teacher_intake_rate_limits') is null then
    raise exception 'remediation_final_intake_tables_missing';
  end if;
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'course_enrollment_review_events', 'teacher_intake_challenges', 'teacher_intake_rate_limits'
      )
      and not c.relrowsecurity
  ) then
    raise exception 'remediation_final_rls_disabled';
  end if;
  if not has_table_privilege('authenticated', 'public.course_enrollment_review_events', 'SELECT')
     or has_table_privilege('authenticated', 'public.course_enrollment_review_events', 'INSERT')
     or has_table_privilege('authenticated', 'public.course_enrollment_review_events', 'UPDATE')
     or has_table_privilege('authenticated', 'public.course_enrollment_review_events', 'DELETE')
     or not has_table_privilege('service_role', 'public.teacher_intake_challenges', 'INSERT')
     or not has_table_privilege('service_role', 'public.teacher_intake_challenges', 'SELECT')
     or has_column_privilege('service_role', 'public.teacher_applications', 'status', 'UPDATE')
     or not has_function_privilege('authenticated', 'liveschool_internal.has_active_role(uuid,text[])', 'EXECUTE') then
    raise exception 'remediation_final_table_privileges_invalid';
  end if;

  if to_regprocedure('public.save_learning_group(uuid,uuid,uuid,uuid,text,integer,bigint,integer,time,boolean,uuid[])') is not null
     or to_regprocedure('public.complete_teacher_onboarding(uuid,uuid,uuid,jsonb)') is not null then
    raise exception 'remediation_final_legacy_actor_functions_remain';
  end if;

  for expected in
    select * from (values
      ('public', 'request_course_enrollment', 'uuid, uuid'),
      ('public', 'review_course_enrollment_as_admin', 'uuid, uuid, text'),
      ('public', 'acknowledge_legacy_enrollment_as_admin', 'uuid, uuid, text'),
      ('public', 'save_learning_group', 'uuid, uuid, uuid, text, integer, bigint, integer, time without time zone, boolean, uuid[]'),
      ('public', 'complete_teacher_onboarding', 'uuid, uuid, jsonb'),
      ('public', 'submit_teacher_application', 'uuid, text, jsonb'),
      ('public', 'track_teacher_application', 'uuid'),
      ('public', 'review_teacher_application_as_admin', 'uuid, text'),
      ('public', 'reserve_group_seat', 'uuid'),
      ('public', 'approve_group_join_request_as_admin', 'uuid'),
      ('liveschool_internal', 'has_active_role', 'uuid, text[]'),
      ('liveschool_internal', 'has_active_course_enrollment', 'uuid, uuid'),
      ('liveschool_internal', 'can_read_course_lessons', 'uuid'),
      ('liveschool_internal', 'group_occupied_seats', 'uuid, timestamp with time zone'),
      ('liveschool_internal', 'consume_teacher_intake_limit', 'text, text, integer, interval'),
      ('liveschool_internal', 'reject_enrollment_review_event_mutation', ''),
      ('liveschool_internal', 'validate_enrollment_identity', ''),
      ('liveschool_internal', 'prevent_course_archive_with_active_enrollments', ''),
      ('liveschool_internal', 'validate_group_member_enrollment', ''),
      ('liveschool_internal', 'validate_group_course_members', ''),
      ('liveschool_internal', 'prepare_group_request_write', ''),
      ('liveschool_internal', 'enforce_group_capacity', ''),
      ('liveschool_internal', 'expire_group_reservations', ''),
      ('liveschool_internal', 'enforce_enrollment_review_audit', ''),
      ('liveschool_internal', 'protect_group_session_history', ''),
      ('liveschool_internal', 'validate_class_session', ''),
      ('liveschool_internal', 'capture_session_roster_on_insert', '')
    ) as contract(schema_name, function_name, arguments)
  loop
    if not exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = expected.schema_name
        and p.proname = expected.function_name
        and pg_catalog.pg_get_function_identity_arguments(p.oid) = expected.arguments
        and p.prosecdef
        and coalesce(p.proconfig, '{}'::text[]) = array['search_path=""']
    ) then
      raise exception 'remediation_final_function_contract_missing: %.%(%)',
        expected.schema_name, expected.function_name, expected.arguments;
    end if;
  end loop;

  if has_function_privilege('service_role', 'public.request_course_enrollment(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('service_role', 'public.save_learning_group(uuid,uuid,uuid,text,integer,bigint,integer,time,boolean,uuid[])', 'EXECUTE')
     or has_function_privilege('service_role', 'public.complete_teacher_onboarding(uuid,uuid,jsonb)', 'EXECUTE')
     or has_function_privilege('service_role', 'public.submit_teacher_application(uuid,text,jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.reserve_group_seat(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.reserve_group_seat(uuid)', 'EXECUTE')
     or has_function_privilege('service_role', 'public.reserve_group_seat(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.approve_group_join_request_as_admin(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.approve_group_join_request_as_admin(uuid)', 'EXECUTE')
     or has_function_privilege('service_role', 'public.approve_group_join_request_as_admin(uuid)', 'EXECUTE') then
    raise exception 'remediation_final_privilege_forbidden';
  end if;

  if has_table_privilege('anon', 'public.lessons', 'SELECT')
     or not has_table_privilege('authenticated', 'public.lessons', 'SELECT') then
    raise exception 'remediation_final_lesson_grants_invalid';
  end if;

  for expected in
    select * from (values
      ('public', 'courses', 'course_archive_enrollment_guard', 'BEFORE', 19, 'liveschool_internal.prevent_course_archive_with_active_enrollments()'),
      ('public', 'course_enrollments', 'enrollment_identity_guard', 'BEFORE', 23, 'liveschool_internal.validate_enrollment_identity()'),
      ('public', 'group_members', 'group_member_enrollment_guard', 'BEFORE', 23, 'liveschool_internal.validate_group_member_enrollment()'),
      ('public', 'learning_groups', 'group_course_member_enrollment_guard', 'BEFORE', 19, 'liveschool_internal.validate_group_course_members()'),
      ('public', 'group_join_requests', 'group_request_lifecycle_guard', 'BEFORE', 23, 'liveschool_internal.prepare_group_request_write()'),
      ('public', 'group_members', 'group_member_capacity_guard', 'AFTER', 21, 'liveschool_internal.enforce_group_capacity()'),
      ('public', 'group_join_requests', 'group_request_capacity_guard', 'AFTER', 21, 'liveschool_internal.enforce_group_capacity()'),
      ('public', 'learning_groups', 'group_capacity_change_guard', 'AFTER', 17, 'liveschool_internal.enforce_group_capacity()'),
      ('public', 'course_enrollment_review_events', 'enrollment_review_events_immutable', 'BEFORE', 27, 'liveschool_internal.reject_enrollment_review_event_mutation()'),
      ('public', 'course_enrollments', 'enrollment_review_audit', 'BEFORE', 23, 'liveschool_internal.enforce_enrollment_review_audit()'),
      ('public', 'learning_groups', 'group_session_history_guard', 'BEFORE', 19, 'liveschool_internal.protect_group_session_history()'),
      ('public', 'class_sessions', 'class_session_teacher_consistency', 'BEFORE', 23, 'liveschool_internal.validate_class_session()'),
      ('public', 'class_sessions', 'session_roster_capture', 'AFTER', 5, 'liveschool_internal.capture_session_roster_on_insert()')
    ) as expected_trigger(schema_name, relation_name, trigger_name, trigger_timing, trigger_type, function_signature)
  loop
    if not exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = expected.schema_name
        and c.relname = expected.relation_name
        and t.tgname = expected.trigger_name
        and t.tgtype = expected.trigger_type
        and t.tgenabled = 'O'
        and not t.tgisinternal
        and t.tgfoid = to_regprocedure(expected.function_signature)::oid
    ) then
      raise exception 'remediation_final_trigger_contract_missing: %.%.%',
        expected.schema_name, expected.relation_name, expected.trigger_name;
    end if;
  end loop;

  if (select count(*) from public.course_enrollments
      where status in ('active', 'declined') and reviewed_by is null and reviewed_at is null)
     <> current_setting('liveschool.remediation.legacy_unreviewed_count')::integer then
    raise exception 'remediation_final_legacy_review_metadata_changed';
  end if;
  if (select count(*) from public.course_enrollments)
     <> current_setting('liveschool.remediation.enrollment_count')::integer then
    raise exception 'remediation_final_enrollment_count_changed';
  end if;
  if (select count(*) from public.teacher_applications)
     <> current_setting('liveschool.remediation.teacher_application_count')::integer then
    raise exception 'remediation_final_teacher_application_count_changed';
  end if;
end;
$final_assertions$;

commit;
