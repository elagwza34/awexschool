begin;

create table public.lesson_completions (
  student_id uuid not null default auth.uid() references public.profiles(user_id) on delete restrict,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  completed_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create index lesson_completions_lesson_idx on public.lesson_completions (lesson_id);
alter table public.lesson_completions enable row level security;
revoke all on public.lesson_completions from public, anon, authenticated;
grant select on public.lesson_completions to authenticated;
grant insert (lesson_id) on public.lesson_completions to authenticated;

create policy "Students read their accessible lesson completions"
  on public.lesson_completions for select to authenticated
  using (
    student_id = (select auth.uid())
    and liveschool_internal.has_active_role((select auth.uid()), array['student'])
    and exists (
      select 1 from public.lessons l
      join public.course_units u on u.id = l.unit_id
      where l.id = lesson_completions.lesson_id
        and liveschool_internal.can_read_course_lessons(u.course_id)
        and exists (
          select 1 from public.course_enrollments e
          where e.course_id = u.course_id and e.student_id = (select auth.uid())
            and e.status = 'active'
        )
    )
  );

create policy "Students record their accessible lesson completions"
  on public.lesson_completions for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and liveschool_internal.has_active_role((select auth.uid()), array['student'])
    and exists (
      select 1 from public.lessons l
      join public.course_units u on u.id = l.unit_id
      where l.id = lesson_completions.lesson_id
        and liveschool_internal.can_read_course_lessons(u.course_id)
        and exists (
          select 1 from public.course_enrollments e
          where e.course_id = u.course_id and e.student_id = (select auth.uid())
            and e.status = 'active'
        )
    )
  );

create function public.read_lesson_progress(p_portal text)
returns table (
  course_id uuid,
  course_title text,
  student_id uuid,
  student_name text,
  completed_lessons bigint,
  total_lessons bigint,
  last_completed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $progress$
  with actor as (
    select auth.uid() as id
    where p_portal in ('student', 'parent', 'teacher')
      and liveschool_internal.has_active_role((select auth.uid()), array[p_portal])
  ), scoped as (
    select distinct e.course_id, e.student_id, c.title, p.display_name
    from actor a
    join public.course_enrollments e on e.status = 'active'
    join public.courses c on c.id = e.course_id and c.status = 'published'
    join public.profiles p on p.user_id = e.student_id
    where liveschool_internal.has_active_role(e.student_id, array['student'])
      and (
        (p_portal = 'student' and e.student_id = a.id)
        or (p_portal = 'parent' and exists (
          select 1 from public.guardian_links g
          where g.guardian_id = a.id and g.student_id = e.student_id
        ))
        or (p_portal = 'teacher' and (
          c.teacher_id = a.id
          or exists (
            select 1 from public.learning_groups g
            join public.group_members m on m.group_id = g.id and m.student_id = e.student_id
            where g.course_id = c.id and g.teacher_id = a.id and g.active
          )
        ))
      )
  )
  select s.course_id, s.title, s.student_id, s.display_name,
         count(lc.lesson_id), count(l.id), max(lc.completed_at)
  from scoped s
  left join public.course_units u on u.course_id = s.course_id
  left join public.lessons l on l.unit_id = u.id
  left join public.lesson_completions lc on lc.lesson_id = l.id and lc.student_id = s.student_id
  group by s.course_id, s.student_id, s.title, s.display_name
  order by s.title, s.display_name, s.course_id, s.student_id;
$progress$;

revoke all on function public.read_lesson_progress(text) from public, anon, authenticated, service_role;
grant execute on function public.read_lesson_progress(text) to authenticated;

commit;
