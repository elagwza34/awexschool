-- LiveSchool unified database reconciliation.
-- Run once in the Supabase SQL Editor as postgres. The transaction aborts on failed guards.
-- This script preserves rows, seeds only missing reference data, and does not enable direct chat,
-- attachments, notifications, payment providers, meeting providers, or Realtime.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';

-- Preflight assertions are read-only and run before any schema change.
do $preflight$
declare
  missing_role text;
begin
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'PostgreSQL 17 or newer is required';
  end if;

  if to_regclass('auth.users') is null then
    raise exception 'Supabase auth.users is unavailable';
  end if;

  select string_agg(required.role_name, ', ' order by required.role_name)
  into missing_role
  from (values ('anon'), ('authenticated'), ('service_role')) as required(role_name)
  where not exists (select 1 from pg_roles r where r.rolname = required.role_name);
  if missing_role is not null then
    raise exception 'Required PostgreSQL roles are missing: %', missing_role;
  end if;

  if to_regclass('public.chat_threads') is not null
     and exists (select 1 from public.chat_threads where group_id is null) then
    raise exception 'Direct-chat thread rows exist; remove them only through a separately approved data plan';
  end if;

  if to_regclass('public.chat_messages') is not null
     and exists (select 1 from public.chat_messages where attachment_key is not null) then
    raise exception 'Chat attachment references exist; attachments are not approved for activation';
  end if;

  if to_regclass('liveschool_internal.direct_chat_threads') is not null then
    raise exception 'Unapproved direct-chat schema exists; reconcile it before running this migration';
  end if;

  if exists (select 1 from storage.buckets where id = 'chat-attachments') then
    raise exception 'Unapproved chat-attachments bucket exists; reconcile it before running this migration';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in ('Upload own chat attachment', 'Read chat attachment', 'Remove pending chat attachment')
  ) then
    raise exception 'Unapproved chat attachment policies exist; reconcile them before running this migration';
  end if;

  if exists (
    select 1
    from pg_publication_tables pt
    where pt.pubname = 'supabase_realtime'
      and pt.schemaname = 'public'
      and pt.tablename = any(array[
        'profiles', 'roles', 'permissions', 'account_roles', 'role_permissions', 'guardian_links',
        'stages', 'grades', 'subjects', 'teacher_profiles', 'courses', 'course_units', 'lessons',
        'learning_groups', 'group_members', 'group_join_requests', 'group_payments', 'class_sessions',
        'teacher_earnings', 'teacher_applications', 'support_requests', 'support_replies',
        'chat_threads', 'chat_participants', 'chat_messages', 'site_settings', 'course_enrollments',
        'course_assignments', 'course_assignment_submissions', 'session_attendance',
        'session_roster_snapshots', 'session_roster_entries', 'session_attendance_events'
      ])
  ) then
    raise exception 'Unapproved Realtime publication membership detected for LiveSchool tables';
  end if;

  if to_regclass('public.notifications') is not null
     or to_regclass('public.payment_providers') is not null
     or to_regclass('public.payment_intents') is not null
     or to_regclass('public.payment_transactions') is not null
     or exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'class_sessions'
         and column_name in ('meeting_id', 'meeting_url', 'provider_meeting_id')
     )
     or exists (
       select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public', 'liveschool_internal')
         and p.proname in ('send_notification', 'create_payment_intent', 'create_meeting')
     ) then
    raise exception 'Unapproved notification, payment-provider, or meeting-provider artifacts detected';
  end if;

  if to_regclass('public.course_enrollments') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'course_enrollments' and column_name = 'reviewed_by'
     )
     and exists (
       select 1 from public.course_enrollments e
       left join public.profiles p on p.user_id = e.reviewed_by
       where e.reviewed_by is not null and p.user_id is null
     ) then
    raise exception 'Existing enrollment reviewers reference missing profiles; repair requires approval';
  end if;

  if to_regclass('public.session_attendance') is not null then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'session_attendance' and column_name = 'marked_by'
    ) and exists (select 1 from public.session_attendance) then
      raise exception 'Existing attendance rows lack the marked_by column; historical backfill requires approval';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'session_attendance' and column_name = 'marked_by'
    ) and exists (select 1 from public.session_attendance where marked_by is null) then
      raise exception 'Existing attendance rows lack marked_by; historical backfill requires approval';
    end if;

    if to_regclass('public.session_attendance_events') is null
       and exists (select 1 from public.session_attendance) then
      raise exception 'Existing attendance rows lack corresponding append-only events; historical backfill requires approval';
    end if;

    if to_regclass('public.session_attendance_events') is not null
       and exists (
         select 1
         from public.session_attendance sa
         where not exists (
           select 1 from public.session_attendance_events ae
           where ae.session_id = sa.session_id and ae.student_id = sa.student_id
         )
       ) then
      raise exception 'Existing attendance rows lack corresponding append-only events; historical backfill requires approval';
    end if;
  end if;

  if to_regclass('public.session_roster_entries') is not null
     and to_regclass('public.session_attendance') is not null
     and exists (
       select 1
       from public.session_attendance sa
       left join public.session_roster_entries re
         on re.session_id = sa.session_id and re.student_id = sa.student_id
       where re.session_id is null
     ) then
    raise exception 'Existing attendance rows lack roster entries; historical backfill requires approval';
  end if;
end;
$preflight$;

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create schema if not exists liveschool_internal;
revoke all on schema liveschool_internal from public, anon, authenticated;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (btrim(display_name) <> ''),
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  created_at timestamptz not null default now()
);

create table if not exists public.roles (
  code text primary key,
  label text not null
);

create table if not exists public.permissions (
  code text primary key,
  label text not null
);

create table if not exists public.account_roles (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  role_code text not null references public.roles(code),
  primary key (user_id, role_code)
);

create table if not exists public.role_permissions (
  role_code text not null references public.roles(code) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  primary key (role_code, permission_code)
);

create table if not exists public.guardian_links (
  guardian_id uuid not null references public.profiles(user_id) on delete cascade,
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  primary key (guardian_id, student_id),
  check (guardian_id <> student_id)
);

create table if not exists public.stages (
  id text primary key,
  name text not null,
  position smallint not null unique check (position > 0)
);

create table if not exists public.grades (
  id text primary key,
  stage_id text not null references public.stages(id),
  name text not null,
  position smallint not null check (position > 0),
  unique (stage_id, position)
);

