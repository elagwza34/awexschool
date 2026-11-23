drop policy if exists "Create chat threads" on public.chat_threads;
drop policy if exists "Join own chat threads" on public.chat_participants;

-- Keep the existing group rules. Direct messages are accessed through the
-- contact-scoped functions below, which recheck current roles and enrollment.
alter policy "Read joined threads" on public.chat_threads
  using (group_id is not null and exists (
    select 1 from public.chat_participants p
    where p.thread_id = chat_threads.id and p.user_id = (select auth.uid())
  ));
alter policy "Read messages in joined threads" on public.chat_messages
  using (exists (select 1 from public.chat_threads t where t.id = chat_messages.thread_id));
alter policy "Send messages to joined threads" on public.chat_messages
  with check (
    sender_id = (select auth.uid())
    and attachment_key is null
    and char_length(btrim(body)) between 1 and 2000
    and exists (select 1 from public.chat_threads t where t.id = chat_messages.thread_id)
  );

create table liveschool_internal.direct_chat_threads (
  member_id uuid not null references public.profiles(user_id) on delete cascade,
  -- Administration uses the member's own ID as the second key.
  peer_id uuid not null references public.profiles(user_id) on delete cascade,
  thread_id uuid primary key references public.chat_threads(id) on delete cascade,
  is_primary boolean not null default false
);
create index direct_chat_contact_idx on liveschool_internal.direct_chat_threads (member_id, peer_id);
create unique index direct_chat_primary_idx on liveschool_internal.direct_chat_threads (member_id, peer_id)
  where is_primary;

alter table public.chat_messages add column attachment_name text;
create unique index direct_chat_attachment_idx on public.chat_messages (attachment_key)
  where attachment_name is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-attachments', 'chat-attachments', false, 15728640, array[
  'application/octet-stream', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/wav', 'audio/x-wav'
]);

-- The previous direct-chat flow created administration pairs. Keep their
-- history attached to the non-administration account across role changes.
with legacy_pairs as (
  select t.id, array_agg(p.user_id order by p.user_id) as users
  from public.chat_threads t
  join public.chat_participants p on p.thread_id = t.id
  where t.group_id is null
  group by t.id
  having count(*) = 2
), legacy_roles as (
  select pairs.id, participant.user_id, bool_or(r.role_code in ('admin', 'owner')) as is_admin
  from legacy_pairs pairs
  cross join lateral unnest(pairs.users) as participant(user_id)
  join public.account_roles r on r.user_id = participant.user_id
  group by pairs.id, participant.user_id
)
insert into liveschool_internal.direct_chat_threads (member_id, peer_id, thread_id)
select member.user_id, member.user_id, member.id
from legacy_roles member
join legacy_roles staff on staff.id = member.id and staff.user_id <> member.user_id
where not member.is_admin and staff.is_admin;

