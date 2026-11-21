alter table public.teacher_profiles
  add column portrait_path text
  check (portrait_path ~ '^/teachers/[a-z0-9-]+[.]webp$');

alter table public.courses
  add column teacher_id uuid references public.teacher_profiles(user_id) on delete set null;

create index courses_teacher_id_idx on public.courses (teacher_id);
grant insert, update on public.teacher_profiles to service_role;
grant update (teacher_id, status) on public.courses to service_role;
grant update (body) on public.lessons to service_role;