create table if not exists public.subjects (
  id text primary key,
  name text not null
);

create table if not exists public.teacher_profiles (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  subject_id text not null references public.subjects(id),
  full_name text not null,
  qualification text,
  experience_years smallint check (experience_years >= 0),
  bio text,
  intro_video_key text,
  session_rate_minor bigint check (session_rate_minor >= 0),
  portrait_path text constraint teacher_profiles_portrait_path_check
    check (portrait_path ~ '^/teachers/[a-z0-9-]+[.]webp$'),
  onboarding_details jsonb not null default '{}'::jsonb
    constraint teacher_profiles_onboarding_details_check check (jsonb_typeof(onboarding_details) = 'object')
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  grade_id text not null references public.grades(id),
  subject_id text not null references public.subjects(id),
  track text not null check (track in ('arabic', 'languages')),
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  teacher_id uuid references public.teacher_profiles(user_id) on delete set null
);

create table if not exists public.course_units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null check (position > 0),
  unique (course_id, position)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.course_units(id) on delete cascade,
  title text not null,
  position integer not null check (position > 0),
  body text not null default '',
  unique (unit_id, position)
);

create table if not exists public.learning_groups (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id),
  teacher_id uuid not null references public.teacher_profiles(user_id),
  name text not null check (btrim(name) <> ''),
  capacity integer not null check (capacity between 1 and 500),
  fee_minor bigint not null check (fee_minor >= 0),
  weekday smallint not null check (weekday between 1 and 7),
  starts_at_local time not null,
  timezone text not null default 'Africa/Cairo',
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.learning_groups(id),
  student_id uuid not null references public.profiles(user_id),
  enrolled_at timestamptz not null default now(),
  primary key (group_id, student_id)
);

create table if not exists public.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.learning_groups(id),
  student_id uuid not null references public.profiles(user_id),
  fee_minor bigint not null check (fee_minor >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'expired', 'paid', 'approved', 'rejected')),
  expires_at timestamptz not null,
  reviewed_by uuid references public.profiles(user_id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (
    (status in ('approved', 'rejected') and reviewed_at is not null and reviewed_by is not null)
    or (status not in ('approved', 'rejected') and reviewed_at is null and reviewed_by is null)
  )
);

create table if not exists public.group_payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.group_join_requests(id),
  provider text not null,
  provider_reference text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  status text not null check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.learning_groups(id),
  teacher_id uuid not null references public.teacher_profiles(user_id),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  check (ends_at > starts_at)
);

create table if not exists public.teacher_earnings (
  session_id uuid primary key references public.class_sessions(id),
  amount_minor bigint not null check (amount_minor >= 0),
  approved_by uuid not null references public.profiles(user_id),
  approved_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.teacher_applications (
  id uuid primary key default gen_random_uuid(),
  email text not null check (btrim(email) <> ''),
  full_name text not null check (btrim(full_name) <> ''),
  subject_id text not null references public.subjects(id),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  intro_video_key text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  teacher_user_id uuid references public.teacher_profiles(user_id) on delete set null
);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(user_id) on delete set null,
  contact_name text not null,
  contact_email text not null,
  title text not null,
  details text not null,
  status text not null default 'new' check (status in ('new', 'in-progress', 'resolved')),
  created_at timestamptz not null default now()
);

create table if not exists public.support_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  author_id uuid not null references public.profiles(user_id),
  body text not null check (btrim(body) <> ''),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null unique references public.learning_groups(id),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_participants (
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id),
  primary key (thread_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id),
  sender_id uuid not null references public.profiles(user_id),
  body text not null default '',
  attachment_key text,
  created_at timestamptz not null default now(),
  constraint chat_messages_text_only_check
    check (attachment_key is null and char_length(btrim(body)) between 1 and 2000)
);

create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  demo_enabled boolean not null default true,
  social_links jsonb not null default '{}'::jsonb
    constraint site_settings_social_links_check check (jsonb_typeof(social_links) = 'object')
);

create table if not exists public.course_enrollments (
  requester_id uuid not null references public.profiles(user_id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  learner_name text not null check (char_length(btrim(learner_name)) between 2 and 100),
  status text not null default 'pending' check (status in ('pending', 'active', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(user_id) on delete restrict,
  reviewed_at timestamptz,
  primary key (requester_id, course_id)
);

create table if not exists public.course_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 160),
  instructions text not null check (length(btrim(instructions)) between 5 and 5000),
  due_on date,
  created_at timestamptz not null default now()
);

create table if not exists public.course_assignment_submissions (
  assignment_id uuid not null references public.course_assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  response text not null check (length(btrim(response)) between 1 and 10000),
  feedback text check (length(btrim(feedback)) between 1 and 5000),
  submitted_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

create table if not exists public.session_roster_snapshots (
  session_id uuid primary key references public.class_sessions(id) on delete cascade,
  source text not null default 'live' check (source in ('live', 'legacy_attendance')),
  captured_at timestamptz not null default clock_timestamp(),
  captured_by uuid references public.profiles(user_id) on delete set null
);

create table if not exists public.session_roster_entries (
  session_id uuid not null references public.session_roster_snapshots(session_id) on delete cascade,
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  enrolled_at timestamptz,
  primary key (session_id, student_id)
);

create table if not exists public.session_attendance_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  student_id uuid not null,
  previous_status text check (previous_status in ('present', 'absent', 'late')),
  new_status text not null check (new_status in ('present', 'absent', 'late')),
  marked_by uuid not null references public.profiles(user_id) on delete restrict,
  marked_at timestamptz not null default clock_timestamp(),
  constraint session_attendance_events_roster_entry_fkey
    foreign key (session_id, student_id)
    references public.session_roster_entries(session_id, student_id)
    on delete cascade
);

create table if not exists public.session_attendance (
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'late')),
  marked_at timestamptz not null default now(),
  marked_by uuid not null references public.profiles(user_id) on delete restrict,
  primary key (session_id, student_id),
  constraint session_attendance_roster_entry_fkey
    foreign key (session_id, student_id)
    references public.session_roster_entries(session_id, student_id)
    on delete cascade
);

-- Additive reconciliation for databases created by earlier migrations.
alter table public.teacher_profiles
  add column if not exists portrait_path text,
  add column if not exists onboarding_details jsonb not null default '{}'::jsonb;