create function liveschool_internal.direct_chat_contacts(p_role text, p_admin boolean)
returns table (
  id uuid, name text, role text, description text, course_labels text,
  course_ids uuid[], member_id uuid, peer_id uuid
)
language sql stable
set search_path = ''
as $$
  with active_roles as (
    select p.user_id, p.display_name, r.role_code
    from public.profiles p join public.account_roles r using (user_id)
    where p.status = 'active'
      and (r.role_code = 'owner' or not exists (
        select 1 from public.account_roles owner_role
        where owner_role.user_id = p.user_id and owner_role.role_code = 'owner'
      ))
  ), actor as (
    select a.user_id
    from active_roles a
    where a.user_id = (select auth.uid())
      and (a.role_code = p_role or (p_role = 'admin' and a.role_code = 'owner'))
  ), links as (
    select c.id, c.subject_id, c.grade_id, e.requester_id as student_id, c.teacher_id
    from public.course_enrollments e join public.courses c on c.id = e.course_id
    where e.status = 'active' and c.teacher_id is not null
    union
    select c.id, c.subject_id, c.grade_id, m.student_id, g.teacher_id
    from public.group_members m
    join public.learning_groups g on g.id = m.group_id
    join public.courses c on c.id = g.course_id
    where g.active
  )
  (
    select distinct on (target.user_id)
      target.user_id, target.display_name, target.role_code,
      case target.role_code when 'student' then 'طالب' when 'teacher' then 'مدرس' else 'ولي أمر' end,
      '', array[]::uuid[], target.user_id, target.user_id
    from actor cross join active_roles target
    where p_admin and p_role = 'admin' and target.user_id <> actor.user_id
      and target.role_code in ('student', 'teacher', 'parent')
    order by target.user_id, target.role_code
  )
  union all
  select actor.user_id, 'الإدارة', 'admin', 'إدارة المنصة', '',
    array[]::uuid[], actor.user_id, actor.user_id
  from actor
  where p_admin and p_role in ('student', 'teacher', 'parent')
    and exists (select 1 from active_roles a where a.role_code in ('admin', 'owner') and a.user_id <> actor.user_id)
  union all
  select target.user_id, target.display_name, target.role_code,
    case when p_role = 'teacher' then string_agg(distinct grade.name, '، ' order by grade.name)
         else string_agg(distinct subject.name, '، ' order by subject.name) end,
    string_agg(distinct subject.name, '، ' order by subject.name),
    array_agg(distinct l.id order by l.id), l.student_id, l.teacher_id
  from actor
  join links l on (p_role = 'student' and l.student_id = actor.user_id)
               or (p_role = 'teacher' and l.teacher_id = actor.user_id)
  join active_roles target on (p_role = 'student' and target.user_id = l.teacher_id and target.role_code = 'teacher')
                          or (p_role = 'teacher' and target.user_id = l.student_id and target.role_code = 'student')
  join public.subjects subject on subject.id = l.subject_id
  join public.grades grade on grade.id = l.grade_id
  where not p_admin and l.student_id <> l.teacher_id
  group by target.user_id, target.display_name, target.role_code, l.student_id, l.teacher_id;
$$;

create function liveschool_internal.direct_chat_thread_ids(p_member uuid, p_peer uuid)
returns setof uuid
language sql stable
set search_path = ''
as $$
  select d.thread_id from liveschool_internal.direct_chat_threads d
  where d.member_id = p_member and d.peer_id = p_peer
;
$$;

create function liveschool_internal.can_access_chat_attachment(p_key text, p_pending_only boolean)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  with message_thread as (
    select d.member_id, d.peer_id
    from public.chat_messages m
    join liveschool_internal.direct_chat_threads d on d.thread_id = m.thread_id
    where m.attachment_key = p_key and m.attachment_name is not null
  )
  select exists (
    select 1 from public.profiles where user_id = (select auth.uid()) and status = 'active'
  ) and (
    (split_part(p_key, '/', 1) = (select auth.uid())::text and not exists (select 1 from message_thread))
    or (not p_pending_only and exists (
      select 1 from message_thread m
      cross join (values ('student', false), ('teacher', false), ('student', true),
        ('teacher', true), ('parent', true), ('admin', true)) as scope(role, administration)
      cross join lateral liveschool_internal.direct_chat_contacts(scope.role, scope.administration) c
      where c.member_id = m.member_id and c.peer_id = m.peer_id
    ))
  );
$$;

revoke all on function liveschool_internal.can_access_chat_attachment(text, boolean) from public, anon, authenticated;
grant execute on function liveschool_internal.can_access_chat_attachment(text, boolean) to authenticated;

create policy "Upload own chat attachment" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'chat-attachments'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}$'
    and liveschool_internal.can_access_chat_attachment(name, true)
  );
create policy "Read chat attachment" on storage.objects
  for select to authenticated using (
    bucket_id = 'chat-attachments' and liveschool_internal.can_access_chat_attachment(name, false)
  );
create policy "Remove pending chat attachment" on storage.objects
  for delete to authenticated using (
    bucket_id = 'chat-attachments' and liveschool_internal.can_access_chat_attachment(name, true)
  );

