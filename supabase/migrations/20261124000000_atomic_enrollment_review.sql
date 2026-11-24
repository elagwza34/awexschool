create function public.review_course_enrollment(
  p_course uuid,
  p_requester uuid,
  p_status text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  course_status text;
  enrollment public.course_enrollments%rowtype;
begin
  if p_status not in ('active', 'declined') then
    return false;
  end if;

  select status into course_status from public.courses where id = p_course for update;
  if not found then
    return false;
  end if;

  select * into enrollment from public.course_enrollments
  where course_id = p_course and requester_id = p_requester
  for update;
  if not found or enrollment.status <> 'pending' then
    return false;
  end if;

  if p_status = 'active' and course_status <> 'published' then
    return false;
  end if;

  update public.course_enrollments
  set status = p_status
  where course_id = p_course and requester_id = p_requester and status = 'pending';
  return found;
end;
$$;

revoke all on function public.review_course_enrollment(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.review_course_enrollment(uuid, uuid, text) to service_role;
