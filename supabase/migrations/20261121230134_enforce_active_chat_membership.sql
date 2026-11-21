alter policy "Read own thread memberships" on public.chat_participants
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid()) and p.status = 'active'
    )
  );
