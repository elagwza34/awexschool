begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $reconciliation$
declare
  v_target text := '20261124010000';
  v_previous text := '20261123110000';
  v_relation oid;
  v_actual jsonb;
  v_expected jsonb := jsonb_build_object(
    'column_fingerprint', '8b00fff1860ba25e3a79fe060e5721ec',
    'constraint_fingerprint', 'a2c0e84702e5a52f4400a27f2a20a659',
    'function_fingerprint', '0befec1ffafc97123db06399ab9150df',
    'policy_fingerprint', 'b529cac1bd9ba3fdd172c5fd1a6ea687',
    'production_rls_auto_enable_present', true
  );
  v_record jsonb;
  v_has_name boolean;
  v_has_statements boolean;
  v_name_required boolean;
  v_statements_required boolean;
  v_count bigint;
  v_latest text;
  v_recorded boolean;
  v_status text;
begin
  if coalesce(current_setting('transaction_read_only', true), 'off') = 'on' then
    raise exception 'migration_history_reconciliation_refused: transaction is read only';
  end if;

  perform pg_advisory_xact_lock(hashtext('liveschool_migration_history_20261124010000'));

  v_relation := to_regclass('supabase_migrations.schema_migrations');
  if v_relation is null then
    raise exception 'migration_history_reconciliation_refused: migration history table is missing';
  end if;

  if not exists (
    select 1
    from pg_attribute
    where attrelid = v_relation
      and attname = 'version'
      and atttypid = 'text'::regtype
      and not attisdropped
  ) then
    raise exception 'migration_history_reconciliation_refused: version text column is missing';
  end if;

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
  into v_actual
  from (select 1) seed;

  if v_actual is distinct from v_expected then
    raise exception 'migration_history_reconciliation_refused: schema fingerprint drift; expected %, observed %', v_expected, v_actual;
  end if;

  select count(*), max(version), exists (
    select 1 from supabase_migrations.schema_migrations where version = v_target
  )
  into v_count, v_latest, v_recorded
  from supabase_migrations.schema_migrations;

  if not v_recorded and (v_count <> 15 or v_latest is distinct from v_previous) then
    raise exception 'migration_history_reconciliation_refused: unexpected history baseline; count %, latest %', v_count, v_latest;
  end if;

  if v_recorded and (v_count <> 16 or v_latest is distinct from v_target) then
    raise exception 'migration_history_reconciliation_refused: target history is not the expected terminal record; count %, latest %', v_count, v_latest;
  end if;

  select
    exists (
      select 1 from pg_attribute
      where attrelid = v_relation and attname = 'name' and not attisdropped
    ),
    exists (
      select 1 from pg_attribute
      where attrelid = v_relation and attname = 'statements' and not attisdropped
    ),
    exists (
      select 1 from pg_attribute a
      where a.attrelid = v_relation and a.attname = 'name' and a.attnotnull and not a.attisdropped
        and not exists (select 1 from pg_attrdef d where d.adrelid = v_relation and d.adnum = a.attnum)
    ),
    exists (
      select 1 from pg_attribute a
      where a.attrelid = v_relation and a.attname = 'statements' and a.attnotnull and not a.attisdropped
        and not exists (select 1 from pg_attrdef d where d.adrelid = v_relation and d.adnum = a.attnum)
    )
  into v_has_name, v_has_statements, v_name_required, v_statements_required
  from (select 1) seed;

  v_record := jsonb_build_object('version', v_target);
  if v_has_name then
    v_record := v_record || jsonb_build_object('name', 'unified_database_reconciliation');
  end if;
  if v_has_statements and v_statements_required then
    v_record := v_record || jsonb_build_object('statements', '[]'::jsonb);
  end if;

  if v_recorded then
    v_status := 'already_recorded';
  else
    execute 'insert into supabase_migrations.schema_migrations select * from jsonb_populate_record(null::supabase_migrations.schema_migrations, $1::jsonb) on conflict (version) do nothing'
      using v_record;
    v_status := 'reconciled';
  end if;

  select count(*), max(version), exists (
    select 1 from supabase_migrations.schema_migrations where version = v_target
  )
  into v_count, v_latest, v_recorded
  from supabase_migrations.schema_migrations;

  if not v_recorded or v_count <> 16 or v_latest is distinct from v_target then
    raise exception 'migration_history_reconciliation_refused: postcondition failed; count %, latest %', v_count, v_latest;
  end if;

  perform set_config(
    'liveschool.history_reconciliation_result',
    jsonb_build_object(
      'status', v_status,
      'version', v_target,
      'name', case when v_has_name then 'unified_database_reconciliation' else null end,
      'history_count', v_count,
      'latest_version', v_latest,
      'schema_fingerprints', v_actual,
      'schema_sql_executed', false,
      'production_data_modified', false
    )::text,
    true
  );
end
$reconciliation$;

select current_setting('liveschool.history_reconciliation_result', true)::jsonb as reconciliation_result;

commit;