alter table public.courses
  add column if not exists teacher_id uuid references public.teacher_profiles(user_id) on delete set null;
alter table public.teacher_applications
  add column if not exists teacher_user_id uuid references public.teacher_profiles(user_id) on delete set null;
alter table public.site_settings
  add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table public.course_enrollments
  add column if not exists reviewed_by uuid references public.profiles(user_id) on delete restrict,
  add column if not exists reviewed_at timestamptz;
alter table public.session_attendance
  add column if not exists marked_by uuid references public.profiles(user_id) on delete restrict;
alter table public.chat_threads
  alter column group_id set not null;

do $constraints$
begin
  alter table public.teacher_profiles drop constraint if exists teacher_profiles_portrait_path_check;
  alter table public.teacher_profiles
    add constraint teacher_profiles_portrait_path_check
    check (portrait_path ~ '^/teachers/[a-z0-9-]+[.]webp$');

  alter table public.teacher_profiles drop constraint if exists teacher_profiles_onboarding_details_check;
  alter table public.teacher_profiles
    add constraint teacher_profiles_onboarding_details_check
    check (jsonb_typeof(onboarding_details) = 'object');

  alter table public.site_settings drop constraint if exists site_settings_social_links_check;
  alter table public.site_settings
    add constraint site_settings_social_links_check
    check (jsonb_typeof(social_links) = 'object');

  alter table public.courses drop constraint if exists courses_title_length_check;
  alter table public.courses
    add constraint courses_title_length_check
    check (char_length(btrim(title)) between 3 and 160);

  alter table public.courses drop constraint if exists courses_description_length_check;
  alter table public.courses
    add constraint courses_description_length_check
    check (char_length(description) <= 3000);

  alter table public.chat_messages drop constraint if exists chat_messages_text_only_check;
  alter table public.chat_messages
    add constraint chat_messages_text_only_check
    check (attachment_key is null and char_length(btrim(body)) between 1 and 2000);

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'chat_messages' and column_name = 'attachment_name'
  ) then
    alter table public.chat_messages drop constraint if exists chat_messages_attachment_name_disabled_check;
    alter table public.chat_messages
      add constraint chat_messages_attachment_name_disabled_check
      check (attachment_name is null);
  end if;
end;
$constraints$;

-- Historical rows must not disappear through parent-record cascades.
alter table public.course_enrollments drop constraint if exists course_enrollments_requester_id_fkey;
alter table public.course_enrollments
  add constraint course_enrollments_requester_id_fkey
  foreign key (requester_id) references public.profiles(user_id) on delete restrict;
alter table public.course_enrollments drop constraint if exists course_enrollments_course_id_fkey;
alter table public.course_enrollments
  add constraint course_enrollments_course_id_fkey
  foreign key (course_id) references public.courses(id) on delete restrict;
alter table public.course_enrollments drop constraint if exists course_enrollments_reviewed_by_fkey;
alter table public.course_enrollments
  add constraint course_enrollments_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles(user_id) on delete restrict;

alter table public.course_assignment_submissions drop constraint if exists course_assignment_submissions_assignment_id_fkey;
alter table public.course_assignment_submissions
  add constraint course_assignment_submissions_assignment_id_fkey
  foreign key (assignment_id) references public.course_assignments(id) on delete restrict;
alter table public.course_assignment_submissions drop constraint if exists course_assignment_submissions_student_id_fkey;
alter table public.course_assignment_submissions
  add constraint course_assignment_submissions_student_id_fkey
  foreign key (student_id) references public.profiles(user_id) on delete restrict;

alter table public.support_replies drop constraint if exists support_replies_request_id_fkey;
alter table public.support_replies
  add constraint support_replies_request_id_fkey
  foreign key (request_id) references public.support_requests(id) on delete restrict;

alter table public.session_roster_snapshots drop constraint if exists session_roster_snapshots_session_id_fkey;
alter table public.session_roster_snapshots
  add constraint session_roster_snapshots_session_id_fkey
  foreign key (session_id) references public.class_sessions(id) on delete restrict;
alter table public.session_roster_entries drop constraint if exists session_roster_entries_session_id_fkey;
alter table public.session_roster_entries
  add constraint session_roster_entries_session_id_fkey
  foreign key (session_id) references public.session_roster_snapshots(session_id) on delete restrict;
alter table public.session_roster_entries drop constraint if exists session_roster_entries_student_id_fkey;
alter table public.session_roster_entries
  add constraint session_roster_entries_student_id_fkey
  foreign key (student_id) references public.profiles(user_id) on delete restrict;

alter table public.session_attendance_events drop constraint if exists session_attendance_events_roster_entry_fkey;
alter table public.session_attendance_events
  add constraint session_attendance_events_roster_entry_fkey
  foreign key (session_id, student_id)
  references public.session_roster_entries(session_id, student_id)
  on delete restrict;

alter table public.session_attendance drop constraint if exists session_attendance_session_id_fkey;
alter table public.session_attendance
  add constraint session_attendance_session_id_fkey
  foreign key (session_id) references public.class_sessions(id) on delete restrict;
alter table public.session_attendance drop constraint if exists session_attendance_student_id_fkey;
alter table public.session_attendance
  add constraint session_attendance_student_id_fkey
  foreign key (student_id) references public.profiles(user_id) on delete restrict;
alter table public.session_attendance drop constraint if exists session_attendance_roster_entry_fkey;
alter table public.session_attendance
  add constraint session_attendance_roster_entry_fkey
  foreign key (session_id, student_id)
  references public.session_roster_entries(session_id, student_id)
  on delete restrict;
alter table public.session_attendance alter column marked_by set not null;

create index if not exists account_roles_role_code_idx on public.account_roles (role_code);
create index if not exists role_permissions_permission_code_idx on public.role_permissions (permission_code);
create index if not exists guardian_links_student_id_idx on public.guardian_links (student_id);
create index if not exists teacher_profiles_subject_id_idx on public.teacher_profiles (subject_id);
create index if not exists courses_catalog_idx on public.courses (grade_id, subject_id, track, status);
create index if not exists courses_subject_id_idx on public.courses (subject_id);
create index if not exists courses_teacher_id_idx on public.courses (teacher_id);
create index if not exists learning_groups_course_id_idx on public.learning_groups (course_id);
create index if not exists learning_groups_teacher_id_idx on public.learning_groups (teacher_id);
create index if not exists group_members_student_id_idx on public.group_members (student_id);
create index if not exists group_join_requests_group_status_idx on public.group_join_requests (group_id, status, expires_at);
create index if not exists group_join_requests_student_id_idx on public.group_join_requests (student_id);
create index if not exists group_join_requests_reviewed_by_idx on public.group_join_requests (reviewed_by);
create unique index if not exists group_join_requests_open_idx
  on public.group_join_requests (group_id, student_id) where status in ('reserved', 'paid');
