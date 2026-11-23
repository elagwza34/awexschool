-- Allow authenticated users to create chat threads
alter table public.chat_threads enable row level security;

create policy "Create chat threads"
  on public.chat_threads
  for insert
  to authenticated
  with check (group_id is null);

-- Allow authenticated users to insert their own participation
create policy "Join own chat threads"
  on public.chat_participants
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));
