create schema liveschool;
revoke all on schema liveschool from public, anon, authenticated;

create table liveschool.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (btrim(display_name) <> ''),
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  created_at timestamptz not null default now()
);

create table liveschool.roles (
  code text primary key,
  label text not null
);

insert into liveschool.roles (code, label) values
  ('owner', 'المالك'), ('admin', 'الإدارة'), ('manager', 'مدير'),
  ('support', 'الدعم الفني'), ('teacher', 'مدرس'), ('student', 'طالب'),
  ('parent', 'ولي أمر');

create table liveschool.permissions (
  code text primary key,
  label text not null
);

create table liveschool.account_roles (
  user_id uuid not null references liveschool.profiles(user_id) on delete cascade,
  role_code text not null references liveschool.roles(code),
  primary key (user_id, role_code)
);
create index account_roles_role_code_idx on liveschool.account_roles (role_code);

create table liveschool.role_permissions (
  role_code text not null references liveschool.roles(code) on delete cascade,
  permission_code text not null references liveschool.permissions(code) on delete cascade,
  primary key (role_code, permission_code)
);
create index role_permissions_permission_code_idx on liveschool.role_permissions (permission_code);

create table liveschool.guardian_links (
  guardian_id uuid not null references liveschool.profiles(user_id) on delete cascade,
  student_id uuid not null references liveschool.profiles(user_id) on delete cascade,
  primary key (guardian_id, student_id),
  check (guardian_id <> student_id)
);
create index guardian_links_student_id_idx on liveschool.guardian_links (student_id);

create table liveschool.stages (
  id text primary key,
  name text not null,
  position smallint not null unique check (position > 0)
);

create table liveschool.grades (
  id text primary key,
  stage_id text not null references liveschool.stages(id),
  name text not null,
  position smallint not null check (position > 0),
  unique (stage_id, position)
);

create table liveschool.subjects (
  id text primary key,
  name text not null
);

create table liveschool.teacher_profiles (
  user_id uuid primary key references liveschool.profiles(user_id) on delete cascade,
  subject_id text not null references liveschool.subjects(id),
  full_name text not null,
  qualification text,
  experience_years smallint check (experience_years >= 0),
  bio text,
  intro_video_key text,
  session_rate_minor bigint check (session_rate_minor >= 0)
);
create index teacher_profiles_subject_id_idx on liveschool.teacher_profiles (subject_id);

create table liveschool.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  grade_id text not null references liveschool.grades(id),
  subject_id text not null references liveschool.subjects(id),
  track text not null check (track in ('arabic', 'languages')),
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now()
);
create index courses_catalog_idx on liveschool.courses (grade_id, subject_id, track, status);
create index courses_subject_id_idx on liveschool.courses (subject_id);

create table liveschool.course_units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references liveschool.courses(id) on delete cascade,
  title text not null,
  position integer not null check (position > 0),
  unique (course_id, position)
);

create table liveschool.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references liveschool.course_units(id) on delete cascade,
  title text not null,
  position integer not null check (position > 0),
  body text not null default '',
  unique (unit_id, position)
);

create table liveschool.learning_groups (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references liveschool.courses(id),
  teacher_id uuid not null references liveschool.teacher_profiles(user_id),
  name text not null check (btrim(name) <> ''),
  capacity integer not null check (capacity between 1 and 500),
  fee_minor bigint not null check (fee_minor >= 0),
  weekday smallint not null check (weekday between 1 and 7),
  starts_at_local time not null,
  timezone text not null default 'Africa/Cairo',
  active boolean not null default false,
  created_at timestamptz not null default now()
);
create index learning_groups_course_id_idx on liveschool.learning_groups (course_id);
create index learning_groups_teacher_id_idx on liveschool.learning_groups (teacher_id);

create table liveschool.group_members (
  group_id uuid not null references liveschool.learning_groups(id),
  student_id uuid not null references liveschool.profiles(user_id),
  enrolled_at timestamptz not null default now(),
  primary key (group_id, student_id)
);
create index group_members_student_id_idx on liveschool.group_members (student_id);