create index if not exists group_payments_request_id_idx on public.group_payments (request_id);
create index if not exists class_sessions_group_id_idx on public.class_sessions (group_id, starts_at);
create index if not exists class_sessions_teacher_id_idx on public.class_sessions (teacher_id, starts_at);
create index if not exists teacher_earnings_approved_by_idx on public.teacher_earnings (approved_by);
create index if not exists teacher_applications_subject_id_idx on public.teacher_applications (subject_id);
create unique index if not exists teacher_applications_one_pending_per_subject
  on public.teacher_applications (lower(email), subject_id) where status = 'pending';
create index if not exists support_requests_requester_id_idx on public.support_requests (requester_id);
create index if not exists support_requests_queue_idx on public.support_requests (status, created_at desc);
create index if not exists support_replies_request_id_idx on public.support_replies (request_id, created_at);
create index if not exists support_replies_author_id_idx on public.support_replies (author_id);
create index if not exists chat_participants_user_id_idx on public.chat_participants (user_id);
create index if not exists chat_messages_thread_id_idx on public.chat_messages (thread_id, created_at);
create index if not exists chat_messages_sender_id_idx on public.chat_messages (sender_id);
create index if not exists course_enrollments_course_id_idx on public.course_enrollments (course_id);
create index if not exists course_assignments_course_id_idx on public.course_assignments (course_id);
create index if not exists course_assignment_submissions_student_id_idx on public.course_assignment_submissions (student_id);
create index if not exists session_attendance_student_id_idx on public.session_attendance (student_id);
create index if not exists session_roster_entries_student_idx on public.session_roster_entries (student_id, session_id);
create index if not exists session_attendance_events_session_student_idx
  on public.session_attendance_events (session_id, student_id, marked_at desc);

insert into public.roles (code, label) values
  ('owner', 'المالك'), ('admin', 'الإدارة'), ('manager', 'مدير'),
  ('support', 'الدعم الفني'), ('teacher', 'مدرس'), ('student', 'طالب'),
  ('parent', 'ولي أمر')
on conflict (code) do nothing;

insert into public.stages (id, name, position) values
  ('kindergarten', 'الحضانة', 1), ('primary', 'المرحلة الابتدائية', 2),
  ('preparatory', 'المرحلة الإعدادية', 3), ('secondary', 'المرحلة الثانوية', 4)
on conflict (id) do nothing;

insert into public.grades (id, stage_id, name, position)
select stage.id || '-' || n, stage.id,
  case when stage.id = 'kindergarten' then 'KG' || n
    else 'الصف ' || (array['الأول','الثاني','الثالث','الرابع','الخامس','السادس'])[n] ||
      case stage.id when 'primary' then ' الابتدائي' when 'preparatory' then ' الإعدادي' else ' الثانوي' end
  end, n
from public.stages stage
cross join lateral generate_series(1, case stage.id when 'kindergarten' then 2 when 'primary' then 6 else 3 end) n
where stage.id in ('kindergarten', 'primary', 'preparatory', 'secondary')
on conflict (id) do nothing;

insert into public.subjects (id, name) values
  ('math', 'الرياضيات'), ('arabic', 'اللغة العربية'), ('science', 'العلوم'),
  ('english', 'اللغة الإنجليزية'), ('physics', 'الفيزياء'), ('history', 'التاريخ')
on conflict (id) do nothing;

insert into public.site_settings (id) values (true) on conflict (id) do nothing;

create or replace function liveschool_internal.create_account_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
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
  values (
    new.id,
    coalesce(nullif(left(btrim(new.raw_user_meta_data ->> 'display_name'), 100), ''), 'مستخدم'),
    'active'
  );
  insert into public.account_roles (user_id, role_code)
  values (new.id, assigned_role);
  return new;
end;
$function$;

create or replace function public.assign_created_account_role(account_id uuid, assigned_role text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
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
$function$;

create or replace function public.assign_owner_role(account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.account_roles (user_id, role_code)
  values (account_id, 'owner')
  on conflict (user_id, role_code) do nothing;
  delete from public.account_roles
  where user_id = account_id and role_code in ('student', 'parent');
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

create or replace function liveschool_internal.capture_session_roster_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  group_active boolean;
begin
  if new.status <> 'scheduled' or new.starts_at <= clock_timestamp() then
    return new;
  end if;

  select g.active into group_active
  from public.learning_groups g
  where g.id = new.group_id
  for update;
  if not found or group_active is not true then
    raise exception 'session_group_unavailable' using errcode = '23514';
  end if;

  insert into public.session_roster_snapshots (session_id, source, captured_by)
  values (new.id, 'live', (select auth.uid()));

  insert into public.session_roster_entries (session_id, student_id, display_name, enrolled_at)
  select new.id, p.user_id, p.display_name, gm.enrolled_at
  from public.group_members gm
  join public.profiles p on p.user_id = gm.student_id
  join public.account_roles r on r.user_id = p.user_id
  where gm.group_id = new.group_id and p.status = 'active' and r.role_code = 'student';

  return new;
end;
$function$;

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

create or replace function liveschool_internal.is_active_teacher(p_user_id uuid)
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
    where p.user_id = p_user_id and p.status = 'active' and r.role_code = 'teacher'
  );
$function$;

create or replace function liveschool_internal.can_access_group_chat(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.chat_threads t
    join public.learning_groups g on g.id = t.group_id
    join public.profiles actor
      on actor.user_id = (select auth.uid()) and actor.status = 'active'
    where t.id = p_thread_id
      and t.group_id is not null
      and g.active
      and (
        (
          g.teacher_id = actor.user_id
          and exists (
            select 1 from public.account_roles r
            where r.user_id = actor.user_id and r.role_code = 'teacher'
          )
        )
        or exists (
          select 1
          from public.group_members gm
          join public.account_roles r on r.user_id = gm.student_id
          where gm.group_id = g.id
            and gm.student_id = actor.user_id
            and r.role_code = 'student'
        )
      )
  );
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
    join public.profiles actor
      on actor.user_id = (select auth.uid()) and actor.status = 'active'
    where s.id = p_session_id
      and (
        (
          s.teacher_id = actor.user_id
          and exists (
            select 1 from public.account_roles r
            where r.user_id = actor.user_id and r.role_code = 'teacher'
          )
        )
        or exists (
          select 1
          from public.session_roster_entries re
          join public.account_roles r on r.user_id = re.student_id
          where re.session_id = s.id
            and re.student_id = actor.user_id
            and r.role_code = 'student'
        )
        or exists (
          select 1
          from public.session_roster_entries re
          join public.guardian_links gl on gl.student_id = re.student_id
          join public.account_roles r on r.user_id = gl.guardian_id
          where re.session_id = s.id
            and gl.guardian_id = actor.user_id
            and r.role_code = 'parent'
        )
      )
  );
