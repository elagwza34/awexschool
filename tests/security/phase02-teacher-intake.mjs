import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";

const emailHash = (email) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
const ipHash = (value) => createHash("sha256").update(value).digest("hex");

export async function runPhase02TeacherIntakeTests(owner, connection, { log = console.log } = {}) {
  const host = connection.connectionString
    ? new URL(connection.connectionString).hostname.replace(/^\[|\]$/g, "")
    : connection.host;
  if (!host || !["127.0.0.1", "localhost", "::1"].includes(host.toLowerCase())) {
    throw new Error("phase02 teacher intake tests require a local disposable database");
  }
  const results = [];
  const ids = Object.fromEntries(["requester", "attacker"].map((name) => [name, randomUUID()]));
  const applications = Object.fromEntries(["throttle", "success", "requester"].map((name) => [name, randomUUID()]));
  const missingApplication = randomUUID();

  async function check(name, operation) {
    try {
      const evidence = await operation();
      results.push({ name, status: "passed", evidence: evidence ?? null });
      log(`phase02 teacher intake test passed: ${name}`);
    } catch (error) {
      results.push({ name, status: "failed", error: { code: error.code ?? null, message: error.message } });
      log(`phase02 teacher intake test failed: ${name}: ${error.message}`);
    }
  }

  async function asCaller(actor, operation) {
    const client = new pg.Client(connection);
    await client.connect();
    await client.query("set client_min_messages to warning");
    await client.query("begin");
    await client.query("set local statement_timeout = '8000ms'");
    await client.query("set local lock_timeout = '6000ms'");
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(actor
      ? { sub: actor, role: "authenticated" }
      : { role: "anon" })]);
    await client.query(`set local role ${actor ? "authenticated" : "anon"}`);
    try {
      const value = await operation(client);
      await client.query("commit");
      return value;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      await client.end();
    }
  }

  const track = (actor, challenge) => asCaller(actor, async (client) =>
    (await client.query("select public.track_teacher_application($1) as status", [challenge])).rows[0]?.status ?? null);
  const capture = async (operation) => {
    try {
      return { value: await operation(), error: null };
    } catch (error) {
      return { value: undefined, error: { code: error.code ?? null, message: error.message } };
    }
  };

  async function createChallenge({ applicationId, actor = null, email = null, ip = randomUUID(), expiresAt, consumedAt, createdAt }) {
    const id = randomUUID();
    const now = new Date();
    await owner.query(
      `insert into public.teacher_intake_challenges
       (id, purpose, actor_id, ip_hash, application_id, email_hash, expires_at, consumed_at, created_at)
       values ($1, 'track', $2, $3, $4, $5, $6, $7, $8)`,
      [id, actor, ipHash(ip), applicationId, email ? emailHash(email) : null,
        expiresAt ?? new Date(now.getTime() + 10 * 60 * 1000), consumedAt ?? null, createdAt ?? now],
    );
    return id;
  }

  for (const [name, id] of Object.entries(ids)) {
    await owner.query(
      `insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
       values ($1, $2, clock_timestamp(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb)`,
      [id, `phase02-intake-${name}-${id}@example.test`],
    );
    await owner.query("delete from public.account_roles where user_id = $1", [id]);
    await owner.query(
      "insert into public.profiles (user_id, display_name, status) values ($1, $2, 'active') on conflict (user_id) do update set display_name = excluded.display_name, status = 'active'",
      [id, `Phase02 intake ${name}`],
    );
    await owner.query("insert into public.account_roles (user_id, role_code) values ($1, 'student')", [id]);
  }

  const subject = (await owner.query("select id from public.subjects order by id limit 1")).rows[0];
  assert.ok(subject, "a subject fixture is required");
  for (const [name, id] of Object.entries(applications)) {
    await owner.query(
      `insert into public.teacher_applications (id, requester_id, email, email_verified_at, full_name, subject_id)
       values ($1, $2, $3, clock_timestamp(), $4, $5)`,
      [id, name === "requester" ? ids.requester : null,
        name === "requester" ? `phase02-requester-${ids.requester}@example.test` : `phase02-legacy-${id}@example.test`,
        `Phase02 ${name}`, subject.id],
    );
  }

  await check("failed tracking guesses are consumed and the IP counter stays capped", async () => {
    const ip = `phase02-throttle-${randomUUID()}`;
    const challengeIds = [];
    const outcomes = [];
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const challenge = await createChallenge({ applicationId: applications.throttle, email: "wrong@example.test", ip });
      challengeIds.push(challenge);
      outcomes.push(await capture(() => track(null, challenge)));
    }
    const counter = (await owner.query(
      "select attempt_count from public.teacher_intake_rate_limits where scope = 'track' and subject_key = $1",
      [`ip:${ipHash(ip)}`],
    )).rows[0];
    const consumed = (await owner.query(
      "select count(*)::int as count from public.teacher_intake_challenges where id = any($1::uuid[]) and consumed_at is not null",
      [challengeIds],
    )).rows[0].count;
    const evidence = {
      attempts: outcomes.length,
      generic_null_results: outcomes.filter((outcome) => outcome.value === null && outcome.error === null).length,
      attempt_31: outcomes[30],
      counter: counter?.attempt_count ?? 0,
      consumed,
    };
    assert.equal(evidence.generic_null_results, 40);
    assert.equal(evidence.counter, 30);
    assert.equal(evidence.consumed, 40);
    return evidence;
  });

  await check("pre-existing throttled counters never grant another attempt", async () => {
    const email = (await owner.query("select email from public.teacher_applications where id = $1", [applications.success])).rows[0].email;
    const evidence = [];
    for (const count of [29, 30, 31]) {
      const ip = `phase02-existing-counter-${count}-${randomUUID()}`;
      const subjectKey = `ip:${ipHash(ip)}`;
      await owner.query(
        "insert into public.teacher_intake_rate_limits (scope, subject_key, window_started_at, attempt_count) values ('track', $1, clock_timestamp(), $2)",
        [subjectKey, count],
      );
      const challenge = await createChallenge({ applicationId: applications.success, email, ip });
      const result = await track(null, challenge);
      const stored = (await owner.query(
        "select attempt_count from public.teacher_intake_rate_limits where scope = 'track' and subject_key = $1",
        [subjectKey],
      )).rows[0]?.attempt_count;
      evidence.push({ initial: count, result, stored });
    }
    assert.deepEqual(evidence, [
      { initial: 29, result: "pending", stored: 30 },
      { initial: 30, result: null, stored: 30 },
      { initial: 31, result: null, stored: 31 },
    ]);
    return evidence;
  });

  await check("nonexistent references consume admission without creating a challenge or exposing existence", async () => {
    const ip = `phase02-reference-${randomUUID()}`;
    const existing = await createChallenge({ applicationId: applications.success, email: "wrong@example.test", ip });
    const missingAdmission = (await owner.query(
      "select public.consume_teacher_tracking_admission(null, $1) as admitted",
      [ipHash(ip)],
    )).rows[0]?.admitted;
    const existingResult = await capture(() => track(null, existing));
    const counter = (await owner.query(
      "select attempt_count from public.teacher_intake_rate_limits where scope = 'track' and subject_key = $1",
      [`ip:${ipHash(ip)}`],
    )).rows[0]?.attempt_count;
    const evidence = {
      existing: existingResult,
      missing: { value: null, error: null },
      missing_admission: missingAdmission,
      counter,
    };
    assert.deepEqual(evidence, {
      existing: { value: null, error: null },
      missing: { value: null, error: null },
      missing_admission: true,
      counter: 2,
    });
    return evidence;
  });

  await check("a valid challenge succeeds once and replay returns the generic result", async () => {
    const application = applications.success;
    const email = (await owner.query("select email from public.teacher_applications where id = $1", [application])).rows[0].email;
    const challenge = await createChallenge({ applicationId: application, email });
    const evidence = {
      first: await capture(() => track(null, challenge)),
      replay: await capture(() => track(null, challenge)),
      consumed: (await owner.query("select count(*)::int as count from public.teacher_intake_challenges where id = $1 and consumed_at is not null", [challenge])).rows[0].count,
    };
    assert.deepEqual(evidence, { first: { value: "pending", error: null }, replay: { value: null, error: null }, consumed: 1 });
    return evidence;
  });

  await check("wrong actors cannot consume a requester challenge or read the application", async () => {
    const email = (await owner.query("select email from public.teacher_applications where id = $1", [applications.requester])).rows[0].email;
    const attackerChallenge = await createChallenge({ applicationId: applications.requester, actor: ids.requester, email });
    const requesterChallenge = await createChallenge({ applicationId: applications.requester, actor: ids.requester, email });
    const evidence = {
      attacker: await capture(() => track(ids.attacker, attackerChallenge)),
      attacker_challenge_consumed: (await owner.query("select consumed_at is not null as consumed from public.teacher_intake_challenges where id = $1", [attackerChallenge])).rows[0].consumed,
      requester: await capture(() => track(ids.requester, requesterChallenge)),
    };
    assert.deepEqual(evidence, {
      attacker: { value: null, error: null },
      attacker_challenge_consumed: false,
      requester: { value: "pending", error: null },
    });
    return evidence;
  });

  await check("terminal challenges and expired counters are cleaned without deleting fresh state", async () => {
    const now = Date.now();
    const old = [];
    for (const consumed of [true, false]) {
      old.push(await createChallenge({
        applicationId: applications.success,
        email: "retention@example.test",
        expiresAt: new Date(now - 2 * 60 * 60 * 1000),
        consumedAt: consumed ? new Date(now - 2 * 60 * 60 * 1000) : null,
        createdAt: new Date(now - 3 * 60 * 60 * 1000),
      }));
    }
    const fresh = await createChallenge({ applicationId: applications.success, email: "fresh@example.test" });
    const staleKeys = [`user:${randomUUID()}`, `ip:${randomUUID()}`, `user:${randomUUID()}`];
    const freshKeys = [`user:${randomUUID()}`, `ip:${randomUUID()}`, `user:${randomUUID()}`];
    await owner.query(
      `insert into public.teacher_intake_rate_limits (scope, subject_key, window_started_at, attempt_count)
       values ('track', $1, clock_timestamp() - interval '2 hours', 30),
              ('track', $2, clock_timestamp() - interval '2 hours', 30),
              ('submit', $3, clock_timestamp() - interval '25 hours', 20),
              ('track', $4, clock_timestamp(), 1),
              ('track', $5, clock_timestamp(), 1),
              ('submit', $6, clock_timestamp(), 1)`,
      [...staleKeys, ...freshKeys],
    );
    const email = (await owner.query("select email from public.teacher_applications where id = $1", [applications.success])).rows[0].email;
    const trigger = await createChallenge({ applicationId: applications.success, email });
    const result = await track(null, trigger);
    const remainingChallenges = (await owner.query("select id from public.teacher_intake_challenges where id = any($1::uuid[])", [old])).rows.map((row) => row.id);
    const remainingCounters = (await owner.query("select subject_key from public.teacher_intake_rate_limits where subject_key = any($1::text[])", [[...staleKeys, ...freshKeys]])).rows.map((row) => row.subject_key);
    const evidence = { result, remaining_challenges: remainingChallenges, fresh_challenge_retained: !!await challengeExists(fresh), remaining_counters: remainingCounters };
    assert.equal(result, "pending");
    assert.deepEqual(remainingChallenges, []);
    assert.equal(evidence.fresh_challenge_retained, true);
    assert.deepEqual(remainingCounters.sort(), freshKeys.sort());
    return evidence;
  });

  await check("intake cleanup and admission helpers are service-role-only security definers", async () => {
    const email = (await owner.query("select email from public.teacher_applications where id = $1", [applications.success])).rows[0].email;
    const challenge = await createChallenge({ applicationId: applications.success, email });
    const contract = (await owner.query(
      `select p.proname as name,
              pg_get_userbyid(p.proowner) as owner,
              p.prosecdef as security_definer,
              exists (select 1 from unnest(p.proconfig) as setting where setting = 'search_path=""') as empty_search_path,
              has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute,
              has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
              has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
       from pg_proc p
       where p.oid in ('public.consume_teacher_tracking_admission(uuid,text)'::regprocedure,
                       'public.discard_teacher_intake_challenge(uuid)'::regprocedure)
       order by p.proname`,
    )).rows;
    const anonDiscard = await capture(() => asCaller(null, async (client) =>
      client.query("select public.discard_teacher_intake_challenge($1)", [challenge])));
    const retainedAfterDenial = await challengeExists(challenge);
    await owner.query("select public.discard_teacher_intake_challenge($1)", [challenge]);
    const evidence = { contract, anon_discard: anonDiscard, retained_after_denial: retainedAfterDenial, discarded: !await challengeExists(challenge) };
    assert.deepEqual(contract, [
      { name: "consume_teacher_tracking_admission", owner: "postgres", security_definer: true, empty_search_path: true, service_role_execute: true, anon_execute: false, authenticated_execute: false },
      { name: "discard_teacher_intake_challenge", owner: "postgres", security_definer: true, empty_search_path: true, service_role_execute: true, anon_execute: false, authenticated_execute: false },
    ]);
    assert.equal(anonDiscard.error?.code, "42501");
    assert.equal(retainedAfterDenial, true);
    assert.equal(evidence.discarded, true);
    return evidence;
  });

  await check("intake function, table, grant, and foreign-key contracts remain restrictive", async () => {
    const contract = (await owner.query(
      `select pg_get_userbyid(p.proowner) as owner,
              p.prosecdef as security_definer,
              exists (select 1 from unnest(p.proconfig) as setting where setting = 'search_path=""') as empty_search_path,
              has_function_privilege('anon', 'public.track_teacher_application(uuid)', 'EXECUTE') as anon_execute,
              has_function_privilege('authenticated', 'public.track_teacher_application(uuid)', 'EXECUTE') as authenticated_execute,
              has_function_privilege('service_role', 'public.track_teacher_application(uuid)', 'EXECUTE') as service_role_execute,
              has_table_privilege('anon', 'public.teacher_intake_challenges', 'INSERT') as anon_insert,
              has_table_privilege('authenticated', 'public.teacher_intake_challenges', 'SELECT') as authenticated_select,
              has_table_privilege('service_role', 'public.teacher_intake_challenges', 'INSERT') as service_role_insert,
              has_table_privilege('service_role', 'public.teacher_intake_challenges', 'SELECT') as service_role_select,
              has_table_privilege('service_role', 'public.teacher_intake_challenges', 'UPDATE') as service_role_update,
              has_table_privilege('service_role', 'public.teacher_intake_challenges', 'DELETE') as service_role_delete,
              has_table_privilege('service_role', 'public.course_enrollment_review_audit', 'SELECT') as audit_service_role_select,
              has_table_privilege('service_role', 'public.course_enrollment_review_audit', 'INSERT') as audit_service_role_insert,
              has_table_privilege('service_role', 'public.course_enrollment_review_audit', 'UPDATE') as audit_service_role_update,
              has_table_privilege('service_role', 'public.course_enrollment_review_audit', 'DELETE') as audit_service_role_delete,
              has_table_privilege('authenticated', 'public.course_enrollment_review_audit', 'SELECT') as audit_authenticated_select,
              (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'public' and c.relname in ('teacher_intake_challenges', 'teacher_intake_rate_limits')) as rls_enabled,
              (select count(*)::int from pg_constraint con
               where con.conrelid = 'public.teacher_intake_challenges'::regclass
                 and con.contype = 'f'
                 and con.confrelid = 'public.teacher_applications'::regclass
                 and con.conkey = array[(select attnum from pg_attribute where attrelid = 'public.teacher_intake_challenges'::regclass and attname = 'application_id')]::smallint[]) as application_foreign_keys
      from pg_proc p
      where p.oid = 'public.track_teacher_application(uuid)'::regprocedure`,
    )).rows[0];
    assert.deepEqual(contract, {
      owner: "postgres",
      security_definer: true,
      empty_search_path: true,
      anon_execute: true,
      authenticated_execute: true,
      service_role_execute: false,
      anon_insert: false,
      authenticated_select: false,
      service_role_insert: true,
      service_role_select: true,
      service_role_update: false,
      service_role_delete: false,
      audit_service_role_select: false,
      audit_service_role_insert: false,
      audit_service_role_update: false,
      audit_service_role_delete: false,
      audit_authenticated_select: true,
      rls_enabled: true,
      application_foreign_keys: 1,
    });
    return contract;
  });

  async function challengeExists(id) {
    return !!(await owner.query("select 1 from public.teacher_intake_challenges where id = $1", [id])).rowCount;
  }

  return {
    status: results.every((result) => result.status === "passed") ? "passed" : "failed",
    checks: results.length,
    passed: results.filter((result) => result.status === "passed").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
    environment: "restored disposable PostgreSQL 17.11 with synthetic teacher-intake fixtures and real anon/authenticated roles",
    production_accessed: false,
    real_supabase_jwt_postgrest_verified: false,
    fixture: { application_ids: applications, missing_application_id: missingApplication, identity_ids: ids },
  };
}