create table liveschool.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references liveschool.learning_groups(id),
  student_id uuid not null references liveschool.profiles(user_id),
  fee_minor bigint not null check (fee_minor >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'expired', 'paid', 'approved', 'rejected')),
  expires_at timestamptz not null,
  reviewed_by uuid references liveschool.profiles(user_id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (
    (status in ('approved', 'rejected') and reviewed_at is not null and reviewed_by is not null)
    or (status not in ('approved', 'rejected') and reviewed_at is null and reviewed_by is null)
  )
);
create index group_join_requests_group_status_idx on liveschool.group_join_requests (group_id, status, expires_at);
create index group_join_requests_student_id_idx on liveschool.group_join_requests (student_id);
create index group_join_requests_reviewed_by_idx on liveschool.group_join_requests (reviewed_by);
create unique index group_join_requests_open_idx
  on liveschool.group_join_requests (group_id, student_id) where status in ('reserved', 'paid');

create table liveschool.group_payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references liveschool.group_join_requests(id),
  provider text not null,
  provider_reference text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  status text not null check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  unique (provider, provider_reference)
);
create index group_payments_request_id_idx on liveschool.group_payments (request_id);

create table liveschool.class_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references liveschool.learning_groups(id),
  teacher_id uuid not null references liveschool.teacher_profiles(user_id),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  check (ends_at > starts_at)
);
create index class_sessions_group_id_idx on liveschool.class_sessions (group_id, starts_at);
create index class_sessions_teacher_id_idx on liveschool.class_sessions (teacher_id, starts_at);

create table liveschool.teacher_earnings (
  session_id uuid primary key references liveschool.class_sessions(id),
  amount_minor bigint not null check (amount_minor >= 0),
  approved_by uuid not null references liveschool.profiles(user_id),
  approved_at timestamptz not null default now(),
  paid_at timestamptz
);
create index teacher_earnings_approved_by_idx on liveschool.teacher_earnings (approved_by);

create table liveschool.teacher_applications (
  id uuid primary key default gen_random_uuid(),
  email text not null check (btrim(email) <> ''),
  full_name text not null check (btrim(full_name) <> ''),
  subject_id text not null references liveschool.subjects(id),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  intro_video_key text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);
create index teacher_applications_subject_id_idx on liveschool.teacher_applications (subject_id);

create table liveschool.support_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references liveschool.profiles(user_id) on delete set null,
  contact_name text not null,
  contact_email text not null,
  title text not null,
  details text not null,
  status text not null default 'new' check (status in ('new', 'in-progress', 'resolved')),
  created_at timestamptz not null default now()
);
create index support_requests_requester_id_idx on liveschool.support_requests (requester_id);
create index support_requests_queue_idx on liveschool.support_requests (status, created_at desc);

create table liveschool.support_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references liveschool.support_requests(id) on delete cascade,
  author_id uuid not null references liveschool.profiles(user_id),
  body text not null check (btrim(body) <> ''),
  created_at timestamptz not null default now()
);
create index support_replies_request_id_idx on liveschool.support_replies (request_id, created_at);
create index support_replies_author_id_idx on liveschool.support_replies (author_id);

create table liveschool.chat_threads (
  id uuid primary key default gen_random_uuid(),
  group_id uuid unique references liveschool.learning_groups(id),
  created_at timestamptz not null default now()
);

create table liveschool.chat_participants (
  thread_id uuid not null references liveschool.chat_threads(id) on delete cascade,
  user_id uuid not null references liveschool.profiles(user_id),
  primary key (thread_id, user_id)
);
create index chat_participants_user_id_idx on liveschool.chat_participants (user_id);

create table liveschool.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references liveschool.chat_threads(id),
  sender_id uuid not null references liveschool.profiles(user_id),
  body text not null default '',
  attachment_key text,
  created_at timestamptz not null default now(),
  check (btrim(body) <> '' or attachment_key is not null)
);
create index chat_messages_thread_id_idx on liveschool.chat_messages (thread_id, created_at);
create index chat_messages_sender_id_idx on liveschool.chat_messages (sender_id);

-- Application access will be granted with the corresponding workflow policies.
do $$
declare
  relation record;
begin
  for relation in select tablename from pg_tables where schemaname = 'liveschool'
  loop
    execute format('alter table liveschool.%I enable row level security', relation.tablename);
  end loop;
end
$$;
revoke all on all tables in schema liveschool from public, anon, authenticated;