$function$;

create or replace function liveschool_internal.enforce_enrollment_review_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  course_status text;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.reviewed_by is not null or new.reviewed_at is not null then
      raise exception 'enrollment_insert_requires_pending_review' using errcode = '23514';
    end if;
    return new;
  end if;

  if new.status = old.status
     and (new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at) then
    raise exception 'enrollment_review_audit_immutable' using errcode = '23514';
  end if;

  if new.status <> old.status then
    if old.status <> 'pending' or new.status not in ('active', 'declined')
       or new.reviewed_by is null or new.reviewed_at is null then
      raise exception 'enrollment_review_audit_required' using errcode = '23514';
    end if;
    if not exists (
      select 1
      from public.profiles p
      join public.account_roles r on r.user_id = p.user_id
      where p.user_id = new.reviewed_by and p.status = 'active' and r.role_code in ('admin', 'owner')
    ) then
      raise exception 'enrollment_reviewer_forbidden' using errcode = '42501';
    end if;
    select c.status into course_status from public.courses c where c.id = new.course_id;
    if new.status = 'active' and course_status <> 'published' then
      raise exception 'enrollment_course_not_published' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function liveschool_internal.validate_class_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  group_teacher uuid;
begin
  select g.teacher_id into group_teacher
  from public.learning_groups g
  where g.id = new.group_id
  for update;
  if not found or group_teacher <> new.teacher_id then
    raise exception 'session_teacher_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$function$;

create or replace function liveschool_internal.protect_group_session_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (select 1 from public.class_sessions where group_id = old.id)
     and (new.course_id <> old.course_id or new.teacher_id <> old.teacher_id) then
    raise exception 'group_session_history_protected' using errcode = '23514';
  end if;
  return new;
end;
$function$;

create or replace function liveschool_internal.reject_attendance_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception 'attendance_history_is_append_only' using errcode = '23514';
end;
$function$;

drop trigger if exists liveschool_create_account_profile on auth.users;
create trigger liveschool_create_account_profile
after insert on auth.users
for each row execute function liveschool_internal.create_account_profile();

drop trigger if exists session_roster_capture on public.class_sessions;
create trigger session_roster_capture
after insert on public.class_sessions
for each row execute function liveschool_internal.capture_session_roster_on_insert();

drop trigger if exists enrollment_review_audit on public.course_enrollments;
create trigger enrollment_review_audit
before insert or update of status, reviewed_by, reviewed_at on public.course_enrollments
for each row execute function liveschool_internal.enforce_enrollment_review_audit();

drop trigger if exists class_session_teacher_consistency on public.class_sessions;
create trigger class_session_teacher_consistency
before insert or update of group_id, teacher_id on public.class_sessions
for each row execute function liveschool_internal.validate_class_session();

drop trigger if exists group_session_history_guard on public.learning_groups;
create trigger group_session_history_guard
before update of course_id, teacher_id on public.learning_groups
for each row execute function liveschool_internal.protect_group_session_history();

drop trigger if exists session_roster_snapshots_immutable on public.session_roster_snapshots;
create trigger session_roster_snapshots_immutable
before update or delete on public.session_roster_snapshots
for each row execute function liveschool_internal.reject_attendance_history_mutation();
drop trigger if exists session_roster_entries_immutable on public.session_roster_entries;
create trigger session_roster_entries_immutable
before update or delete on public.session_roster_entries
for each row execute function liveschool_internal.reject_attendance_history_mutation();
drop trigger if exists session_attendance_events_immutable on public.session_attendance_events;
create trigger session_attendance_events_immutable
before update or delete on public.session_attendance_events
for each row execute function liveschool_internal.reject_attendance_history_mutation();

do $rls$
declare
  relation_name text;
begin
  for relation_name in
    select unnest(array[
      'profiles', 'roles', 'permissions', 'account_roles', 'role_permissions', 'guardian_links',
      'stages', 'grades', 'subjects', 'teacher_profiles', 'courses', 'course_units', 'lessons',
      'learning_groups', 'group_members', 'group_join_requests', 'group_payments', 'class_sessions',
      'teacher_earnings', 'teacher_applications', 'support_requests', 'support_replies',
      'chat_threads', 'chat_participants', 'chat_messages', 'site_settings', 'course_enrollments',
      'course_assignments', 'course_assignment_submissions', 'session_attendance',
      'session_roster_snapshots', 'session_roster_entries', 'session_attendance_events'
    ])
  loop
    execute format('alter table public.%I enable row level security', relation_name);
  end loop;
end;
$rls$;

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Guardians can read linked student profiles" on public.profiles;
create policy "Guardians can read linked student profiles" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.guardian_links gl
      where gl.guardian_id = (select auth.uid()) and gl.student_id = profiles.user_id
    )
  );
drop policy if exists "Guardians can read their links" on public.guardian_links;
create policy "Guardians can read their links" on public.guardian_links
  for select to authenticated using ((select auth.uid()) = guardian_id);
drop policy if exists "Read own roles" on public.account_roles;
create policy "Read own roles" on public.account_roles
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Read role labels" on public.roles;
create policy "Read role labels" on public.roles
  for select to authenticated using (true);
drop policy if exists "Demo visibility is public" on public.site_settings;
create policy "Demo visibility is public" on public.site_settings
  for select to anon, authenticated using (true);