create function liveschool_internal.read_direct_chat(p_role text, p_admin boolean, p_contact uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  with contacts as materialized (
    select c.*, latest.body as latest
    from liveschool_internal.direct_chat_contacts(p_role, p_admin) c
    left join lateral (
      select coalesce(nullif(m.body, ''), m.attachment_name) as body
      from liveschool_internal.direct_chat_thread_ids(c.member_id, c.peer_id) as t(id)
      join public.chat_messages m on m.thread_id = t.id
      order by m.created_at desc, m.id desc limit 1
    ) latest on true
  ), selected as (
    select c.* from contacts c
    where p_contact is null or p_contact = c.id
    order by c.name, c.id limit 1
  ), messages as (
    select m.id, m.body, m.created_at, m.sender_id = (select auth.uid()) as mine,
      p_admin and m.sender_id <> c.member_id as from_admin,
      case when object.id is not null then jsonb_build_object(
        'key', m.attachment_key, 'name', m.attachment_name, 'type', object.metadata->>'mimetype'
      ) end as attachment
    from selected c
    cross join lateral liveschool_internal.direct_chat_thread_ids(c.member_id, c.peer_id) as t(id)
    join public.chat_messages m on m.thread_id = t.id
    left join storage.objects object
      on object.bucket_id = 'chat-attachments' and object.name = m.attachment_key and m.attachment_name is not null
    order by m.created_at desc, m.id desc limit 100
  )
  select jsonb_build_object(
    'contacts', coalesce((select jsonb_agg(to_jsonb(c) - 'member_id' - 'peer_id' order by c.name, c.id) from contacts c), '[]'::jsonb),
    'selectedId', (select id from selected),
    'messages', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at, m.id) from messages m), '[]'::jsonb)
  );
$$;

create function liveschool_internal.send_direct_chat(
  p_role text, p_admin boolean, p_contact uuid, p_body text, p_key text, p_filename text
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  contact record;
  target_thread uuid;
  body text := btrim(p_body, E' \t\r\n');
begin
  if body is null or char_length(body) > 2000 or (body = '' and p_key is null) then
    raise exception 'Invalid message' using errcode = '22023';
  end if;

  select * into contact from liveschool_internal.direct_chat_contacts(p_role, p_admin) c where c.id = p_contact;
  if not found then
    raise exception 'Chat contact unavailable' using errcode = '42501';
  end if;

  if p_key is not null and (
    coalesce(char_length(btrim(p_filename)), 0) not between 1 and 255
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'chat-attachments' and name = p_key
        and split_part(name, '/', 1) = auth.uid()::text and owner_id = auth.uid()::text
    )
  ) then
    raise exception 'Invalid attachment' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(contact.member_id::text || ':' || contact.peer_id::text, 0));
  select d.thread_id into target_thread from liveschool_internal.direct_chat_threads d
  where d.member_id = contact.member_id and d.peer_id = contact.peer_id and d.is_primary;

  if target_thread is null then
    select t.id into target_thread
    from liveschool_internal.direct_chat_thread_ids(contact.member_id, contact.peer_id) as legacy(id)
    join public.chat_threads t on t.id = legacy.id
    order by t.created_at, t.id limit 1;

    if target_thread is null then
      insert into public.chat_threads default values returning id into target_thread;
      insert into liveschool_internal.direct_chat_threads (member_id, peer_id, thread_id, is_primary)
      values (contact.member_id, contact.peer_id, target_thread, true);
    else
      update liveschool_internal.direct_chat_threads set is_primary = true where thread_id = target_thread;
    end if;
  end if;

  insert into public.chat_messages (thread_id, sender_id, body, attachment_key, attachment_name)
  values (target_thread, auth.uid(), body, p_key, case when p_key is not null then btrim(p_filename) end);
end;
$$;

revoke all on function liveschool_internal.direct_chat_contacts(text, boolean),
  liveschool_internal.direct_chat_thread_ids(uuid, uuid),
  liveschool_internal.read_direct_chat(text, boolean, uuid),
  liveschool_internal.send_direct_chat(text, boolean, uuid, text, text, text) from public, anon, authenticated;
grant usage on schema liveschool_internal to authenticated;
grant execute on function liveschool_internal.read_direct_chat(text, boolean, uuid),
  liveschool_internal.send_direct_chat(text, boolean, uuid, text, text, text) to authenticated;

create function public.read_direct_chat(p_role text, p_admin boolean, p_contact uuid)
returns jsonb language sql stable set search_path = ''
as $$ select liveschool_internal.read_direct_chat(p_role, p_admin, p_contact); $$;

create function public.send_direct_chat(
  p_role text, p_admin boolean, p_contact uuid, p_body text, p_key text default null, p_filename text default null
)
returns void language sql set search_path = ''
as $$ select liveschool_internal.send_direct_chat(p_role, p_admin, p_contact, p_body, p_key, p_filename); $$;

revoke all on function public.read_direct_chat(text, boolean, uuid),
  public.send_direct_chat(text, boolean, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.read_direct_chat(text, boolean, uuid),
  public.send_direct_chat(text, boolean, uuid, text, text, text) to authenticated;
