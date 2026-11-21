grant select on public.guardian_links, public.group_members, public.class_sessions,
  public.teacher_earnings, public.group_join_requests to service_role;

grant select on public.chat_participants, public.chat_threads to authenticated;
grant select on public.chat_messages to authenticated;
grant insert (thread_id, sender_id, body) on public.chat_messages to authenticated;
create policy "Read own thread memberships" on public.chat_participants for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Read joined threads" on public.chat_threads for select to authenticated
  using (exists (select 1 from public.chat_participants p where p.thread_id = chat_threads.id and p.user_id = (select auth.uid())));
create policy "Read messages in joined threads" on public.chat_messages for select to authenticated
  using (exists (select 1 from public.chat_participants p where p.thread_id = chat_messages.thread_id and p.user_id = (select auth.uid())));
create policy "Send messages to joined threads" on public.chat_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and attachment_key is null and length(btrim(body)) between 1 and 2000
    and exists (select 1 from public.chat_participants p where p.thread_id = chat_messages.thread_id and p.user_id = (select auth.uid())));

create table public.session_attendance (
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null check (status in ('present','absent','late')),
  marked_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
create index session_attendance_student_id_idx on public.session_attendance (student_id);
alter table public.session_attendance enable row level security;
revoke all on public.session_attendance from public, anon, authenticated;
grant select, insert, update on public.session_attendance to service_role;