drop policy if exists "Read stages" on public.stages;
create policy "Read stages" on public.stages for select to anon, authenticated using (true);
drop policy if exists "Read grades" on public.grades;
create policy "Read grades" on public.grades for select to anon, authenticated using (true);
drop policy if exists "Read subjects" on public.subjects;
create policy "Read subjects" on public.subjects for select to anon, authenticated using (true);

drop policy if exists "Read active teacher profiles" on public.teacher_profiles;
create policy "Read active teacher profiles" on public.teacher_profiles
  for select to anon, authenticated
  using (liveschool_internal.is_active_teacher(teacher_profiles.user_id));

drop policy if exists "Read published courses" on public.courses;
create policy "Read published courses" on public.courses
  for select to anon, authenticated using (status = 'published');
drop policy if exists "Read published course units" on public.course_units;
create policy "Read published course units" on public.course_units
  for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'));
drop policy if exists "Read published lessons" on public.lessons;
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
drop policy if exists "Read active public groups" on public.learning_groups;
create policy "Read active public groups" on public.learning_groups
  for select to anon, authenticated
  using (
    active and exists (
      select 1 from public.courses c where c.id = course_id and c.status = 'published'
    )
  );

drop policy if exists "Requesters can read their own course enrollments" on public.course_enrollments;
create policy "Requesters can read their own course enrollments" on public.course_enrollments
  for select to authenticated using ((select auth.uid()) = requester_id);

drop policy if exists "Read accessible sessions" on public.class_sessions;
create policy "Read accessible sessions" on public.class_sessions
  for select to authenticated
  using (liveschool_internal.can_access_attendance_session(class_sessions.id));
drop policy if exists "Read accessible roster snapshots" on public.session_roster_snapshots;
create policy "Read accessible roster snapshots" on public.session_roster_snapshots
  for select to authenticated
  using (liveschool_internal.can_access_attendance_session(session_roster_snapshots.session_id));
drop policy if exists "Read accessible roster entries" on public.session_roster_entries;
create policy "Read accessible roster entries" on public.session_roster_entries
  for select to authenticated
  using (liveschool_internal.can_access_attendance_session(session_roster_entries.session_id));
drop policy if exists "Read accessible attendance" on public.session_attendance;
create policy "Read accessible attendance" on public.session_attendance
  for select to authenticated
  using (liveschool_internal.can_access_attendance_session(session_attendance.session_id));
drop policy if exists "Read accessible attendance events" on public.session_attendance_events;
create policy "Read accessible attendance events" on public.session_attendance_events
  for select to authenticated
  using (liveschool_internal.can_access_attendance_session(session_attendance_events.session_id));

drop policy if exists "Create chat threads" on public.chat_threads;
drop policy if exists "Read joined threads" on public.chat_threads;
create policy "Read joined threads" on public.chat_threads
  for select to authenticated
  using (liveschool_internal.can_access_group_chat(chat_threads.id));
drop policy if exists "Read messages in joined threads" on public.chat_messages;
create policy "Read messages in joined threads" on public.chat_messages
  for select to authenticated
  using (liveschool_internal.can_access_group_chat(chat_messages.thread_id));
drop policy if exists "Send messages to joined threads" on public.chat_messages;
create policy "Send messages to joined threads" on public.chat_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and attachment_key is null
    and char_length(btrim(body)) between 1 and 2000
    and liveschool_internal.can_access_group_chat(chat_messages.thread_id)
  );
drop policy if exists "Read own thread memberships" on public.chat_participants;
create policy "Read own thread memberships" on public.chat_participants
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.chat_threads t
      where t.id = chat_participants.thread_id
        and liveschool_internal.can_access_group_chat(t.id)
    )
  );
drop policy if exists "Join own chat threads" on public.chat_participants;

do $grants$
declare
  relation_name text;
begin
  for relation_name in
    select unnest(array[
      'profiles', 'roles', 'permissions', 'account_roles', 'role_permissions', 'guardian_links',
      'stages', 'grades', 'subjects', 'teacher_profiles', 'courses', 'course_units', 'lessons',
      'learning_groups', 'group_members', 'group_join_requests', 'group_payments', 'class_sessions',
      'teacher_earnings', 'teacher_applications', 'support_requests', 'support_replies',
      'chat_threads', 'chat_participants', 'chat_messages', 'site_settings', 'course_enrollments',
      'course_assignments', 'course_assignment_submissions', 'session_attendance',
      'session_roster_snapshots', 'session_roster_entries', 'session_attendance_events'
    ])
  loop
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', relation_name);
  end loop;
end;
$grants$;

revoke all (id, demo_enabled, social_links) on public.site_settings
  from public, anon, authenticated, service_role;

grant select on public.roles, public.permissions, public.account_roles, public.role_permissions,
  public.guardian_links, public.stages, public.grades, public.subjects, public.teacher_profiles,
  public.courses, public.course_units, public.lessons, public.learning_groups, public.group_members,
  public.group_join_requests, public.group_payments, public.class_sessions, public.teacher_earnings,
  public.teacher_applications, public.support_requests, public.chat_threads, public.chat_participants,
  public.chat_messages, public.course_enrollments, public.course_assignments,
  public.course_assignment_submissions, public.session_attendance, public.session_roster_snapshots,
  public.session_roster_entries, public.session_attendance_events to service_role;
grant select, update on public.profiles to service_role;
grant update (role_code) on public.account_roles to service_role;
grant select, insert, update on public.teacher_profiles to service_role;
grant select, insert, update on public.courses to service_role;
grant update (body) on public.lessons to service_role;
grant select, insert on public.teacher_applications to service_role;
grant update (status) on public.teacher_applications to service_role;
grant select, update on public.site_settings to service_role;
grant select, insert on public.course_enrollments to service_role;
grant select, insert on public.course_assignments to service_role;
grant select, insert on public.course_assignment_submissions to service_role;
grant update (feedback) on public.course_assignment_submissions to service_role;

grant select on public.stages, public.grades, public.subjects to anon, authenticated;
grant select (demo_enabled, social_links) on public.site_settings to anon, authenticated;
grant select (user_id, subject_id, full_name, qualification, experience_years, bio, portrait_path)
  on public.teacher_profiles to anon, authenticated;
