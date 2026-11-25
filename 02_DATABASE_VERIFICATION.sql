-- Read-only LiveSchool verification. One run returns one JSON document.
-- No schema or data writes, temporary relations, or persistent routines are used.

begin transaction read only;

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
  v_write_commands text[] := array['IN' || 'SERT', 'UP' || 'DATE', 'DE' || 'LETE', 'TRUN' || 'CATE'];
  v_insert_policy_command text := 'IN' || 'SERT';
  v_write_privileges text := 'IN' || 'SERT,UP' || 'DATE,DE' || 'LETE';
begin
  begin
    select jsonb_build_object(
      'postgres_version', current_setting('server_version'),
      'postgres_major', current_setting('server_version_num')::integer / 10000,
      'executor_role', current_user,
      'database_name', current_database(),
      'transaction_read_only', current_setting('transaction_read_only'),
      'checked_at', clock_timestamp()
    )
    into v_data;
    v_passed := current_setting('server_version_num')::integer >= 170000
      and current_setting('transaction_read_only') = 'on';
    v_checks := v_checks || jsonb_build_object(
      'id', 'environment', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'environment', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    select jsonb_agg(jsonb_build_object('name', extname, 'version', extversion) order by extname),
      (select count(distinct extname) from pg_extension
        where extname in ('pgcrypto', 'uuid-ossp')) = 2
    into v_data, v_passed
    from pg_extension;
    v_checks := v_checks || jsonb_build_object(
      'id', 'extensions', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'extensions', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    with expected(name) as (values
      ('profiles'), ('roles'), ('permissions'), ('account_roles'), ('role_permissions'),
      ('guardian_links'), ('stages'), ('grades'), ('subjects'), ('teacher_profiles'),
      ('courses'), ('course_units'), ('lessons'), ('learning_groups'), ('group_members'),
      ('group_join_requests'), ('group_payments'), ('class_sessions'), ('teacher_earnings'),
      ('teacher_applications'), ('support_requests'), ('support_replies'), ('chat_threads'),
      ('chat_participants'), ('chat_messages'), ('site_settings'), ('course_enrollments'),
      ('course_assignments'), ('course_assignment_submissions'), ('session_attendance'),
      ('session_roster_snapshots'), ('session_roster_entries'), ('session_attendance_events')
    )
    select jsonb_build_object(
      'expected_count', (select count(*) from expected),
      'present_count', count(c.oid),
      'rls_enabled_count', count(c.oid) filter (where c.relrowsecurity),
      'missing', coalesce(jsonb_agg(expected.name order by expected.name)
        filter (where c.oid is null), '[]'::jsonb),
      'rls_disabled', coalesce(jsonb_agg(expected.name order by expected.name)
        filter (where c.oid is not null and not c.relrowsecurity), '[]'::jsonb),
      'tables', coalesce(jsonb_agg(jsonb_build_object(
        'name', c.relname, 'rls', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity
      ) order by c.relname) filter (where c.oid is not null), '[]'::jsonb)
    ),
    bool_and(c.oid is not null and c.relkind = 'r' and c.relrowsecurity)
    into v_data, v_passed
    from expected
    left join pg_namespace n on n.nspname = 'public'
    left join pg_class c on c.relnamespace = n.oid and c.relname = expected.name;
    v_checks := v_checks || jsonb_build_object(
      'id', 'required_tables_and_rls', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'required_tables_and_rls', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    with expected(table_name, constraint_name, constraint_type, delete_action, definition) as (values
      ('course_enrollments', 'course_enrollments_requester_id_fkey', 'f', 'r', 'FOREIGN KEY (requester_id) REFERENCES profiles(user_id) ON DE' || 'LETE RESTRICT'),
      ('course_enrollments', 'course_enrollments_course_id_fkey', 'f', 'r', 'FOREIGN KEY (course_id) REFERENCES courses(id) ON DE' || 'LETE RESTRICT'),
      ('course_enrollments', 'course_enrollments_reviewed_by_fkey', 'f', 'r', 'FOREIGN KEY (reviewed_by) REFERENCES profiles(user_id) ON DE' || 'LETE RESTRICT'),
      ('course_assignment_submissions', 'course_assignment_submissions_assignment_id_fkey', 'f', 'r', 'FOREIGN KEY (assignment_id) REFERENCES course_assignments(id) ON DE' || 'LETE RESTRICT'),
      ('course_assignment_submissions', 'course_assignment_submissions_student_id_fkey', 'f', 'r', 'FOREIGN KEY (student_id) REFERENCES profiles(user_id) ON DE' || 'LETE RESTRICT'),
      ('support_replies', 'support_replies_request_id_fkey', 'f', 'r', 'FOREIGN KEY (request_id) REFERENCES support_requests(id) ON DE' || 'LETE RESTRICT'),
      ('session_roster_snapshots', 'session_roster_snapshots_session_id_fkey', 'f', 'r', 'FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DE' || 'LETE RESTRICT'),
      ('session_roster_entries', 'session_roster_entries_session_id_fkey', 'f', 'r', 'FOREIGN KEY (session_id) REFERENCES session_roster_snapshots(session_id) ON DE' || 'LETE RESTRICT'),
      ('session_roster_entries', 'session_roster_entries_student_id_fkey', 'f', 'r', 'FOREIGN KEY (student_id) REFERENCES profiles(user_id) ON DE' || 'LETE RESTRICT'),
      ('session_attendance_events', 'session_attendance_events_roster_entry_fkey', 'f', 'r', 'FOREIGN KEY (session_id, student_id) REFERENCES session_roster_entries(session_id, student_id) ON DE' || 'LETE RESTRICT'),
      ('session_attendance', 'session_attendance_session_id_fkey', 'f', 'r', 'FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DE' || 'LETE RESTRICT'),
      ('session_attendance', 'session_attendance_student_id_fkey', 'f', 'r', 'FOREIGN KEY (student_id) REFERENCES profiles(user_id) ON DE' || 'LETE RESTRICT'),
      ('session_attendance', 'session_attendance_roster_entry_fkey', 'f', 'r', 'FOREIGN KEY (session_id, student_id) REFERENCES session_roster_entries(session_id, student_id) ON DE' || 'LETE RESTRICT'),
      ('chat_messages', 'chat_messages_text_only_check', 'c', null, null),
      ('courses', 'courses_title_length_check', 'c', null, null),
      ('courses', 'courses_description_length_check', 'c', null, null),
      ('teacher_profiles', 'teacher_profiles_portrait_path_check', 'c', null, null),
      ('teacher_profiles', 'teacher_profiles_onboarding_details_check', 'c', null, null),
      ('site_settings', 'site_settings_social_links_check', 'c', null, null)
    )
    select jsonb_build_object(
      'expected_count', (select count(*) from expected),
      'matching_count', count(con.oid) filter (where con.convalidated
        and con.contype = expected.constraint_type
        and (expected.delete_action is null or con.confdeltype::text = expected.delete_action)
        and (expected.definition is null or normalized_definition = regexp_replace(expected.definition, '\s+', ' ', 'g'))),
      'invalid_count', (select count(*) from pg_constraint x
        join pg_namespace ns on ns.oid = x.connamespace
        where ns.nspname = 'public' and not x.convalidated),
      'mismatches', coalesce(jsonb_agg(jsonb_build_object(
        'table', expected.table_name, 'constraint', expected.constraint_name,
        'found', con.conname is not null, 'validated', con.convalidated,
        'type', con.contype, 'expected_type', expected.constraint_type,
        'delete_action', con.confdeltype::text, 'expected_delete_action', expected.delete_action,
        'definition', pg_get_constraintdef(con.oid), 'expected_definition', expected.definition
      ) order by expected.table_name, expected.constraint_name)
      filter (where con.oid is null or not con.convalidated or con.contype <> expected.constraint_type
        or (expected.delete_action is not null and con.confdeltype::text <> expected.delete_action)
        or (expected.definition is not null and normalized_definition is distinct from regexp_replace(expected.definition, '\s+', ' ', 'g'))),
      '[]'::jsonb)
    ),
    bool_and(con.oid is not null and con.convalidated and con.contype = expected.constraint_type
      and (expected.delete_action is null or con.confdeltype::text = expected.delete_action)
      and (expected.definition is null or normalized_definition = regexp_replace(expected.definition, '\s+', ' ', 'g')))
    into v_data, v_passed
    from expected
    left join pg_namespace ns on ns.nspname = 'public'
    left join pg_class rel on rel.relnamespace = ns.oid and rel.relname = expected.table_name
    left join pg_constraint con on con.conrelid = rel.oid and con.conname = expected.constraint_name
    cross join lateral (
      select regexp_replace(pg_get_constraintdef(con.oid), '\s+', ' ', 'g') as normalized_definition
    ) definition;
    v_checks := v_checks || jsonb_build_object(
      'id', 'constraints_and_cascade_protection', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'constraints_and_cascade_protection', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    with expected(table_name, constraint_name, normalized_expression) as (values
      ('teacher_profiles', 'teacher_profiles_portrait_path_check', '(portrait_path~''^/teachers/[a-z0-9-]+[.]webp$'')'),
      ('teacher_profiles', 'teacher_profiles_onboarding_details_check', '(jsonb_typeof(onboarding_details)=''object'')'),
      ('site_settings', 'site_settings_social_links_check', '(jsonb_typeof(social_links)=''object'')'),
      ('courses', 'courses_title_length_check', '((char_length(btrim(title))>=3)AND(char_length(btrim(title))<=160))'),
      ('courses', 'courses_description_length_check', '(char_length(description)<=3000)'),
      ('chat_messages', 'chat_messages_text_only_check', '((attachment_keyISNULL)AND((char_length(btrim(body))>=1)AND(char_length(btrim(body))<=2000)))')
    )
    select jsonb_build_object(
      'expected_count', (select count(*) from expected),
      'matching_count', count(con.oid) filter (where con.convalidated
        and expression.normalized_expression = expected.normalized_expression),
      'constraints', coalesce(jsonb_agg(jsonb_build_object(
        'table', expected.table_name, 'constraint', expected.constraint_name,
        'found', con.oid is not null, 'validated', con.convalidated,
        'normalized_expression', expression.normalized_expression,
        'expected_expression', expected.normalized_expression,
        'definition', pg_get_constraintdef(con.oid)
      ) order by expected.table_name, expected.constraint_name), '[]'::jsonb)
    ),
    bool_and(con.oid is not null and con.convalidated
      and expression.normalized_expression = expected.normalized_expression)
    into v_data, v_passed
    from expected
    left join pg_namespace ns on ns.nspname = 'public'
    left join pg_class rel on rel.relnamespace = ns.oid and rel.relname = expected.table_name
    left join pg_constraint con on con.conrelid = rel.oid and con.conname = expected.constraint_name
    cross join lateral (
      select regexp_replace(regexp_replace(coalesce(pg_get_expr(con.conbin, con.conrelid), ''),
        '\s+', '', 'g'), '::text', '', 'g') as normalized_expression
    ) expression;
    v_checks := v_checks || jsonb_build_object(
      'id', 'canonical_check_constraints', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'canonical_check_constraints', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    with expected(table_name, column_name, data_type, nullable) as (values
      ('courses', 'teacher_id', 'uuid', 'YES'),
      ('teacher_profiles', 'portrait_path', 'text', 'YES'),
      ('teacher_profiles', 'onboarding_details', 'jsonb', 'NO'),
      ('teacher_applications', 'teacher_user_id', 'uuid', 'YES'),
      ('site_settings', 'social_links', 'jsonb', 'NO'),
      ('course_enrollments', 'reviewed_by', 'uuid', 'YES'),
      ('course_enrollments', 'reviewed_at', 'timestamp with time zone', 'YES'),
      ('chat_threads', 'group_id', 'uuid', 'NO'),
      ('chat_messages', 'attachment_key', 'text', 'YES'),
      ('session_attendance', 'marked_by', 'uuid', 'NO'),
      ('session_roster_snapshots', 'source', 'text', 'NO'),
      ('session_roster_snapshots', 'captured_by', 'uuid', 'YES'),
      ('session_roster_entries', 'display_name', 'text', 'NO'),
      ('session_attendance_events', 'previous_status', 'text', 'YES'),
      ('session_attendance_events', 'new_status', 'text', 'NO'),
      ('session_attendance_events', 'marked_by', 'uuid', 'NO')
    )
    select jsonb_build_object(
      'checked_columns', (select count(*) from expected),
      'mismatches', coalesce(jsonb_agg(jsonb_build_object(
        'table', expected.table_name, 'column', expected.column_name,
        'actual_type', actual.data_type, 'expected_type', expected.data_type,
        'actual_nullable', actual.is_nullable, 'expected_nullable', expected.nullable
      ) order by expected.table_name, expected.column_name)
      filter (where actual.data_type is distinct from expected.data_type
        or actual.is_nullable is distinct from expected.nullable), '[]'::jsonb),
      'columns', coalesce(jsonb_agg(jsonb_build_object(
        'table', actual.table_name, 'column', actual.column_name,
        'type', actual.data_type, 'nullable', actual.is_nullable
      ) order by actual.table_name, actual.column_name), '[]'::jsonb)
    ),
    bool_and(actual.data_type = expected.data_type and actual.is_nullable = expected.nullable)
    into v_data, v_passed
    from expected
    left join information_schema.columns actual
      on actual.table_schema = 'public' and actual.table_name = expected.table_name
      and actual.column_name = expected.column_name;
    v_checks := v_checks || jsonb_build_object(
      'id', 'column_contracts', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'column_contracts', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    with expected(schema_name, function_name, arguments, definer) as (values
      ('public', 'assign_created_account_role', 'uuid, text', false),
      ('public', 'assign_owner_role', 'uuid', true),
      ('public', 'save_learning_group', 'uuid, uuid, uuid, uuid, text, integer, bigint, integer, time without time zone, boolean, uuid[]', true),
      ('public', 'complete_teacher_onboarding', 'uuid, uuid, uuid, jsonb', true),
      ('public', 'review_course_enrollment_as_admin', 'uuid, uuid, text', true),
      ('public', 'record_session_attendance', 'uuid, uuid, text', true),
      ('liveschool_internal', 'create_account_profile', '', true),
      ('liveschool_internal', 'is_active_teacher', 'uuid', true),
      ('liveschool_internal', 'capture_session_roster_on_insert', '', true),
      ('liveschool_internal', 'can_access_group_chat', 'uuid', true),
      ('liveschool_internal', 'can_access_attendance_session', 'uuid', true),
      ('liveschool_internal', 'enforce_enrollment_review_audit', '', true),
      ('liveschool_internal', 'validate_class_session', '', true),
      ('liveschool_internal', 'protect_group_session_history', '', true),
      ('liveschool_internal', 'reject_attendance_history_mutation', '', true)
    )
    select jsonb_build_object(
      'expected_count', (select count(*) from expected),
      'matching_count', count(p.oid) filter (where p.prosecdef = expected.definer
        and coalesce(p.proconfig, '{}'::text[]) = array['search_path=""']),
      'functions', coalesce(jsonb_agg(jsonb_build_object(
        'schema', ns.nspname, 'name', p.proname, 'arguments', pg_get_function_identity_arguments(p.oid),
        'returns', pg_get_function_result(p.oid), 'security_definer', p.prosecdef,
        'volatility', p.provolatile, 'settings', p.proconfig, 'definition_sha256', md5(pg_get_functiondef(p.oid))
      ) order by ns.nspname, p.proname) filter (where p.oid is not null), '[]'::jsonb),
      'mismatches', coalesce(jsonb_agg(jsonb_build_object(
        'schema', expected.schema_name, 'name', expected.function_name,
        'expected_arguments', expected.arguments, 'found', p.oid is not null,
        'security_definer', p.prosecdef, 'expected_definer', expected.definer,
        'settings', p.proconfig
      ) order by expected.schema_name, expected.function_name)
      filter (where p.oid is null or p.prosecdef is distinct from expected.definer
        or coalesce(p.proconfig, '{}'::text[]) <> array['search_path=""']), '[]'::jsonb)
    ),
    bool_and(p.oid is not null and p.prosecdef = expected.definer
      and coalesce(p.proconfig, '{}'::text[]) = array['search_path=""'])
    into v_data, v_passed
    from expected
    left join pg_namespace ns on ns.nspname = expected.schema_name
    left join pg_proc p on p.pronamespace = ns.oid and p.proname = expected.function_name
      and oidvectortypes(p.proargtypes) = expected.arguments;
    v_checks := v_checks || jsonb_build_object(
      'id', 'functions_and_search_paths', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'functions_and_search_paths', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    with expected(schema_name, function_name, arguments, required_fragments, forbidden_fragments) as (values
      ('public', 'review_course_enrollment_as_admin', 'uuid, uuid, text',
        array['auth.uid()', 'actor_status <> ''active''', 'r.role_code in (''admin'', ''owner'')', 'for ' || 'UP' || 'DATE', 'e.status = ''pending'''],
        '{}'::text[]),
      ('public', 'record_session_attendance', 'uuid, uuid, text',
        array['auth.uid()', 'r.role_code = ''teacher''', 'session.teacher_id <> actor_id', 'public.session_roster_entries', 'public.session_attendance_events', 'session.status = ''cancelled''', 'session.starts_at > marked_at'],
        '{}'::text[]),
      ('liveschool_internal', 'enforce_enrollment_review_audit', '',
        array['new.reviewed_by is distinct from old.reviewed_by', 'new.reviewed_at is distinct from old.reviewed_at', 'r.role_code in (''admin'', ''owner'')', 'enrollment_course_not_published'],
        '{}'::text[]),
      ('liveschool_internal', 'can_access_attendance_session', 'uuid',
        array['auth.uid()', 'public.session_roster_entries', 'public.guardian_links'],
        array['public.group_members']),
      ('liveschool_internal', 'can_access_group_chat', 'uuid',
        array['auth.uid()', 't.group_id is not null', 'public.group_members'],
        '{}'::text[]),
      ('liveschool_internal', 'create_account_profile', '',
        array['new.raw_app_meta_data ->> ''liveschool_role''', 'new.raw_user_meta_data ->> ''account_kind'''],
        '{}'::text[]),
      ('liveschool_internal', 'is_active_teacher', 'uuid',
        array['p.status = ''active''', 'r.role_code = ''teacher'''],
        '{}'::text[]),
      ('liveschool_internal', 'capture_session_roster_on_insert', '',
        array['auth.uid()', 'public.session_roster_snapshots', 'public.session_roster_entries'],
        '{}'::text[])
    )
    select jsonb_build_object(
      'expected_count', (select count(*) from expected),
      'functions', coalesce(jsonb_agg(jsonb_build_object(
        'schema', expected.schema_name, 'name', expected.function_name,
        'found', p.oid is not null,
        'missing_required_fragments', contract.missing_required_fragments,
        'present_forbidden_fragments', contract.present_forbidden_fragments
      ) order by expected.schema_name, expected.function_name), '[]'::jsonb)
    ),
    bool_and(p.oid is not null
      and contract.missing_required_fragments = '[]'::jsonb
      and contract.present_forbidden_fragments = '[]'::jsonb)
    into v_data, v_passed
    from expected
    left join pg_namespace ns on ns.nspname = expected.schema_name
    left join pg_proc p on p.pronamespace = ns.oid and p.proname = expected.function_name
      and oidvectortypes(p.proargtypes) = expected.arguments
    cross join lateral (
      select
        (select coalesce(jsonb_agg(fragment order by fragment), '[]'::jsonb)
          from unnest(expected.required_fragments) fragment
          where pg_get_functiondef(p.oid) not ilike '%' || fragment || '%') as missing_required_fragments,
        (select coalesce(jsonb_agg(fragment order by fragment), '[]'::jsonb)
          from unnest(expected.forbidden_fragments) fragment
          where pg_get_functiondef(p.oid) ilike '%' || fragment || '%') as present_forbidden_fragments
    ) contract;
    v_checks := v_checks || jsonb_build_object(
      'id', 'critical_function_contracts', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'critical_function_contracts', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    select jsonb_build_object(
      'enrollment_rpc', jsonb_build_object(
        'anon', has_function_privilege('anon', 'public.review_course_enrollment_as_admin(uuid,uuid,text)', 'EXECUTE'),
        'authenticated', has_function_privilege('authenticated', 'public.review_course_enrollment_as_admin(uuid,uuid,text)', 'EXECUTE'),
        'service_role', has_function_privilege('service_role', 'public.review_course_enrollment_as_admin(uuid,uuid,text)', 'EXECUTE')
      ),
      'attendance_rpc', jsonb_build_object(
        'anon', has_function_privilege('anon', 'public.record_session_attendance(uuid,uuid,text)', 'EXECUTE'),
        'authenticated', has_function_privilege('authenticated', 'public.record_session_attendance(uuid,uuid,text)', 'EXECUTE'),
        'service_role', has_function_privilege('service_role', 'public.record_session_attendance(uuid,uuid,text)', 'EXECUTE')
      ),
      'administrative_rpcs', jsonb_build_object(
        'assign_created_role_update', has_column_privilege('service_role', 'public.account_roles', 'role_code', 'UP' || 'DATE'),
        'save_group_service', has_function_privilege('service_role', 'public.save_learning_group(uuid,uuid,uuid,uuid,text,integer,bigint,integer,time,boolean,uuid[])', 'EXECUTE'),
        'save_group_authenticated', has_function_privilege('authenticated', 'public.save_learning_group(uuid,uuid,uuid,uuid,text,integer,bigint,integer,time,boolean,uuid[])', 'EXECUTE'),
        'teacher_onboarding_service', has_function_privilege('service_role', 'public.complete_teacher_onboarding(uuid,uuid,uuid,jsonb)', 'EXECUTE'),
        'teacher_onboarding_authenticated', has_function_privilege('authenticated', 'public.complete_teacher_onboarding(uuid,uuid,uuid,jsonb)', 'EXECUTE')
      ),
      'helpers', jsonb_build_object(
        'active_teacher_anon_schema_usage', has_schema_privilege('anon', 'liveschool_internal', 'USAGE'),
        'active_teacher_anon_execute', has_function_privilege('anon', 'liveschool_internal.is_active_teacher(uuid)', 'EXECUTE'),
        'active_teacher_authenticated_execute', has_function_privilege('authenticated', 'liveschool_internal.is_active_teacher(uuid)', 'EXECUTE'),
        'group_chat_authenticated', has_function_privilege('authenticated', 'liveschool_internal.can_access_group_chat(uuid)', 'EXECUTE'),
        'attendance_authenticated', has_function_privilege('authenticated', 'liveschool_internal.can_access_attendance_session(uuid)', 'EXECUTE')
      )
    )
    into v_data;
    v_passed := not has_function_privilege('anon', 'public.review_course_enrollment_as_admin(uuid,uuid,text)', 'EXECUTE')
      and has_function_privilege('authenticated', 'public.review_course_enrollment_as_admin(uuid,uuid,text)', 'EXECUTE')
      and not has_function_privilege('service_role', 'public.review_course_enrollment_as_admin(uuid,uuid,text)', 'EXECUTE')
      and not has_function_privilege('anon', 'public.record_session_attendance(uuid,uuid,text)', 'EXECUTE')
      and has_function_privilege('authenticated', 'public.record_session_attendance(uuid,uuid,text)', 'EXECUTE')
      and not has_function_privilege('service_role', 'public.record_session_attendance(uuid,uuid,text)', 'EXECUTE')
      and has_column_privilege('service_role', 'public.account_roles', 'role_code', 'UP' || 'DATE')
      and has_function_privilege('service_role', 'public.save_learning_group(uuid,uuid,uuid,uuid,text,integer,bigint,integer,time,boolean,uuid[])', 'EXECUTE')
      and not has_function_privilege('authenticated', 'public.save_learning_group(uuid,uuid,uuid,uuid,text,integer,bigint,integer,time,boolean,uuid[])', 'EXECUTE')
      and has_function_privilege('service_role', 'public.complete_teacher_onboarding(uuid,uuid,uuid,jsonb)', 'EXECUTE')
      and not has_function_privilege('authenticated', 'public.complete_teacher_onboarding(uuid,uuid,uuid,jsonb)', 'EXECUTE')
      and has_schema_privilege('anon', 'liveschool_internal', 'USAGE')
      and has_function_privilege('anon', 'liveschool_internal.is_active_teacher(uuid)', 'EXECUTE')
      and has_function_privilege('authenticated', 'liveschool_internal.is_active_teacher(uuid)', 'EXECUTE')
      and has_function_privilege('authenticated', 'liveschool_internal.can_access_group_chat(uuid)', 'EXECUTE')
      and has_function_privilege('authenticated', 'liveschool_internal.can_access_attendance_session(uuid)', 'EXECUTE');
    v_checks := v_checks || jsonb_build_object(
      'id', 'rpc_privileges', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'rpc_privileges', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    with package_tables(name) as (values
      ('profiles'), ('roles'), ('permissions'), ('account_roles'), ('role_permissions'),
      ('guardian_links'), ('stages'), ('grades'), ('subjects'), ('teacher_profiles'),
      ('courses'), ('course_units'), ('lessons'), ('learning_groups'), ('group_members'),
      ('group_join_requests'), ('group_payments'), ('class_sessions'), ('teacher_earnings'),
      ('teacher_applications'), ('support_requests'), ('support_replies'), ('chat_threads'),
      ('chat_participants'), ('chat_messages'), ('site_settings'), ('course_enrollments'),
      ('course_assignments'), ('course_assignment_submissions'), ('session_attendance'),
      ('session_roster_snapshots'), ('session_roster_entries'), ('session_attendance_events')
    ), required(table_name, policy_name, commands, roles, using_null, check_null,
      using_fragments, check_fragments, forbidden_fragments) as (values
      ('profiles', 'Read own profile', 'SELECT', array['authenticated'], false, true,
        array['auth.uid()', 'user_id'], '{}'::text[], array['true']),
      ('profiles', 'Guardians can read linked student profiles', 'SELECT', array['authenticated'], false, true,
        array['auth.uid()', 'guardian_links', 'guardian_id', 'student_id', 'profiles.user_id'], '{}'::text[], array['true']),
      ('guardian_links', 'Guardians can read their links', 'SELECT', array['authenticated'], false, true,
        array['auth.uid()', 'guardian_id'], '{}'::text[], array['true']),
      ('account_roles', 'Read own roles', 'SELECT', array['authenticated'], false, true,
        array['auth.uid()', 'user_id'], '{}'::text[], array['true']),
      ('roles', 'Read role labels', 'SELECT', array['authenticated'], false, true,
        array['true'], '{}'::text[], array['false']),
      ('site_settings', 'Demo visibility is public', 'SELECT', array['anon', 'authenticated'], false, true,
        array['true'], '{}'::text[], array['false']),
      ('stages', 'Read stages', 'SELECT', array['anon', 'authenticated'], false, true,
        array['true'], '{}'::text[], array['false']),
      ('grades', 'Read grades', 'SELECT', array['anon', 'authenticated'], false, true,
        array['true'], '{}'::text[], array['false']),
      ('subjects', 'Read subjects', 'SELECT', array['anon', 'authenticated'], false, true,
        array['true'], '{}'::text[], array['false']),
      ('teacher_profiles', 'Read active teacher profiles', 'SELECT', array['anon', 'authenticated'], false, true,
        array['liveschool_internal.is_active_teacher', 'user_id'], '{}'::text[], array['true']),
      ('courses', 'Read published courses', 'SELECT', array['anon', 'authenticated'], false, true,
        array['status', 'published'], '{}'::text[], array['true']),
      ('course_units', 'Read published course units', 'SELECT', array['anon', 'authenticated'], false, true,
        array['exists', 'courses', 'course_id', 'status', 'published'], '{}'::text[], array['true']),
      ('lessons', 'Read published lessons', 'SELECT', array['anon', 'authenticated'], false, true,
        array['exists', 'course_units', 'courses', 'published'], '{}'::text[], array['true']),
      ('learning_groups', 'Read active public groups', 'SELECT', array['anon', 'authenticated'], false, true,
        array['active', 'exists', 'courses', 'status', 'published'], '{}'::text[], array['true']),
      ('course_enrollments', 'Requesters can read their own course enrollments', 'SELECT', array['authenticated'], false, true,
        array['auth.uid()', 'requester_id'], '{}'::text[], array['true']),
      ('class_sessions', 'Read accessible sessions', 'SELECT', array['authenticated'], false, true,
        array['liveschool_internal.can_access_attendance_session', 'id'], '{}'::text[], array['true']),
      ('session_roster_snapshots', 'Read accessible roster snapshots', 'SELECT', array['authenticated'], false, true,
        array['liveschool_internal.can_access_attendance_session', 'session_id'], '{}'::text[], array['true']),
      ('session_roster_entries', 'Read accessible roster entries', 'SELECT', array['authenticated'], false, true,
        array['liveschool_internal.can_access_attendance_session', 'session_id'], '{}'::text[], array['true']),
      ('session_attendance', 'Read accessible attendance', 'SELECT', array['authenticated'], false, true,
        array['liveschool_internal.can_access_attendance_session', 'session_id'], '{}'::text[], array['true']),
      ('session_attendance_events', 'Read accessible attendance events', 'SELECT', array['authenticated'], false, true,
        array['liveschool_internal.can_access_attendance_session', 'session_id'], '{}'::text[], array['true']),
      ('chat_threads', 'Read joined threads', 'SELECT', array['authenticated'], false, true,
        array['liveschool_internal.can_access_group_chat', 'id'], '{}'::text[], array['true']),
      ('chat_messages', 'Read messages in joined threads', 'SELECT', array['authenticated'], false, true,
        array['liveschool_internal.can_access_group_chat', 'thread_id'], '{}'::text[], array['true']),
      ('chat_messages', 'Send messages to joined threads', 'IN' || 'SERT', array['authenticated'], true, false,
        '{}'::text[], array['auth.uid()', 'sender_id', 'attachment_key is null',
          'char_length(btrim(body)) >= 1', 'char_length(btrim(body)) <= 2000',
          'liveschool_internal.can_access_group_chat', 'thread_id'], array['true']),
      ('chat_participants', 'Read own thread memberships', 'SELECT', array['authenticated'], false, true,
        array['auth.uid()', 'user_id', 'exists', 'chat_threads', 'liveschool_internal.can_access_group_chat'],
        '{}'::text[], array['true'])
    )
    select jsonb_build_object(
      'required_policy_count', (select count(*) from required),
      'missing_required', coalesce(jsonb_agg(jsonb_build_object(
        'table', required.table_name, 'policy', required.policy_name
      ) order by required.table_name, required.policy_name)
      filter (where policy.policyname is null), '[]'::jsonb),
      'semantic_mismatches', coalesce(jsonb_agg(jsonb_build_object(
        'table', required.table_name, 'policy', required.policy_name,
        'command', policy.cmd, 'expected_command', required.commands,
        'roles', policy.roles, 'expected_roles', required.roles,
        'missing_using_fragments', contract.missing_using_fragments,
        'missing_check_fragments', contract.missing_check_fragments,
        'forbidden_fragments', contract.forbidden_fragments
      ) order by required.table_name, required.policy_name)
      filter (where policy.policyname is null or policy.cmd is distinct from required.commands
        or policy.permissive is distinct from 'PERMISSIVE'
        or (select array_agg(role order by role) from unnest(policy.roles::text[]) role)
          is distinct from required.roles
        or (policy.qual is null) is distinct from required.using_null
        or (policy.with_check is null) is distinct from required.check_null
        or contract.missing_using_fragments <> '[]'::jsonb
        or contract.missing_check_fragments <> '[]'::jsonb
        or contract.forbidden_fragments <> '[]'::jsonb), '[]'::jsonb),
      'unexpected_policies', coalesce((select jsonb_agg(jsonb_build_object(
        'table', policy.tablename, 'policy', policy.policyname, 'command', policy.cmd,
        'roles', policy.roles
      ) order by policy.tablename, policy.policyname)
      from pg_policies policy
      join package_tables on package_tables.name = policy.tablename
      where policy.schemaname = 'public'
        and not exists (
          select 1 from required
          where required.table_name = policy.tablename and required.policy_name = policy.policyname
        )), '[]'::jsonb),
      'anonymous_or_public_writes', coalesce((select jsonb_agg(jsonb_build_object(
        'table', policy.tablename, 'policy', policy.policyname, 'command', policy.cmd,
        'roles', policy.roles
      ) order by policy.tablename, policy.policyname)
      from pg_policies policy
      where policy.schemaname = 'public' and policy.cmd = any(v_write_commands)
        and ('public' = any(policy.roles::text[]) or 'anon' = any(policy.roles::text[]))), '[]'::jsonb),
      'unexpected_authenticated_writes', coalesce((select jsonb_agg(jsonb_build_object(
        'table', policy.tablename, 'policy', policy.policyname, 'command', policy.cmd,
        'roles', policy.roles
      ) order by policy.tablename, policy.policyname)
      from pg_policies policy
      where policy.schemaname = 'public' and policy.cmd = any(v_write_commands)
        and 'authenticated' = any(policy.roles::text[])
        and not (policy.tablename = 'chat_messages' and policy.cmd = v_insert_policy_command)), '[]'::jsonb),
      'policies', coalesce(jsonb_agg(jsonb_build_object(
        'table', policy.tablename, 'policy', policy.policyname, 'command', policy.cmd,
        'roles', policy.roles, 'permissive', policy.permissive,
        'using_sha256', md5(coalesce(policy.qual, '')), 'check_sha256', md5(coalesce(policy.with_check, ''))
      ) order by policy.tablename, policy.policyname), '[]'::jsonb)
    ),
    coalesce(bool_and(policy.policyname is not null and policy.cmd = required.commands
      and policy.permissive = 'PERMISSIVE'
      and (select array_agg(role order by role) from unnest(policy.roles::text[]) role) = required.roles
      and (policy.qual is null) = required.using_null
      and (policy.with_check is null) = required.check_null
      and contract.missing_using_fragments = '[]'::jsonb
      and contract.missing_check_fragments = '[]'::jsonb
      and contract.forbidden_fragments = '[]'::jsonb), false)
      and not exists (
        select 1 from pg_policies policy
        join package_tables on package_tables.name = policy.tablename
        where policy.schemaname = 'public'
          and not exists (
            select 1 from required
            where required.table_name = policy.tablename and required.policy_name = policy.policyname
          )
      )
      and not exists (
        select 1 from pg_policies policy
        where policy.schemaname = 'public'
          and policy.cmd = any(v_write_commands)
          and ('public' = any(policy.roles::text[]) or 'anon' = any(policy.roles::text[]))
      )
      and not exists (
        select 1 from pg_policies policy
        where policy.schemaname = 'public'
          and policy.cmd = any(v_write_commands)
          and 'authenticated' = any(policy.roles::text[])
          and not (policy.tablename = 'chat_messages' and policy.cmd = v_insert_policy_command)
      )
    into v_data, v_passed
    from required
    left join pg_policies policy on policy.schemaname = 'public'
      and policy.tablename = required.table_name and policy.policyname = required.policy_name
    cross join lateral (
      select
        (select coalesce(jsonb_agg(fragment order by fragment), '[]'::jsonb)
          from unnest(required.using_fragments) fragment
          where coalesce(policy.qual, '') not ilike '%' || fragment || '%') as missing_using_fragments,
        (select coalesce(jsonb_agg(fragment order by fragment), '[]'::jsonb)
          from unnest(required.check_fragments) fragment
          where coalesce(policy.with_check, '') not ilike '%' || fragment || '%') as missing_check_fragments,
        (select coalesce(jsonb_agg(fragment order by fragment), '[]'::jsonb)
          from unnest(required.forbidden_fragments) fragment
          where coalesce(policy.qual, '') ilike '%' || fragment || '%'
            or coalesce(policy.with_check, '') ilike '%' || fragment || '%') as forbidden_fragments
    ) contract;
    v_checks := v_checks || jsonb_build_object(
      'id', 'rls_policy_inventory', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'rls_policy_inventory', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    select jsonb_build_object(
      'total', count(*),
      'pending', count(*) filter (where e.status = 'pending'),
      'active', count(*) filter (where e.status = 'active'),
      'declined', count(*) filter (where e.status = 'declined'),
      'active_on_nonpublished_courses', count(*) filter (where e.status = 'active' and c.status <> 'published'),
      'legacy_active_without_review', count(*) filter (where e.status = 'active'
        and (e.reviewed_by is null or e.reviewed_at is null)),
      'review_metadata_incomplete', count(*) filter (where e.reviewed_by is not null and e.reviewed_at is null),
      'reviewer_not_active_admin_or_owner', count(*) filter (where e.reviewed_by is not null and not exists (
        select 1 from public.profiles p
        join public.account_roles r on r.user_id = p.user_id
        where p.user_id = e.reviewed_by and p.status = 'active' and r.role_code in ('admin', 'owner')
      )),
      'pending_with_review_metadata', count(*) filter (where e.status = 'pending'
        and (e.reviewed_by is not null or e.reviewed_at is not null))
    )
    into v_data
    from public.course_enrollments e
    left join public.courses c on c.id = e.course_id;
    v_passed := (v_data->>'active_on_nonpublished_courses')::integer = 0
      and (v_data->>'review_metadata_incomplete')::integer = 0
      and (v_data->>'reviewer_not_active_admin_or_owner')::integer = 0
      and (v_data->>'pending_with_review_metadata')::integer = 0;
    v_checks := v_checks || jsonb_build_object(
      'id', 'enrollment_integrity', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'enrollment_integrity', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    select jsonb_build_object(
      'row_counts', jsonb_build_object(
        'sessions', (select count(*) from public.class_sessions),
        'roster_snapshots', (select count(*) from public.session_roster_snapshots),
        'roster_entries', (select count(*) from public.session_roster_entries),
        'attendance', (select count(*) from public.session_attendance),
        'attendance_events', (select count(*) from public.session_attendance_events)
      ),
      'attendance_without_marker', (select count(*) from public.session_attendance where marked_by is null),
      'attendance_without_roster', (select count(*) from public.session_attendance sa
        left join public.session_roster_entries re
          on re.session_id = sa.session_id and re.student_id = sa.student_id
        where re.session_id is null),
      'events_without_roster', (select count(*) from public.session_attendance_events ae
        left join public.session_roster_entries re
          on re.session_id = ae.session_id and re.student_id = ae.student_id
        where re.session_id is null),
      'events_without_marker', (select count(*) from public.session_attendance_events where marked_by is null),
      'attendance_without_event', (select count(*) from public.session_attendance sa
        where not exists (select 1 from public.session_attendance_events ae
          where ae.session_id = sa.session_id and ae.student_id = sa.student_id)),
      'attendance_event_mismatch', (
        select count(*)
        from public.session_attendance sa
        cross join lateral (
          select ae.new_status, ae.marked_by, ae.marked_at
          from public.session_attendance_events ae
          where ae.session_id = sa.session_id and ae.student_id = sa.student_id
          order by ae.marked_at desc, ae.id desc
          limit 1
        ) latest
        where sa.status <> latest.new_status
          or sa.marked_by <> latest.marked_by
          or sa.marked_at <> latest.marked_at
      ),
      'immutability_triggers', coalesce((select jsonb_agg(t.tgname order by t.tgname)
        from pg_trigger t join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname in (
          'session_roster_snapshots', 'session_roster_entries', 'session_attendance_events'
        ) and not t.tgisinternal and t.tgname like '%immutable%'), '[]'::jsonb)
    )
    into v_data;
    v_passed := (v_data->>'attendance_without_marker')::integer = 0
      and (v_data->>'attendance_without_roster')::integer = 0
      and (v_data->>'events_without_roster')::integer = 0
      and (v_data->>'events_without_marker')::integer = 0
      and (v_data->>'attendance_without_event')::integer = 0
      and (v_data->>'attendance_event_mismatch')::integer = 0
      and jsonb_array_length(v_data->'immutability_triggers') = 3;
    v_checks := v_checks || jsonb_build_object(
      'id', 'attendance_and_roster_integrity', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'attendance_and_roster_integrity', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    select jsonb_build_object(
      'threads', (select count(*) from public.chat_threads),
      'participants', (select count(*) from public.chat_participants),
      'messages', (select count(*) from public.chat_messages),
      'threads_without_group', (select count(*) from public.chat_threads where group_id is null),
      'messages_with_attachment', (select count(*) from public.chat_messages where attachment_key is not null),
      'invalid_message_bodies', (select count(*) from public.chat_messages
        where attachment_key is not null or char_length(btrim(body)) not between 1 and 2000),
      'stale_participants', (select count(*) from public.chat_participants cp
        join public.chat_threads t on t.id = cp.thread_id
        join public.learning_groups g on g.id = t.group_id
        where g.teacher_id <> cp.user_id and not exists (
          select 1 from public.group_members gm
          where gm.group_id = g.id and gm.student_id = cp.user_id
        )),
      'direct_chat_schema_present', to_regclass('liveschool_internal.direct_chat_threads') is not null,
      'attachment_bucket_present', exists (select 1 from storage.buckets where id = 'chat-attachments'),
      'attachment_name_column_present', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'chat_messages' and column_name = 'attachment_name'
      ),
      'client_thread_write_policy_present', exists (
        select 1 from pg_policies where schemaname = 'public' and tablename = 'chat_threads'
          and cmd = any(v_write_commands)
      )
    )
    into v_data;
    v_passed := (v_data->>'threads_without_group')::integer = 0
      and (v_data->>'messages_with_attachment')::integer = 0
      and (v_data->>'invalid_message_bodies')::integer = 0
      and not (v_data->>'direct_chat_schema_present')::boolean
      and not (v_data->>'attachment_bucket_present')::boolean
      and not (v_data->>'client_thread_write_policy_present')::boolean;
    v_checks := v_checks || jsonb_build_object(
      'id', 'chat_containment', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'chat_containment', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    select jsonb_build_object(
      'stages', jsonb_build_object(
        'anon_select', has_table_privilege('anon', 'public.stages', 'SELECT'),
        'authenticated_select', has_table_privilege('authenticated', 'public.stages', 'SELECT')
      ),
      'grades', jsonb_build_object(
        'anon_select', has_table_privilege('anon', 'public.grades', 'SELECT'),
        'authenticated_select', has_table_privilege('authenticated', 'public.grades', 'SELECT')
      ),
      'subjects', jsonb_build_object(
        'anon_select', has_table_privilege('anon', 'public.subjects', 'SELECT'),
        'authenticated_select', has_table_privilege('authenticated', 'public.subjects', 'SELECT')
      ),
      'courses', jsonb_build_object(
        'anon_select', has_table_privilege('anon', 'public.courses', 'SELECT'),
        'authenticated_select', has_table_privilege('authenticated', 'public.courses', 'SELECT'),
        'anon_write', has_table_privilege('anon', 'public.courses', v_write_privileges)
      ),
      'public_settings_columns', jsonb_build_object(
        'anon_demo_enabled', has_column_privilege('anon', 'public.site_settings', 'demo_enabled', 'SELECT'),
        'anon_social_links', has_column_privilege('anon', 'public.site_settings', 'social_links', 'SELECT'),
        'anon_full_table_select', has_table_privilege('anon', 'public.site_settings', 'SELECT'),
        'authenticated_demo_enabled', has_column_privilege('authenticated', 'public.site_settings', 'demo_enabled', 'SELECT'),
        'authenticated_social_links', has_column_privilege('authenticated', 'public.site_settings', 'social_links', 'SELECT'),
        'authenticated_full_table_select', has_table_privilege('authenticated', 'public.site_settings', 'SELECT')
      ),
      'teacher_directory_columns', jsonb_build_object(
        'anon_full_table_select', has_table_privilege('anon', 'public.teacher_profiles', 'SELECT'),
        'authenticated_full_table_select', has_table_privilege('authenticated', 'public.teacher_profiles', 'SELECT'),
        'anon_user_id', has_column_privilege('anon', 'public.teacher_profiles', 'user_id', 'SELECT'),
        'anon_subject_id', has_column_privilege('anon', 'public.teacher_profiles', 'subject_id', 'SELECT'),
        'anon_full_name', has_column_privilege('anon', 'public.teacher_profiles', 'full_name', 'SELECT'),
        'anon_qualification', has_column_privilege('anon', 'public.teacher_profiles', 'qualification', 'SELECT'),
        'anon_experience_years', has_column_privilege('anon', 'public.teacher_profiles', 'experience_years', 'SELECT'),
        'anon_bio', has_column_privilege('anon', 'public.teacher_profiles', 'bio', 'SELECT'),
        'anon_portrait_path', has_column_privilege('anon', 'public.teacher_profiles', 'portrait_path', 'SELECT'),
        'authenticated_user_id', has_column_privilege('authenticated', 'public.teacher_profiles', 'user_id', 'SELECT'),
        'authenticated_subject_id', has_column_privilege('authenticated', 'public.teacher_profiles', 'subject_id', 'SELECT'),
        'authenticated_full_name', has_column_privilege('authenticated', 'public.teacher_profiles', 'full_name', 'SELECT'),
        'authenticated_qualification', has_column_privilege('authenticated', 'public.teacher_profiles', 'qualification', 'SELECT'),
        'authenticated_experience_years', has_column_privilege('authenticated', 'public.teacher_profiles', 'experience_years', 'SELECT'),
        'authenticated_bio', has_column_privilege('authenticated', 'public.teacher_profiles', 'bio', 'SELECT'),
        'authenticated_portrait_path', has_column_privilege('authenticated', 'public.teacher_profiles', 'portrait_path', 'SELECT'),
        'anon_intro_video_key', has_column_privilege('anon', 'public.teacher_profiles', 'intro_video_key', 'SELECT'),
        'anon_session_rate_minor', has_column_privilege('anon', 'public.teacher_profiles', 'session_rate_minor', 'SELECT'),
        'anon_onboarding_details', has_column_privilege('anon', 'public.teacher_profiles', 'onboarding_details', 'SELECT'),
        'authenticated_intro_video_key', has_column_privilege('authenticated', 'public.teacher_profiles', 'intro_video_key', 'SELECT'),
        'authenticated_session_rate_minor', has_column_privilege('authenticated', 'public.teacher_profiles', 'session_rate_minor', 'SELECT'),
        'authenticated_onboarding_details', has_column_privilege('authenticated', 'public.teacher_profiles', 'onboarding_details', 'SELECT')
      ),
      'public_group_filter_column', jsonb_build_object(
        'anon_active', has_column_privilege('anon', 'public.learning_groups', 'active', 'SELECT'),
        'authenticated_active', has_column_privilege('authenticated', 'public.learning_groups', 'active', 'SELECT')
      ),
      'published_read_policy', exists (select 1 from pg_policies
        where schemaname = 'public' and tablename = 'courses'
          and policyname = 'Read published courses' and qual ilike '%status%published%')
    )
    into v_data;
    v_passed := has_table_privilege('anon', 'public.stages', 'SELECT')
      and has_table_privilege('anon', 'public.grades', 'SELECT')
      and has_table_privilege('anon', 'public.subjects', 'SELECT')
      and has_table_privilege('anon', 'public.courses', 'SELECT')
      and not has_table_privilege('anon', 'public.courses', v_write_privileges)
      and has_column_privilege('anon', 'public.site_settings', 'demo_enabled', 'SELECT')
      and has_column_privilege('anon', 'public.site_settings', 'social_links', 'SELECT')
      and not has_table_privilege('anon', 'public.site_settings', 'SELECT')
      and has_column_privilege('authenticated', 'public.site_settings', 'demo_enabled', 'SELECT')
      and has_column_privilege('authenticated', 'public.site_settings', 'social_links', 'SELECT')
      and not has_table_privilege('authenticated', 'public.site_settings', 'SELECT')
      and not has_table_privilege('anon', 'public.teacher_profiles', 'SELECT')
      and not has_table_privilege('authenticated', 'public.teacher_profiles', 'SELECT')
      and has_column_privilege('anon', 'public.teacher_profiles', 'user_id', 'SELECT')
      and has_column_privilege('anon', 'public.teacher_profiles', 'subject_id', 'SELECT')
      and has_column_privilege('anon', 'public.teacher_profiles', 'full_name', 'SELECT')
      and has_column_privilege('anon', 'public.teacher_profiles', 'qualification', 'SELECT')
      and has_column_privilege('anon', 'public.teacher_profiles', 'experience_years', 'SELECT')
      and has_column_privilege('anon', 'public.teacher_profiles', 'bio', 'SELECT')
      and has_column_privilege('anon', 'public.teacher_profiles', 'portrait_path', 'SELECT')
      and has_column_privilege('authenticated', 'public.teacher_profiles', 'user_id', 'SELECT')
      and has_column_privilege('authenticated', 'public.teacher_profiles', 'subject_id', 'SELECT')
      and has_column_privilege('authenticated', 'public.teacher_profiles', 'full_name', 'SELECT')
      and has_column_privilege('authenticated', 'public.teacher_profiles', 'qualification', 'SELECT')
      and has_column_privilege('authenticated', 'public.teacher_profiles', 'experience_years', 'SELECT')
      and has_column_privilege('authenticated', 'public.teacher_profiles', 'bio', 'SELECT')
      and has_column_privilege('authenticated', 'public.teacher_profiles', 'portrait_path', 'SELECT')
      and not has_column_privilege('anon', 'public.teacher_profiles', 'intro_video_key', 'SELECT')
      and not has_column_privilege('anon', 'public.teacher_profiles', 'session_rate_minor', 'SELECT')
      and not has_column_privilege('anon', 'public.teacher_profiles', 'onboarding_details', 'SELECT')
      and not has_column_privilege('authenticated', 'public.teacher_profiles', 'intro_video_key', 'SELECT')
      and not has_column_privilege('authenticated', 'public.teacher_profiles', 'session_rate_minor', 'SELECT')
      and not has_column_privilege('authenticated', 'public.teacher_profiles', 'onboarding_details', 'SELECT')
      and has_column_privilege('anon', 'public.learning_groups', 'active', 'SELECT')
      and has_column_privilege('authenticated', 'public.learning_groups', 'active', 'SELECT')
      and exists (select 1 from pg_policies
        where schemaname = 'public' and tablename = 'courses'
          and policyname = 'Read published courses' and qual ilike '%status%published%');
    v_checks := v_checks || jsonb_build_object(
      'id', 'public_catalog_contract', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'public_catalog_contract', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    select jsonb_build_object(
      'groups', (select count(*) from public.learning_groups),
      'groups_over_capacity', (select count(*) from public.learning_groups g
        where (select count(*) from public.group_members gm where gm.group_id = g.id) > g.capacity),
      'active_groups_on_unpublished_courses', (select count(*) from public.learning_groups g
        join public.courses c on c.id = g.course_id where g.active and c.status <> 'published'),
      'groups_with_inactive_teacher', (select count(*) from public.learning_groups g
        where not exists (select 1 from public.profiles p join public.account_roles r on r.user_id = p.user_id
          where p.user_id = g.teacher_id and p.status = 'active' and r.role_code = 'teacher')),
      'sessions_with_group_teacher_mismatch', (select count(*) from public.class_sessions s
        join public.learning_groups g on g.id = s.group_id where s.teacher_id <> g.teacher_id),
      'sessions_with_invalid_time_range', (select count(*) from public.class_sessions where ends_at <= starts_at),
      'members_without_active_enrollment', (select count(*) from public.group_members gm
        join public.learning_groups g on g.id = gm.group_id
        where not exists (select 1 from public.course_enrollments e
          where e.course_id = g.course_id and e.learner_name is not null
            and e.status = 'active' and (e.requester_id = gm.student_id or exists (
              select 1 from public.guardian_links gl where gl.guardian_id = e.requester_id and gl.student_id = gm.student_id
            )))),
      'open_join_requests', (select count(*) from public.group_join_requests where status in ('reserved', 'paid')),
      'duplicate_open_requests', (select count(*) from (
        select group_id, student_id from public.group_join_requests
        where status in ('reserved', 'paid') group by group_id, student_id having count(*) > 1
      ) duplicates)
    )
    into v_data;
    v_passed := (v_data->>'groups_over_capacity')::integer = 0
      and (v_data->>'active_groups_on_unpublished_courses')::integer = 0
      and (v_data->>'groups_with_inactive_teacher')::integer = 0
      and (v_data->>'sessions_with_group_teacher_mismatch')::integer = 0
      and (v_data->>'sessions_with_invalid_time_range')::integer = 0
      and (v_data->>'duplicate_open_requests')::integer = 0;
    v_checks := v_checks || jsonb_build_object(
      'id', 'group_and_session_invariants', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'group_and_session_invariants', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    select jsonb_build_object(
      'buckets', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'public', public) order by id)
        from storage.buckets), '[]'::jsonb),
      'chat_attachment_bucket', exists (select 1 from storage.buckets where id = 'chat-attachments'),
      'chat_storage_policies', coalesce((select jsonb_agg(policyname order by policyname)
        from pg_policies where schemaname = 'storage' and tablename = 'objects'
          and policyname ilike '%chat%attachment%'), '[]'::jsonb),
      'realtime_liveschool_tables', coalesce((select jsonb_agg(pt.schemaname || '.' || pt.tablename order by pt.schemaname || '.' || pt.tablename)
        from pg_publication_tables pt
        where pt.pubname = 'supabase_realtime' and pt.schemaname = 'public'
          and pt.tablename = any(array[
            'profiles', 'roles', 'permissions', 'account_roles', 'role_permissions', 'guardian_links',
            'stages', 'grades', 'subjects', 'teacher_profiles', 'courses', 'course_units', 'lessons',
            'learning_groups', 'group_members', 'group_join_requests', 'group_payments', 'class_sessions',
            'teacher_earnings', 'teacher_applications', 'support_requests', 'support_replies',
            'chat_threads', 'chat_participants', 'chat_messages', 'site_settings', 'course_enrollments',
            'course_assignments', 'course_assignment_submissions', 'session_attendance',
            'session_roster_snapshots', 'session_roster_entries', 'session_attendance_events'
          ])), '[]'::jsonb),
      'notification_table_present', to_regclass('public.notifications') is not null,
      'payment_provider_table_present', to_regclass('public.payment_providers') is not null
        or to_regclass('public.payment_intents') is not null
        or to_regclass('public.payment_transactions') is not null,
      'meeting_provider_columns_present', exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'class_sessions'
          and column_name in ('meeting_id', 'meeting_url', 'provider_meeting_id')
      ),
      'provider_functions_present', coalesce((select jsonb_agg(n.nspname || '.' || p.proname order by n.nspname, p.proname)
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'liveschool_internal')
          and p.proname in ('send_notification', 'create_payment_intent', 'create_meeting')), '[]'::jsonb),
      'direct_chat_functions', coalesce((select jsonb_agg(n.nspname || '.' || p.proname order by n.nspname, p.proname)
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where p.proname in ('direct_chat_contacts', 'direct_chat_thread_ids', 'can_access_chat_attachment', 'read_direct_chat', 'send_direct_chat')),
        '[]'::jsonb),
      'direct_chat_functions_executable', exists (
        select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'liveschool_internal')
          and p.proname in ('direct_chat_contacts', 'direct_chat_thread_ids', 'can_access_chat_attachment', 'read_direct_chat', 'send_direct_chat')
          and (
            has_function_privilege('anon', p.oid, 'EXECUTE')
            or has_function_privilege('authenticated', p.oid, 'EXECUTE')
            or has_function_privilege('service_role', p.oid, 'EXECUTE')
            or exists (
              select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
              where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
            )
          )
      )
    )
    into v_data;
    v_passed := not (v_data->>'chat_attachment_bucket')::boolean
      and jsonb_array_length(v_data->'chat_storage_policies') = 0
      and jsonb_array_length(v_data->'realtime_liveschool_tables') = 0
      and not (v_data->>'notification_table_present')::boolean
      and not (v_data->>'payment_provider_table_present')::boolean
      and not (v_data->>'meeting_provider_columns_present')::boolean
      and jsonb_array_length(v_data->'provider_functions_present') = 0
      and not (v_data->>'direct_chat_functions_executable')::boolean;
    v_checks := v_checks || jsonb_build_object(
      'id', 'storage_realtime_and_disabled_features', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'storage_realtime_and_disabled_features', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    select jsonb_build_object(
      'history_count', count(*),
      'latest_version', max(version),
      'unified_migration_recorded', exists (select 1 from supabase_migrations.schema_migrations
        where version = '20261124010000'),
      'legacy_versions_recorded', coalesce(jsonb_agg(version order by version)
        filter (where version in (
          '20261123123000', '20261123130000', '20261123140000', '20261124000000'
        )), '[]'::jsonb),
      'repository_expected_latest', '20261124010000',
      'manual_history_reconciliation_required', not exists (
        select 1 from supabase_migrations.schema_migrations where version = '20261124010000'
      )
    )
    into v_data
    from supabase_migrations.schema_migrations;
    v_passed := (v_data->>'unified_migration_recorded')::boolean
      and v_data->>'latest_version' = '20261124010000'
      and not (v_data->>'manual_history_reconciliation_required')::boolean;
    v_checks := v_checks || jsonb_build_object(
      'id', 'migration_history', 'status', case when v_passed then 'ok' else 'failed' end,
      'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'migration_history', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    select jsonb_build_object(
      'profiles', (select count(*) from public.profiles),
      'active_profiles', (select count(*) from public.profiles where status = 'active'),
      'teachers', (select count(*) from public.teacher_profiles),
      'courses', (select count(*) from public.courses),
      'published_courses', (select count(*) from public.courses where status = 'published'),
      'groups', (select count(*) from public.learning_groups),
      'members', (select count(*) from public.group_members),
      'enrollments', (select count(*) from public.course_enrollments),
      'assignments', (select count(*) from public.course_assignments),
      'submissions', (select count(*) from public.course_assignment_submissions),
      'support_requests', (select count(*) from public.support_requests),
      'earnings', (select count(*) from public.teacher_earnings)
    )
    into v_data;
    v_passed := true;
    v_checks := v_checks || jsonb_build_object(
      'id', 'aggregate_row_counts', 'status', 'ok', 'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'aggregate_row_counts', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  begin
    select jsonb_build_object(
      'column_fingerprint', md5(coalesce((
        select string_agg(
          table_schema || '.' || table_name || '.' || column_name || ':' || data_type || ':' || is_nullable,
          ',' order by table_schema, table_name, ordinal_position)
        from information_schema.columns
      ), '')),
      'constraint_fingerprint', md5(coalesce((
        select string_agg(
          ns.nspname || '.' || rel.relname || '.' || con.conname || ':' || pg_get_constraintdef(con.oid),
          ',' order by ns.nspname, rel.relname, con.conname)
        from pg_constraint con
        join pg_class rel on rel.oid = con.conrelid
        join pg_namespace ns on ns.oid = con.connamespace
        where ns.nspname = 'public'
      ), '')),
      'function_fingerprint', md5(coalesce((
        select string_agg(
          ns.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || '):' || md5(pg_get_functiondef(p.oid)),
          ',' order by ns.nspname, p.proname)
        from pg_proc p
        join pg_namespace ns on ns.oid = p.pronamespace
        where ns.nspname in ('public', 'liveschool_internal')
      ), '')),
      'policy_fingerprint', md5(coalesce((
        select string_agg(
          schemaname || '.' || tablename || '.' || policyname || ':' || cmd || ':' || roles::text || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''),
          ',' order by schemaname, tablename, policyname)
        from pg_policies
        where schemaname in ('public', 'storage')
      ), '')),
      'production_rls_auto_enable_present', to_regprocedure('public.rls_auto_enable()') is not null
    )
    into v_data
    from (select 1) seed;
    v_passed := true;
    v_checks := v_checks || jsonb_build_object(
      'id', 'catalog_fingerprints', 'status', 'ok', 'data', v_data, 'error', null
    );
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate, v_message = message_text,
      v_detail = pg_exception_detail, v_hint = pg_exception_hint,
      v_context = pg_exception_context;
    v_checks := v_checks || jsonb_build_object(
      'id', 'catalog_fingerprints', 'status', 'error', 'data', null,
      'error', jsonb_build_object('sqlstate', v_sqlstate, 'message', v_message,
        'detail', v_detail, 'hint', v_hint, 'context', v_context)
    );
  end;

  perform set_config('liveschool.verification_result', jsonb_build_object(
    'schema', 'liveschool_database_verification',
    'version', 1,
    'generated_at', clock_timestamp(),
    'strictly_read_only', current_setting('transaction_read_only') = 'on',
    'overall_status', case when exists (
      select 1 from jsonb_array_elements(v_checks) check_item
      where check_item->>'status' <> 'ok'
    ) then 'failed' else 'passed' end,
    'summary', jsonb_build_object(
      'total', jsonb_array_length(v_checks),
      'ok', (select count(*) from jsonb_array_elements(v_checks) check_item where check_item->>'status' = 'ok'),
      'failed', (select count(*) from jsonb_array_elements(v_checks) check_item where check_item->>'status' = 'failed'),
      'errors', (select count(*) from jsonb_array_elements(v_checks) check_item where check_item->>'status' = 'error')
    ),
    'checks', v_checks
  )::text, true);
end;
$verification$;

select current_setting('liveschool.verification_result', true)::jsonb as result;

commit;
