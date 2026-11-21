create table public.course_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 160),
  instructions text not null check (length(btrim(instructions)) between 5 and 5000),
  due_on date,
  created_at timestamptz not null default now()
);
create index course_assignments_course_id_idx on public.course_assignments (course_id);

create table public.course_assignment_submissions (
  assignment_id uuid not null references public.course_assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  response text not null check (length(btrim(response)) between 1 and 10000),
  feedback text check (length(btrim(feedback)) between 1 and 5000),
  submitted_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);
create index course_assignment_submissions_student_id_idx on public.course_assignment_submissions (student_id);

alter table public.course_assignments enable row level security;
alter table public.course_assignment_submissions enable row level security;
revoke all on public.course_assignments, public.course_assignment_submissions from public, anon, authenticated;
grant select, insert on public.course_assignments to service_role;
grant select, insert on public.course_assignment_submissions to service_role;
grant update (feedback) on public.course_assignment_submissions to service_role;