grant select on public.courses, public.course_units, public.lessons to anon, authenticated;
grant select (id, name, weekday, starts_at_local, timezone, course_id, active)
  on public.learning_groups to anon, authenticated;
grant select on public.profiles, public.account_roles, public.roles,
  public.guardian_links, public.course_enrollments, public.class_sessions, public.session_roster_snapshots,
  public.session_roster_entries, public.session_attendance, public.session_attendance_events,
  public.chat_threads, public.chat_participants, public.chat_messages to authenticated;
grant insert (thread_id, sender_id, body) on public.chat_messages to authenticated;

revoke all on function public.assign_created_account_role(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.assign_owner_role(uuid) from public, anon, authenticated, service_role;
revoke all on function public.save_learning_group(uuid, uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid[])
  from public, anon, authenticated, service_role;
revoke all on function public.complete_teacher_onboarding(uuid, uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.review_course_enrollment_as_admin(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.record_session_attendance(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.create_account_profile() from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.is_active_teacher(uuid) from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.capture_session_roster_on_insert() from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.can_access_group_chat(uuid) from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.can_access_attendance_session(uuid) from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.enforce_enrollment_review_audit() from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.validate_class_session() from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.protect_group_session_history() from public, anon, authenticated, service_role;
revoke all on function liveschool_internal.reject_attendance_history_mutation() from public, anon, authenticated, service_role;

grant execute on function public.assign_created_account_role(uuid, text) to service_role;
grant execute on function public.assign_owner_role(uuid) to service_role;
grant execute on function public.save_learning_group(uuid, uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid[])
  to service_role;
grant execute on function public.complete_teacher_onboarding(uuid, uuid, uuid, jsonb) to service_role;
grant execute on function public.review_course_enrollment_as_admin(uuid, uuid, text) to authenticated;
grant execute on function public.record_session_attendance(uuid, uuid, text) to authenticated;
grant usage on schema liveschool_internal to anon, authenticated;
grant execute on function liveschool_internal.is_active_teacher(uuid) to anon, authenticated;
grant execute on function liveschool_internal.can_access_group_chat(uuid) to authenticated;
grant execute on function liveschool_internal.can_access_attendance_session(uuid) to authenticated;

do $legacy_functions$
declare
  function_signature text;
begin
  if to_regprocedure('public.review_course_enrollment(uuid,uuid,text)') is not null then
    revoke all on function public.review_course_enrollment(uuid, uuid, text)
      from public, anon, authenticated, service_role;
  end if;

  foreach function_signature in array array[
    'liveschool_internal.direct_chat_contacts(text,boolean)',
    'liveschool_internal.direct_chat_thread_ids(uuid,uuid)',
    'liveschool_internal.can_access_chat_attachment(text,boolean)',
    'liveschool_internal.read_direct_chat(text,boolean,uuid)',
    'liveschool_internal.send_direct_chat(text,boolean,uuid,text,text,text)',
    'public.read_direct_chat(text,boolean,uuid)',
    'public.send_direct_chat(text,boolean,uuid,text,text,text)'
  ] loop
    if to_regprocedure(function_signature) is not null then
      execute format('revoke all on function %s from public, anon, authenticated, service_role', function_signature);
    end if;
  end loop;
end;
$legacy_functions$;

-- Final assertions run inside the same transaction before commit.
do $final$
declare
  expected_tables text[] := array[
    'profiles', 'roles', 'permissions', 'account_roles', 'role_permissions', 'guardian_links',
    'stages', 'grades', 'subjects', 'teacher_profiles', 'courses', 'course_units', 'lessons',
    'learning_groups', 'group_members', 'group_join_requests', 'group_payments', 'class_sessions',
    'teacher_earnings', 'teacher_applications', 'support_requests', 'support_replies',
    'chat_threads', 'chat_participants', 'chat_messages', 'site_settings', 'course_enrollments',
    'course_assignments', 'course_assignment_submissions', 'session_attendance',
    'session_roster_snapshots', 'session_roster_entries', 'session_attendance_events'
  ];
  missing_tables text[];
  rls_disabled text[];
  invalid_constraints text[];
  unsafe_functions text[];
  unexpected_policies jsonb;
begin
  select coalesce(array_agg(expected.table_name order by expected.table_name), '{}'::text[])
  into missing_tables
  from unnest(expected_tables) as expected(table_name)
  where to_regclass(format('public.%I', expected.table_name)) is null;
  if cardinality(missing_tables) > 0 then
    raise exception 'Missing required tables: %', array_to_string(missing_tables, ', ');
  end if;

  select coalesce(array_agg(c.relname order by c.relname), '{}'::text[])
  into rls_disabled
  from unnest(expected_tables) as expected(table_name)
  join pg_class c on c.relname = expected.table_name
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where not c.relrowsecurity;
  if cardinality(rls_disabled) > 0 then
    raise exception 'RLS disabled on: %', array_to_string(rls_disabled, ', ');
  end if;

  select coalesce(array_agg(con.conname order by con.conname), '{}'::text[])
  into invalid_constraints
  from pg_constraint con
  join pg_namespace n on n.oid = con.connamespace and n.nspname = 'public'
  where not con.convalidated;
  if cardinality(invalid_constraints) > 0 then
    raise exception 'Unvalidated constraints: %', array_to_string(invalid_constraints, ', ');
  end if;

  select coalesce(array_agg(p.proname order by p.proname), '{}'::text[])
  into unsafe_functions
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where (
    (n.nspname = 'public' and p.proname in (
      'assign_owner_role', 'save_learning_group', 'complete_teacher_onboarding',
      'review_course_enrollment_as_admin', 'record_session_attendance'
    ))
    or (n.nspname = 'liveschool_internal' and p.proname in (
      'create_account_profile', 'is_active_teacher', 'capture_session_roster_on_insert', 'can_access_group_chat',
      'can_access_attendance_session', 'enforce_enrollment_review_audit', 'validate_class_session',
      'protect_group_session_history', 'reject_attendance_history_mutation'
    ))
  )
    and (not p.prosecdef or coalesce(p.proconfig, '{}'::text[]) <> array['search_path=""']);
  if cardinality(unsafe_functions) > 0 then
    raise exception 'Unsafe function configuration: %', array_to_string(unsafe_functions, ', ');
  end if;

  if not has_function_privilege('authenticated', 'public.review_course_enrollment_as_admin(uuid,uuid,text)', 'EXECUTE')
     or has_function_privilege('service_role', 'public.review_course_enrollment_as_admin(uuid,uuid,text)', 'EXECUTE') then
    raise exception 'Enrollment RPC privileges do not match the JWT-aware contract';
  end if;
  if not has_function_privilege('authenticated', 'public.record_session_attendance(uuid,uuid,text)', 'EXECUTE')
     or has_function_privilege('service_role', 'public.record_session_attendance(uuid,uuid,text)', 'EXECUTE') then
    raise exception 'Attendance RPC privileges do not match the JWT-aware contract';
  end if;
  if not has_schema_privilege('anon', 'liveschool_internal', 'USAGE')
     or not has_function_privilege('anon', 'liveschool_internal.is_active_teacher(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'liveschool_internal.is_active_teacher(uuid)', 'EXECUTE') then
    raise exception 'Teacher-directory helper privileges do not match the public-read contract';
  end if;

  if not has_column_privilege('anon', 'public.site_settings', 'demo_enabled', 'SELECT')
     or not has_column_privilege('anon', 'public.site_settings', 'social_links', 'SELECT')
     or has_table_privilege('anon', 'public.site_settings', 'SELECT')
     or not has_column_privilege('authenticated', 'public.site_settings', 'demo_enabled', 'SELECT')
     or not has_column_privilege('authenticated', 'public.site_settings', 'social_links', 'SELECT')
     or has_table_privilege('authenticated', 'public.site_settings', 'SELECT')
     or exists (
       select 1
       from information_schema.column_privileges privileges
       where privileges.table_schema = 'public'
         and privileges.table_name = 'site_settings'
         and privileges.grantee in ('anon', 'authenticated')
         and privileges.privilege_type = 'SELECT'
         and privileges.column_name not in ('demo_enabled', 'social_links')
     ) then
    raise exception 'Settings read privileges do not match the public-column contract';
  end if;

  if exists (select 1 from public.chat_threads where group_id is null)
     or exists (select 1 from public.chat_messages where attachment_key is not null) then
    raise exception 'Chat containment assertions failed';
  end if;
  if exists (select 1 from public.session_attendance where marked_by is null)
     or exists (
       select 1 from public.session_attendance sa
       left join public.session_roster_entries re
         on re.session_id = sa.session_id and re.student_id = sa.student_id
       where re.session_id is null
     )
     or exists (
       select 1 from public.session_attendance sa
       where not exists (
         select 1 from public.session_attendance_events ae
         where ae.session_id = sa.session_id and ae.student_id = sa.student_id
       )
     ) then
    raise exception 'Attendance integrity assertions failed: missing markers, roster entries, or event coverage';
  end if;
  if not exists (
    select 1 from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid and rel.relname = 'course_enrollments'
    join pg_namespace ns on ns.oid = rel.relnamespace and ns.nspname = 'public'
    where con.conname = 'course_enrollments_reviewed_by_fkey'
      and con.convalidated and con.confdeltype = 'r'
  ) then
    raise exception 'Enrollment reviewer foreign key is not restrictive';
  end if;

  if to_regclass('liveschool_internal.direct_chat_threads') is not null
     or exists (select 1 from storage.buckets where id = 'chat-attachments') then
    raise exception 'Disabled feature assertions failed';
  end if;

  if exists (
    select 1
    from pg_publication_tables pt
    where pt.pubname = 'supabase_realtime'
      and pt.schemaname = 'public'
      and pt.tablename = any(expected_tables)
  ) then
    raise exception 'Unapproved Realtime publication membership detected for LiveSchool tables';
  end if;

  if to_regclass('public.notifications') is not null
     or to_regclass('public.payment_providers') is not null
     or to_regclass('public.payment_intents') is not null
     or to_regclass('public.payment_transactions') is not null
     or exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'class_sessions'
         and column_name in ('meeting_id', 'meeting_url', 'provider_meeting_id')
     )
     or exists (
       select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public', 'liveschool_internal')
         and p.proname in ('send_notification', 'create_payment_intent', 'create_meeting')
     ) then
    raise exception 'Unapproved notification, payment-provider, or meeting-provider artifacts detected';
  end if;

  if exists (
    select 1
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'liveschool_internal')
      and p.proname in ('direct_chat_contacts', 'direct_chat_thread_ids', 'can_access_chat_attachment', 'read_direct_chat', 'send_direct_chat')
      and (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE')
        or has_function_privilege('service_role', p.oid, 'EXECUTE')
        or exists (
          select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
          where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
        )
      )
  ) then
    raise exception 'Legacy direct-chat functions remain executable';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'table', policy.tablename, 'policy', policy.policyname, 'command', policy.cmd, 'roles', policy.roles
  ) order by policy.tablename, policy.policyname), '[]'::jsonb)
  into unexpected_policies
  from pg_policies policy
  where policy.schemaname = 'public'
    and policy.tablename = any(expected_tables)
    and not (
      policy.tablename || '|' || policy.policyname = any(array[
        'profiles|Read own profile',
        'profiles|Guardians can read linked student profiles',
        'guardian_links|Guardians can read their links',
        'account_roles|Read own roles',
        'roles|Read role labels',
        'site_settings|Demo visibility is public',
        'stages|Read stages',
        'grades|Read grades',
        'subjects|Read subjects',
        'teacher_profiles|Read active teacher profiles',
        'courses|Read published courses',
        'course_units|Read published course units',
        'lessons|Read published lessons',
        'learning_groups|Read active public groups',
        'course_enrollments|Requesters can read their own course enrollments',
        'class_sessions|Read accessible sessions',
        'session_roster_snapshots|Read accessible roster snapshots',
        'session_roster_entries|Read accessible roster entries',
        'session_attendance|Read accessible attendance',
        'session_attendance_events|Read accessible attendance events',
        'chat_threads|Read joined threads',
        'chat_messages|Read messages in joined threads',
        'chat_messages|Send messages to joined threads',
        'chat_participants|Read own thread memberships'
      ])
    );
  if jsonb_array_length(unexpected_policies) > 0 then
    raise exception 'Unexpected public policies detected: %', unexpected_policies;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
      and ('public' = any(roles) or 'anon' = any(roles))
  ) then
    raise exception 'Anonymous or PUBLIC write policy detected';
  end if;
end;
$final$;

commit;
