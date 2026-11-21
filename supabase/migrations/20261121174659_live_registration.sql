insert into public.stages (id, name, position) values
  ('kindergarten', 'الحضانة', 1), ('primary', 'المرحلة الابتدائية', 2),
  ('preparatory', 'المرحلة الإعدادية', 3), ('secondary', 'المرحلة الثانوية', 4)
on conflict do nothing;

insert into public.grades (id, stage_id, name, position)
select stage.id || '-' || n, stage.id,
  case when stage.id = 'kindergarten' then 'KG' || n
    else 'الصف ' || (array['الأول','الثاني','الثالث','الرابع','الخامس','السادس'])[n] ||
      case stage.id when 'primary' then ' الابتدائي' when 'preparatory' then ' الإعدادي' else ' الثانوي' end
  end, n
from public.stages stage
cross join lateral generate_series(1, case stage.id when 'kindergarten' then 2 when 'primary' then 6 else 3 end) n
where stage.id in ('kindergarten', 'primary', 'preparatory', 'secondary')
on conflict do nothing;

insert into public.subjects (id, name) values
  ('math', 'الرياضيات'), ('arabic', 'اللغة العربية'), ('science', 'العلوم'),
  ('english', 'اللغة الإنجليزية'), ('physics', 'الفيزياء'), ('history', 'التاريخ')
on conflict do nothing;

grant select on public.subjects, public.grades, public.courses, public.course_units, public.lessons, public.teacher_profiles to service_role;
grant select, insert on public.teacher_applications to service_role;

create table public.course_enrollments (
  requester_id uuid not null references public.profiles(user_id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  learner_name text not null check (char_length(btrim(learner_name)) between 2 and 100),
  status text not null default 'pending' check (status in ('pending', 'active', 'declined')),
  created_at timestamptz not null default now(),
  primary key (requester_id, course_id)
);
create index course_enrollments_course_id_idx on public.course_enrollments (course_id);
alter table public.course_enrollments enable row level security;
revoke all on public.course_enrollments from public, anon, authenticated;
grant select on public.course_enrollments to authenticated;
grant select, insert, update on public.course_enrollments to service_role;
create policy "Requesters can read their own course enrollments"
  on public.course_enrollments for select to authenticated
  using ((select auth.uid()) = requester_id);

grant update (status) on public.teacher_applications to service_role;
create unique index teacher_applications_one_pending_per_subject
  on public.teacher_applications (lower(email), subject_id) where status = 'pending';
grant insert on public.courses to service_role;
grant select on public.learning_groups to service_role;
