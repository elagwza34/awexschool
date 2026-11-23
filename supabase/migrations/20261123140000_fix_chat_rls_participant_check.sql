-- Fix chat RLS: enforce participant membership for reading, sending, and joining.
-- This migration is forward-only and does not modify previously applied migrations.
-- It does NOT add new columns and does NOT modify existing RPC functions.
--
-- Security fixes:
-- 1. chat_messages SELECT: only participants can read messages
-- 2. chat_messages INSERT: only participants can send messages
-- 3. chat_threads SELECT: only participants can read threads (including direct chats)
-- 4. chat_participants INSERT: REVOKED from direct table access; only SECURITY DEFINER
--    RPC functions (send_direct_chat) can insert participants, preventing arbitrary
--    self-enrollment into unauthorized conversations.

-- ============================================================================
-- 1. Restore participant-based read access on chat_messages
-- ============================================================================
drop policy if exists "Read messages in joined threads" on public.chat_messages;
create policy "Read messages in joined threads"
  on public.chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_participants p
      where p.thread_id = chat_messages.thread_id
        and p.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 2. Restore participant-based insert access on chat_messages
-- ============================================================================
drop policy if exists "Send messages to joined threads" on public.chat_messages;
create policy "Send messages to joined threads"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and attachment_key is null
    and char_length(btrim(body)) between 1 and 2000
    and exists (
      select 1 from public.chat_participants p
      where p.thread_id = chat_messages.thread_id
        and p.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 3. Restore read access on chat_threads for ALL threads (direct + group)
-- ============================================================================
drop policy if exists "Read joined threads" on public.chat_threads;
create policy "Read joined threads"
  on public.chat_threads
  for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_participants p
      where p.thread_id = chat_threads.id
        and p.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 4. Restrict direct INSERT on chat_participants to prevent self-enrollment
--    SECURITY DEFINER RPC functions (send_direct_chat) bypass RLS and remain
--    authorized to insert participants during trusted conversation creation.
-- ============================================================================
drop policy if exists "Join own chat threads" on public.chat_participants;
-- No INSERT policy granted to authenticated on chat_participants directly.
-- Membership creation is only possible through SECURITY DEFINER RPC functions.
-- Revoke direct INSERT privilege so users cannot manually add themselves.
revoke insert on public.chat_participants from authenticated;

-- ============================================================================
-- 5. Preserve SELECT on chat_participants so users can view their own memberships
-- ============================================================================
-- (Already granted: grant select on public.chat_participants to authenticated)
-- Policy remains: user_id = (select auth.uid()) AND active profile