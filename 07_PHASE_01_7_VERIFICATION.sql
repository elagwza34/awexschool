-- Read-only Phase 01.7 verification. One run returns one JSON document.
-- No schema/data writes, temporary relations, or persistent routines are used.
-- This verifies catalog contracts and invariants; it does not replace real-JWT,
-- PostgREST, concurrency, browser, or isolated Supabase runtime testing.

begin transaction read only;
set local search_path = public, pg_catalog;

do $verification$
declare
  v_checks jsonb := '[]'::jsonb;
  v_data jsonb;
  v_passed boolean;
  v_sqlstate text;
  v_message text;
  v_detail text;
  v_hint text;
  v_context text;
  expected record;
begin
  for expected in
    select * from (values
      ('environment', $q$
        select jsonb_build_object(
          'postgres_version', current_setting('server_version'),
          'postgres_major', current_setting('server_version_num')::integer / 10000,
          'executor_role', current_user,
          'database_name', current_database(),
          'transaction_read_only', current_setting('transaction_read_only'),
          'checked_at', clock_timestamp()
        ),
        current_setting('server_version_num')::integer >= 170000
          and current_setting('transaction_read_only') = 'on'
      $q$),
      ('required_tables_and_rls', $q$
        with expected(name) as (values
          ('profiles'), ('roles'), ('permissions'), ('account_roles'), ('role_permissions'),
          ('guardian_links'), ('stages'), ('grades'), ('subjects'), ('teacher_profiles'),
          ('courses'), ('course_units'), ('lessons'), ('learning_groups'), ('group_members'),
          ('group_join_requests'), ('group_payments'), ('class_sessions'), ('teacher_earnings'),
          ('teacher_applications'), ('support_requests'), ('support_replies'), ('chat_threads'),
          ('chat_participants'), ('chat_messages'), ('site_settings'), ('course_enrollments'),
          ('course_assignments'), ('course_assignment_submissions'), ('session_attendance'),
          ('session_roster_snapshots'), ('session_roster_entries'), ('session_attendance_events'),
          ('course_enrollment_review_events'), ('teacher_intake_challenges'), ('teacher_intake_rate_limits')
        )
        select jsonb_build_object(
          'expected_count', (select count(*) from expected),
          'present_count', count(c.oid),
          'rls_enabled_count', count(c.oid) filter (where c.relrowsecurity),
          'missing', coalesce(jsonb_agg(expected.name order by expected.name)
            filter (where c.oid is null), '[]'::jsonb),
          'rls_disabled', coalesce(jsonb_agg(expected.name order by expected.name)
            filter (where c.oid is not null and not c.relrowsecurity), '[]'::jsonb)
        ),
        bool_and(c.oid is not null and c.relkind = 'r' and c.relrowsecurity)
        from expected
        left join pg_namespace n on n.nspname = 'public'
        left join pg_class c on c.relnamespace = n.oid and c.relname = expected.name
      $q$),
      ('identity_columns_and_indexes', $q$
        select jsonb_build_object(
          'enrollment_student_id', exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'course_enrollments'
              and column_name = 'student_id' and data_type = 'uuid' and is_nullable = 'YES'
          ),
          'application_requester_id', exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'teacher_applications'
              and column_name = 'requester_id' and data_type = 'uuid' and is_nullable = 'YES'
          ),
          'application_email_verified_at', exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'teacher_applications'
              and column_name = 'email_verified_at' and data_type = 'timestamp with time zone'
          ),
          'active_student_course_unique_index', exists (
            select 1
            from pg_index i
            join pg_class c on c.oid = i.indrelid
            join pg_class idx on idx.oid = i.indexrelid
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relname = 'course_enrollments'
              and idx.relname = 'course_enrollments_student_course_active_idx'
              and i.indisunique and i.indimmediate and i.indisvalid
              and i.indisready and i.indislive and i.indpred is not null
              and i.indnkeyatts = 2 and i.indnatts = 2
              and (
                select array_agg(k.attnum order by k.ordinality)
                from unnest(i.indkey::smallint[]) with ordinality as k(attnum, ordinality)
              ) = array[
                (select a.attnum from pg_attribute a
                 where a.attrelid = c.oid and a.attname = 'student_id' and not a.attisdropped),
                (select a.attnum from pg_attribute a
                 where a.attrelid = c.oid and a.attname = 'course_id' and not a.attisdropped)
              ]::smallint[]
              and regexp_replace(pg_get_expr(i.indpred, i.indrelid), '[[:space:]()]', '', 'g')
                = 'student_idISNOTNULLANDstatus=''active''::text'
          ),
          'legacy_primary_key_preserved', exists (
            select 1 from pg_constraint con
            join pg_class c on c.oid = con.conrelid
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relname = 'course_enrollments'
              and con.contype = 'p'
              and pg_get_constraintdef(con.oid) = 'PRIMARY KEY (requester_id, course_id)'
          )
        ),
        jsonb_build_object(
          'enrollment_student_id', exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'course_enrollments'
              and column_name = 'student_id' and data_type = 'uuid' and is_nullable = 'YES'
          ),
          'application_requester_id', exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'teacher_applications'
              and column_name = 'requester_id' and data_type = 'uuid' and is_nullable = 'YES'
          ),
          'application_email_verified_at', exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'teacher_applications'
              and column_name = 'email_verified_at' and data_type = 'timestamp with time zone'
          ),
          'active_student_course_unique_index', exists (
            select 1
            from pg_index i
            join pg_class c on c.oid = i.indrelid
            join pg_class idx on idx.oid = i.indexrelid
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relname = 'course_enrollments'
              and idx.relname = 'course_enrollments_student_course_active_idx'
              and i.indisunique and i.indimmediate and i.indisvalid
              and i.indisready and i.indislive and i.indpred is not null
              and i.indnkeyatts = 2 and i.indnatts = 2
              and (
                select array_agg(k.attnum order by k.ordinality)
                from unnest(i.indkey::smallint[]) with ordinality as k(attnum, ordinality)
              ) = array[
                (select a.attnum from pg_attribute a
                 where a.attrelid = c.oid and a.attname = 'student_id' and not a.attisdropped),
                (select a.attnum from pg_attribute a
                 where a.attrelid = c.oid and a.attname = 'course_id' and not a.attisdropped)
              ]::smallint[]
              and regexp_replace(pg_get_expr(i.indpred, i.indrelid), '[[:space:]()]', '', 'g')
                = 'student_idISNOTNULLANDstatus=''active''::text'
          ),
          'legacy_primary_key_preserved', exists (
            select 1 from pg_constraint con
            join pg_class c on c.oid = con.conrelid
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relname = 'course_enrollments'
              and con.contype = 'p'
              and pg_get_constraintdef(con.oid) = 'PRIMARY KEY (requester_id, course_id)'
          )
        ) = jsonb_build_object(
          'enrollment_student_id', true,
          'application_requester_id', true,
          'application_email_verified_at', true,
          'active_student_course_unique_index', true,
          'legacy_primary_key_preserved', true
        )
      $q$),
      ('function_contracts', $q$
        with expected(schema_name, function_name, arguments) as (values
          ('public', 'request_course_enrollment', 'uuid, uuid'),
          ('public', 'review_course_enrollment_as_admin', 'uuid, uuid, text'),
          ('public', 'acknowledge_legacy_enrollment_as_admin', 'uuid, uuid, text'),
          ('public', 'save_learning_group', 'uuid, uuid, uuid, text, integer, bigint, integer, time without time zone, boolean, uuid[]'),
          ('public', 'complete_teacher_onboarding', 'uuid, uuid, jsonb'),
          ('public', 'submit_teacher_application', 'uuid, text, jsonb'),
          ('public', 'track_teacher_application', 'uuid'),
          ('public', 'review_teacher_application_as_admin', 'uuid, text'),
          ('public', 'reserve_group_seat', 'uuid'),
          ('public', 'approve_group_join_request_as_admin', 'uuid'),
          ('public', 'can_read_course_lessons', 'uuid'),
          ('public', 'record_session_attendance', 'uuid, uuid, text'),
          ('liveschool_internal', 'has_active_role', 'uuid, text[]'),
          ('liveschool_internal', 'has_active_course_enrollment', 'uuid, uuid'),
          ('liveschool_internal', 'can_read_course_lessons', 'uuid'),
          ('liveschool_internal', 'group_occupied_seats', 'uuid, timestamp with time zone'),
          ('liveschool_internal', 'consume_teacher_intake_limit', 'text, text, integer, interval'),
          ('liveschool_internal', 'validate_enrollment_identity', ''),
          ('liveschool_internal', 'prevent_course_archive_with_active_enrollments', ''),
          ('liveschool_internal', 'validate_group_member_enrollment', ''),
          ('liveschool_internal', 'validate_group_course_members', ''),
          ('liveschool_internal', 'prepare_group_request_write', ''),
          ('liveschool_internal', 'enforce_group_capacity', ''),
          ('liveschool_internal', 'expire_group_reservations', ''),
          ('liveschool_internal', 'enforce_enrollment_review_audit', ''),
          ('liveschool_internal', 'reject_enrollment_review_event_mutation', ''),
          ('liveschool_internal', 'protect_group_session_history', ''),
          ('liveschool_internal', 'validate_class_session', ''),
          ('liveschool_internal', 'capture_session_roster_on_insert', '')
        ), evaluated as (
          select expected.*,
            p.oid is not null
              and n.nspname = expected.schema_name
              and p.prosecdef
              and coalesce(p.proconfig, '{}'::text[]) = array['search_path=""'] as valid
          from expected
          left join pg_proc p on p.oid = to_regprocedure(format(
            '%I.%I(%s)', expected.schema_name, expected.function_name, expected.arguments
          ))::oid
          left join pg_namespace n on n.oid = p.pronamespace
        )
        select jsonb_build_object(
          'expected_count', (select count(*) from evaluated),
          'valid_count', count(*) filter (where valid),
          'missing_or_unsafe', coalesce(jsonb_agg(
            schema_name || '.' || function_name || '(' || arguments || ')'
            order by schema_name, function_name
          ) filter (where not valid), '[]'::jsonb)
        ),
        count(*) filter (where valid) = (select count(*) from evaluated)
        from evaluated
      $q$),
      ('privilege_contracts', $q$
        select jsonb_build_object(
          'authenticated_rpc_execute', jsonb_build_array(
            has_function_privilege('authenticated', 'public.request_course_enrollment(uuid,uuid)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.review_course_enrollment_as_admin(uuid,uuid,text)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.acknowledge_legacy_enrollment_as_admin(uuid,uuid,text)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.save_learning_group(uuid,uuid,uuid,text,integer,bigint,integer,time,boolean,uuid[])', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.complete_teacher_onboarding(uuid,uuid,jsonb)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.submit_teacher_application(uuid,text,jsonb)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.review_teacher_application_as_admin(uuid,text)', 'EXECUTE'),
            has_function_privilege('authenticated', 'liveschool_internal.has_active_role(uuid,text[])', 'EXECUTE'),
            has_function_privilege('authenticated', 'liveschool_internal.can_read_course_lessons(uuid)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.can_read_course_lessons(uuid)', 'EXECUTE')
          ),
          'forbidden_execute', jsonb_build_array(
            has_function_privilege('service_role', 'public.request_course_enrollment(uuid,uuid)', 'EXECUTE'),
            has_function_privilege('service_role', 'public.save_learning_group(uuid,uuid,uuid,text,integer,bigint,integer,time,boolean,uuid[])', 'EXECUTE'),
            has_function_privilege('service_role', 'public.complete_teacher_onboarding(uuid,uuid,jsonb)', 'EXECUTE'),
            has_function_privilege('service_role', 'public.submit_teacher_application(uuid,text,jsonb)', 'EXECUTE'),
            has_function_privilege('anon', 'public.reserve_group_seat(uuid)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.reserve_group_seat(uuid)', 'EXECUTE'),
            has_function_privilege('service_role', 'public.reserve_group_seat(uuid)', 'EXECUTE'),
            has_function_privilege('anon', 'public.approve_group_join_request_as_admin(uuid)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.approve_group_join_request_as_admin(uuid)', 'EXECUTE'),
            has_function_privilege('service_role', 'public.approve_group_join_request_as_admin(uuid)', 'EXECUTE'),
            has_function_privilege('anon', 'public.can_read_course_lessons(uuid)', 'EXECUTE'),
            has_function_privilege('service_role', 'public.can_read_course_lessons(uuid)', 'EXECUTE')
          ),
          'tracking_execute', jsonb_build_array(
            has_function_privilege('anon', 'public.track_teacher_application(uuid)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.track_teacher_application(uuid)', 'EXECUTE')
          ),
          'service_role_direct_writes_revoked', jsonb_build_array(
            not has_table_privilege('service_role', 'public.teacher_applications', 'INSERT'),
            not has_table_privilege('service_role', 'public.teacher_applications', 'UPDATE'),
            not has_column_privilege('service_role', 'public.teacher_applications', 'status', 'UPDATE'),
            not has_table_privilege('service_role', 'public.course_enrollments', 'INSERT')
          ),
          'lesson_select', jsonb_build_array(
            not has_table_privilege('anon', 'public.lessons', 'SELECT'),
            has_table_privilege('authenticated', 'public.lessons', 'SELECT')
          ),
          'challenge_server_access', jsonb_build_array(
            has_table_privilege('service_role', 'public.teacher_intake_challenges', 'INSERT'),
            has_table_privilege('service_role', 'public.teacher_intake_challenges', 'SELECT'),
            not has_table_privilege('anon', 'public.teacher_intake_challenges', 'SELECT'),
            not has_table_privilege('authenticated', 'public.teacher_intake_challenges', 'SELECT')
          )
        ),
        jsonb_build_object(
          'authenticated_rpc_execute', jsonb_build_array(
            has_function_privilege('authenticated', 'public.request_course_enrollment(uuid,uuid)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.review_course_enrollment_as_admin(uuid,uuid,text)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.acknowledge_legacy_enrollment_as_admin(uuid,uuid,text)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.save_learning_group(uuid,uuid,uuid,text,integer,bigint,integer,time,boolean,uuid[])', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.complete_teacher_onboarding(uuid,uuid,jsonb)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.submit_teacher_application(uuid,text,jsonb)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.review_teacher_application_as_admin(uuid,text)', 'EXECUTE'),
            has_function_privilege('authenticated', 'liveschool_internal.has_active_role(uuid,text[])', 'EXECUTE'),
            has_function_privilege('authenticated', 'liveschool_internal.can_read_course_lessons(uuid)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.can_read_course_lessons(uuid)', 'EXECUTE')
          ),
          'forbidden_execute', jsonb_build_array(
            has_function_privilege('service_role', 'public.request_course_enrollment(uuid,uuid)', 'EXECUTE'),
            has_function_privilege('service_role', 'public.save_learning_group(uuid,uuid,uuid,text,integer,bigint,integer,time,boolean,uuid[])', 'EXECUTE'),
            has_function_privilege('service_role', 'public.complete_teacher_onboarding(uuid,uuid,jsonb)', 'EXECUTE'),
            has_function_privilege('service_role', 'public.submit_teacher_application(uuid,text,jsonb)', 'EXECUTE'),
            has_function_privilege('anon', 'public.reserve_group_seat(uuid)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.reserve_group_seat(uuid)', 'EXECUTE'),
            has_function_privilege('service_role', 'public.reserve_group_seat(uuid)', 'EXECUTE'),
            has_function_privilege('anon', 'public.approve_group_join_request_as_admin(uuid)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.approve_group_join_request_as_admin(uuid)', 'EXECUTE'),
            has_function_privilege('service_role', 'public.approve_group_join_request_as_admin(uuid)', 'EXECUTE'),
            has_function_privilege('anon', 'public.can_read_course_lessons(uuid)', 'EXECUTE'),
            has_function_privilege('service_role', 'public.can_read_course_lessons(uuid)', 'EXECUTE')
          ),
          'tracking_execute', jsonb_build_array(
            has_function_privilege('anon', 'public.track_teacher_application(uuid)', 'EXECUTE'),
            has_function_privilege('authenticated', 'public.track_teacher_application(uuid)', 'EXECUTE')
          ),
          'service_role_direct_writes_revoked', jsonb_build_array(
            not has_table_privilege('service_role', 'public.teacher_applications', 'INSERT'),
            not has_table_privilege('service_role', 'public.teacher_applications', 'UPDATE'),
            not has_column_privilege('service_role', 'public.teacher_applications', 'status', 'UPDATE'),
            not has_table_privilege('service_role', 'public.course_enrollments', 'INSERT')
          ),
          'lesson_select', jsonb_build_array(
            not has_table_privilege('anon', 'public.lessons', 'SELECT'),
            has_table_privilege('authenticated', 'public.lessons', 'SELECT')
          ),
          'challenge_server_access', jsonb_build_array(
            has_table_privilege('service_role', 'public.teacher_intake_challenges', 'INSERT'),
            has_table_privilege('service_role', 'public.teacher_intake_challenges', 'SELECT'),
            not has_table_privilege('anon', 'public.teacher_intake_challenges', 'SELECT'),
            not has_table_privilege('authenticated', 'public.teacher_intake_challenges', 'SELECT')
          )
        ) = jsonb_build_object(
          'authenticated_rpc_execute', jsonb_build_array(true, true, true, true, true, true, true, true, true, true),
          'forbidden_execute', jsonb_build_array(false, false, false, false, false, false, false, false, false, false, false, false),
          'tracking_execute', jsonb_build_array(true, true),
          'service_role_direct_writes_revoked', jsonb_build_array(true, true, true, true),
          'lesson_select', jsonb_build_array(true, true),
          'challenge_server_access', jsonb_build_array(true, true, true, true)
        )
      $q$),
      ('policy_contracts', $q$
        with expected(tablename, policyname, cmd, roles, qual) as (values
          ('lessons', 'Read authorized course lessons', 'SELECT', array['authenticated'],
            'liveschool_internal.can_read_course_lessons(( SELECT u.course_id FROM course_units u WHERE (u.id = lessons.unit_id)))'),
          ('course_enrollments', 'Requesters can read their unresolved legacy enrollments', 'SELECT', array['authenticated'],
            '((student_id IS NULL) AND (requester_id = ( SELECT auth.uid() AS uid)))'),
          ('course_enrollments', 'Students can read their authoritative enrollments', 'SELECT', array['authenticated'],
            '(student_id = ( SELECT auth.uid() AS uid))'),
          ('course_enrollments', 'Guardians can read linked student enrollments', 'SELECT', array['authenticated'],
            '(EXISTS ( SELECT 1 FROM guardian_links gl WHERE ((gl.guardian_id = ( SELECT auth.uid() AS uid)) AND (gl.student_id = course_enrollments.student_id))))'),
          ('course_enrollments', 'Administrators can read course enrollments', 'SELECT', array['authenticated'],
            'liveschool_internal.has_active_role(( SELECT auth.uid() AS uid), ARRAY[''admin''::text, ''owner''::text])'),
          ('teacher_applications', 'Requesters can read their own teacher applications', 'SELECT', array['authenticated'],
            '(requester_id = ( SELECT auth.uid() AS uid))'),
          ('teacher_applications', 'Administrators can read teacher applications', 'SELECT', array['authenticated'],
            'liveschool_internal.has_active_role(( SELECT auth.uid() AS uid), ARRAY[''admin''::text, ''owner''::text])'),
          ('course_enrollment_review_events', 'Administrators can read enrollment review events', 'SELECT', array['authenticated'],
            'liveschool_internal.has_active_role(( SELECT auth.uid() AS uid), ARRAY[''admin''::text, ''owner''::text])')
        )
        select jsonb_build_object(
          'expected_count', (select count(*) from expected),
          'valid_count', count(p.policyname),
          'missing_or_incorrect', coalesce(jsonb_agg(expected.tablename || '.' || expected.policyname
            order by expected.tablename, expected.policyname)
            filter (where p.policyname is null), '[]'::jsonb)
        ),
        count(p.policyname) = (select count(*) from expected)
        from expected
        left join pg_policies p on p.schemaname = 'public'
          and p.tablename = expected.tablename and p.policyname = expected.policyname
          and p.cmd = expected.cmd and p.roles = expected.roles::name[]
          and p.permissive = 'PERMISSIVE' and p.with_check is null
          and regexp_replace(coalesce(p.qual, ''), '\s+', ' ', 'g')
            = regexp_replace(expected.qual, '\s+', ' ', 'g')
      $q$),
      ('trigger_contracts', $q$
        with expected(relation_name, trigger_name, timing, trigger_type) as (values
          ('courses', 'course_archive_enrollment_guard', 'BEFORE', 19),
          ('course_enrollments', 'enrollment_identity_guard', 'BEFORE', 23),
          ('group_members', 'group_member_enrollment_guard', 'BEFORE', 23),
          ('learning_groups', 'group_course_member_enrollment_guard', 'BEFORE', 19),
          ('group_join_requests', 'group_request_lifecycle_guard', 'BEFORE', 23),
          ('group_members', 'group_member_capacity_guard', 'AFTER', 21),
          ('group_join_requests', 'group_request_capacity_guard', 'AFTER', 21),
          ('learning_groups', 'group_capacity_change_guard', 'AFTER', 17),
          ('course_enrollment_review_events', 'enrollment_review_events_immutable', 'BEFORE', 27),
          ('course_enrollments', 'enrollment_review_audit', 'BEFORE', 23),
          ('learning_groups', 'group_session_history_guard', 'BEFORE', 19),
          ('class_sessions', 'class_session_teacher_consistency', 'BEFORE', 23),
          ('class_sessions', 'session_roster_capture', 'AFTER', 5)
        )
        select jsonb_build_object(
          'expected_count', (select count(*) from expected),
          'present_count', count(t.oid),
          'missing', coalesce(jsonb_agg(expected.relation_name || '.' || expected.trigger_name
            order by expected.relation_name, expected.trigger_name)
            filter (where t.oid is null), '[]'::jsonb)
        ),
        count(t.oid) = (select count(*) from expected)
        from expected
        left join pg_namespace n on n.nspname = 'public'
        left join pg_class c on c.relnamespace = n.oid and c.relname = expected.relation_name
        left join pg_trigger t on t.tgrelid = c.oid and t.tgname = expected.trigger_name
          and t.tgtype = expected.trigger_type and t.tgenabled = 'O' and not t.tgisinternal
      $q$),
      ('enrollment_invariants', $q$
        select jsonb_build_object(
          'total', count(*),
          'legacy_unresolved', count(*) filter (where student_id is null),
          'authoritative', count(*) filter (where student_id is not null),
          'duplicate_active_student_course', (select count(*) from (
            select student_id, course_id from public.course_enrollments
            where student_id is not null and status = 'active'
            group by student_id, course_id having count(*) > 1
          ) duplicates),
          'invalid_authoritative_identity', count(*) filter (
            where student_id is not null and not (
              (student_id = requester_id and exists (
                select 1 from public.profiles p
                join public.account_roles ar on ar.user_id = p.user_id
                where p.user_id = requester_id and p.status = 'active' and ar.role_code = 'student'
              ))
              or (student_id <> requester_id and exists (
                select 1 from public.profiles requester
                join public.account_roles requester_role on requester_role.user_id = requester.user_id
                join public.profiles student on student.user_id = course_enrollments.student_id
                join public.account_roles student_role on student_role.user_id = student.user_id
                join public.guardian_links gl on gl.guardian_id = requester.user_id and gl.student_id = student.user_id
                where requester.user_id = course_enrollments.requester_id
                  and requester.status = 'active' and requester_role.role_code = 'parent'
                  and student.status = 'active' and student_role.role_code = 'student'
              ))
            )
          ),
          'active_on_unpublished_course', count(*) filter (
            where status = 'active' and not exists (
              select 1 from public.courses c where c.id = course_id and c.status = 'published'
            )
          ),
          'reviewed_without_metadata', count(*) filter (
            where status in ('active', 'declined')
              and (reviewed_by is null or reviewed_at is null)
              and exists (
                select 1 from public.course_enrollment_review_events ev
                where ev.course_id = course_enrollments.course_id
                  and ev.requester_id = course_enrollments.requester_id and ev.event_type = 'reviewed'
              )
          )
        ),
        count(*) filter (
          where student_id is not null and not (
            (student_id = requester_id and exists (
              select 1 from public.profiles p
              join public.account_roles ar on ar.user_id = p.user_id
              where p.user_id = requester_id and p.status = 'active' and ar.role_code = 'student'
            ))
            or (student_id <> requester_id and exists (
              select 1 from public.profiles requester
              join public.account_roles requester_role on requester_role.user_id = requester.user_id
              join public.profiles student on student.user_id = course_enrollments.student_id
              join public.account_roles student_role on student_role.user_id = student.user_id
              join public.guardian_links gl on gl.guardian_id = requester.user_id and gl.student_id = student.user_id
              where requester.user_id = course_enrollments.requester_id
                and requester.status = 'active' and requester_role.role_code = 'parent'
                and student.status = 'active' and student_role.role_code = 'student'
            ))
          )
        ) = 0
        and count(*) filter (
          where status = 'active' and not exists (
            select 1 from public.courses c where c.id = course_id and c.status = 'published'
          )
        ) = 0
        and (select count(*) from (
          select student_id, course_id from public.course_enrollments
          where student_id is not null and status = 'active'
          group by student_id, course_id having count(*) > 1
        ) duplicates) = 0
        and count(*) filter (
          where status in ('active', 'declined')
            and (reviewed_by is null or reviewed_at is null)
            and exists (
              select 1 from public.course_enrollment_review_events ev
              where ev.course_id = course_enrollments.course_id
                and ev.requester_id = course_enrollments.requester_id and ev.event_type = 'reviewed'
            )
        ) = 0
        from public.course_enrollments
      $q$),
      ('group_invariants', $q$
        with occupied as (
          select g.id, g.capacity,
            (select count(*) from public.group_members gm where gm.group_id = g.id)
            + (
              select count(*) from public.group_join_requests r
              where r.group_id = g.id
                and (r.status = 'paid' or (r.status = 'reserved' and r.expires_at > clock_timestamp()))
                and not exists (
                  select 1 from public.group_members gm
                  where gm.group_id = r.group_id and gm.student_id = r.student_id
                )
            ) as occupied_seats
          from public.learning_groups g
        )
        select jsonb_build_object(
          'groups', (select count(*) from public.learning_groups),
          'over_capacity', (select count(*) from occupied where occupied_seats > capacity),
          'members_without_active_eligibility', (
            select count(*) from public.group_members gm
            join public.learning_groups g on g.id = gm.group_id
            left join public.profiles p on p.user_id = gm.student_id
            left join public.account_roles ar on ar.user_id = gm.student_id and ar.role_code = 'student'
            where p.user_id is null or p.status <> 'active' or ar.user_id is null or not exists (
              select 1 from public.course_enrollments e
              where e.course_id = g.course_id and e.status = 'active'
                and (e.student_id = gm.student_id or (e.student_id is null and e.requester_id = gm.student_id))
            )
          ),
          'paid_or_approved_without_payment', (
            select count(*) from public.group_join_requests r
            where r.status in ('paid', 'approved') and not exists (
              select 1 from public.group_payments gp
              where gp.request_id = r.id and gp.status = 'succeeded'
                and gp.amount_minor = r.fee_minor and gp.currency = 'EGP'
            )
          ),
          'approved_without_membership_or_reviewer', (
            select count(*) from public.group_join_requests r
            where r.status = 'approved' and (
              r.reviewed_by is null or r.reviewed_at is null
              or not exists (
                select 1 from public.group_members gm
                where gm.group_id = r.group_id and gm.student_id = r.student_id
              )
              or not exists (
                select 1 from public.profiles p
                join public.account_roles ar on ar.user_id = p.user_id
                where p.user_id = r.reviewed_by and p.status = 'active'
                  and ar.role_code in ('admin', 'owner')
              )
            )
          ),
          'duplicate_open_requests', (
            select count(*) from (
              select group_id, student_id from public.group_join_requests
              where status in ('reserved', 'paid')
              group by group_id, student_id having count(*) > 1
            ) duplicates
          )
        ),
        (select count(*) from occupied where occupied_seats > capacity) = 0
        and (select count(*) from public.group_members gm
          join public.learning_groups g on g.id = gm.group_id
          left join public.profiles p on p.user_id = gm.student_id
          left join public.account_roles ar on ar.user_id = gm.student_id and ar.role_code = 'student'
          where p.user_id is null or p.status <> 'active' or ar.user_id is null or not exists (
            select 1 from public.course_enrollments e
            where e.course_id = g.course_id and e.status = 'active'
              and (e.student_id = gm.student_id or (e.student_id is null and e.requester_id = gm.student_id))
          )) = 0
        and (select count(*) from public.group_join_requests r
          where r.status in ('paid', 'approved') and not exists (
            select 1 from public.group_payments gp
            where gp.request_id = r.id and gp.status = 'succeeded'
              and gp.amount_minor = r.fee_minor and gp.currency = 'EGP'
          )) = 0
        and (select count(*) from (
          select group_id, student_id from public.group_join_requests
          where status in ('reserved', 'paid')
          group by group_id, student_id having count(*) > 1
        ) duplicates) = 0
        and (select count(*) from public.group_join_requests r
          where r.status = 'approved' and (
            r.reviewed_by is null or r.reviewed_at is null
            or not exists (
              select 1 from public.group_members gm
              where gm.group_id = r.group_id and gm.student_id = r.student_id
            )
            or not exists (
              select 1 from public.profiles p
              join public.account_roles ar on ar.user_id = p.user_id
              where p.user_id = r.reviewed_by and p.status = 'active'
                and ar.role_code in ('admin', 'owner')
            )
          )) = 0
      $q$),
      ('review_and_intake_contracts', $q$
        select jsonb_build_object(
          'review_events', (select count(*) from public.course_enrollment_review_events),
          'duplicate_review_events', (select count(*) from (
            select course_id, requester_id from public.course_enrollment_review_events
            where event_type = 'reviewed'
            group by course_id, requester_id having count(*) > 1
          ) duplicates),
          'malformed_review_events', (select count(*) from public.course_enrollment_review_events
            where event_type = 'reviewed' and (previous_status is null or new_status is null)),
          'submit_challenges', (select count(*) from public.teacher_intake_challenges where purpose = 'submit'),
          'track_challenges', (select count(*) from public.teacher_intake_challenges where purpose = 'track'),
          'consumed_challenges', (select count(*) from public.teacher_intake_challenges where consumed_at is not null),
          'rate_limit_scopes', (select count(*) from public.teacher_intake_rate_limits),
          'tracking_challenge_actor_bound', exists (
            select 1 from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'track_teacher_application'
              and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_challenge uuid'
              and p.prosrc like '%challenge.actor_id is distinct from actor_id%'
          ),
          'authenticated_review_event_write', jsonb_build_array(
            has_table_privilege('authenticated', 'public.course_enrollment_review_events', 'INSERT'),
            has_table_privilege('authenticated', 'public.course_enrollment_review_events', 'UPDATE'),
            has_table_privilege('authenticated', 'public.course_enrollment_review_events', 'DELETE')
          )
        ),
        (select count(*) from (
          select course_id, requester_id from public.course_enrollment_review_events
          where event_type = 'reviewed'
          group by course_id, requester_id having count(*) > 1
        ) duplicates) = 0
        and (select count(*) from public.course_enrollment_review_events
          where event_type = 'reviewed' and (previous_status is null or new_status is null)) = 0
        and not has_table_privilege('authenticated', 'public.course_enrollment_review_events', 'INSERT')
        and not has_table_privilege('authenticated', 'public.course_enrollment_review_events', 'UPDATE')
        and not has_table_privilege('authenticated', 'public.course_enrollment_review_events', 'DELETE')
        and exists (
          select 1 from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'track_teacher_application'
            and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_challenge uuid'
            and p.prosrc like '%challenge.actor_id is distinct from actor_id%'
        )
      $q$),
      ('attendance_baseline_preserved', $q$
        select jsonb_build_object(
          'history_tables', jsonb_build_array(
            to_regclass('public.session_roster_snapshots') is not null,
            to_regclass('public.session_roster_entries') is not null,
            to_regclass('public.session_attendance_events') is not null
          ),
          'history_rls', jsonb_build_array(
            exists (select 1 from pg_class where oid = to_regclass('public.session_roster_snapshots') and relrowsecurity),
            exists (select 1 from pg_class where oid = to_regclass('public.session_roster_entries') and relrowsecurity),
            exists (select 1 from pg_class where oid = to_regclass('public.session_attendance_events') and relrowsecurity)
          ),
          'roster_capture_trigger', exists (
            select 1 from pg_trigger t
            join pg_class c on c.oid = t.tgrelid
            join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relname = 'class_sessions'
              and t.tgname = 'session_roster_capture' and t.tgenabled = 'O'
              and t.tgfoid = to_regprocedure('liveschool_internal.capture_session_roster_on_insert()')::oid
          ),
          'attendance_rows', (select count(*) from public.session_attendance),
          'roster_snapshots', (select count(*) from public.session_roster_snapshots),
          'roster_entries', (select count(*) from public.session_roster_entries),
          'attendance_events', (select count(*) from public.session_attendance_events)
        ),
        to_regclass('public.session_roster_snapshots') is not null
        and to_regclass('public.session_roster_entries') is not null
        and to_regclass('public.session_attendance_events') is not null
        and exists (select 1 from pg_class where oid = to_regclass('public.session_roster_snapshots') and relrowsecurity)
        and exists (select 1 from pg_class where oid = to_regclass('public.session_roster_entries') and relrowsecurity)
        and exists (select 1 from pg_class where oid = to_regclass('public.session_attendance_events') and relrowsecurity)
        and exists (
          select 1 from pg_trigger t
          join pg_class c on c.oid = t.tgrelid
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = 'class_sessions'
            and t.tgname = 'session_roster_capture' and t.tgenabled = 'O'
            and t.tgfoid = to_regprocedure('liveschool_internal.capture_session_roster_on_insert()')::oid
        )
      $q$),
      ('history_and_account_counts', $q$
        select jsonb_build_object(
          'migration_history_count', (select count(*) from supabase_migrations.schema_migrations),
          'latest_migration_version', (select max(version) from supabase_migrations.schema_migrations),
          'canonical_baseline_recorded', exists (
            select 1 from supabase_migrations.schema_migrations where version = '20261124010000'
          ),
          'auth_accounts', (select count(*) from auth.users),
          'baseline_record_counts', jsonb_build_object(
            'profiles', (select count(*) from public.profiles),
            'courses', (select count(*) from public.courses),
            'enrollments', (select count(*) from public.course_enrollments),
            'teacher_applications', (select count(*) from public.teacher_applications),
            'groups', (select count(*) from public.learning_groups),
            'attendance', (select count(*) from public.session_attendance)
          )
        ),
        exists (select 1 from supabase_migrations.schema_migrations where version = '20261124010000')
      $q$),
      ('catalog_fingerprints', $q$
        with columns_fingerprint as (
          select md5(coalesce(string_agg(
            table_schema || '.' || table_name || '.' || column_name || ':' || data_type || ':' || is_nullable,
            ',' order by table_schema, table_name, ordinal_position
          ), '')) as fingerprint
          from information_schema.columns
          where table_schema = 'public'
        ), policies_fingerprint as (
          select md5(coalesce(string_agg(
            schemaname || '.' || tablename || '.' || policyname || ':' || cmd || ':' || roles::text
              || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''),
            ',' order by schemaname, tablename, policyname
          ), '')) as fingerprint
          from pg_policies
          where schemaname = 'public'
        ), functions_fingerprint as (
          select md5(coalesce(string_agg(
            n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || '):'
              || pg_get_functiondef(p.oid),
            ',' order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
          ), '')) as fingerprint
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname in ('public', 'liveschool_internal')
        ), constraints_fingerprint as (
          select md5(coalesce(string_agg(
            n.nspname || '.' || c.relname || '.' || con.conname || ':' || pg_get_constraintdef(con.oid),
            ',' order by n.nspname, c.relname, con.conname
          ), '')) as fingerprint
          from pg_constraint con
          join pg_class c on c.oid = con.conrelid
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
        ), fingerprints as (
          select
            (select fingerprint from columns_fingerprint) as column_fingerprint,
            (select fingerprint from policies_fingerprint) as policy_fingerprint,
            (select fingerprint from functions_fingerprint) as function_fingerprint,
            (select fingerprint from constraints_fingerprint) as constraint_fingerprint
        )
        select jsonb_build_object(
          'column_fingerprint', column_fingerprint,
          'policy_fingerprint', policy_fingerprint,
          'function_fingerprint', function_fingerprint,
          'constraint_fingerprint', constraint_fingerprint
        ),
        length(column_fingerprint) = 32
          and length(policy_fingerprint) = 32
          and length(function_fingerprint) = 32
          and length(constraint_fingerprint) = 32
        from fingerprints
      $q$)
    ) as contract(check_id, query)
  loop
    begin
      execute expected.query into v_data, v_passed;
      v_checks := v_checks || jsonb_build_object(
        'id', expected.check_id,
        'status', case when v_passed then 'ok' else 'failed' end,
        'data', v_data,
        'error', null
      );
    exception when others then
      get stacked diagnostics
        v_sqlstate = returned_sqlstate, v_message = message_text,
        v_detail = pg_exception_detail, v_hint = pg_exception_hint,
        v_context = pg_exception_context;
      v_checks := v_checks || jsonb_build_object(
        'id', expected.check_id,
        'status', 'error',
        'data', null,
        'error', jsonb_build_object(
          'sqlstate', v_sqlstate, 'message', v_message,
          'detail', v_detail, 'hint', v_hint, 'context', v_context
        )
      );
    end;
  end loop;

  perform set_config('liveschool.phase_01_7_verification_result', jsonb_build_object(
    'schema', 'liveschool_phase_01_7_verification',
    'version', 1,
    'generated_at', clock_timestamp(),
    'strictly_read_only', current_setting('transaction_read_only') = 'on',
    'overall_status', case when exists (
      select 1 from jsonb_array_elements(v_checks) check_item
      where check_item->>'status' <> 'ok'
    ) then 'failed' else 'schema_checks_passed' end,
    'summary', jsonb_build_object(
      'total', jsonb_array_length(v_checks),
      'ok', (select count(*) from jsonb_array_elements(v_checks) check_item where check_item->>'status' = 'ok'),
      'failed', (select count(*) from jsonb_array_elements(v_checks) check_item where check_item->>'status' = 'failed'),
      'errors', (select count(*) from jsonb_array_elements(v_checks) check_item where check_item->>'status' = 'error')
    ),
    'runtime_evidence', jsonb_build_object(
      'real_jwt_rls_tested', false,
      'postgrest_tested', false,
      'concurrency_tested', false,
      'browser_tested', false,
      'manual_runtime_validation_required', true
    ),
    'checks', v_checks
  )::text, true);
end;
$verification$;

select current_setting('liveschool.phase_01_7_verification_result', true)::jsonb as result;

commit;
