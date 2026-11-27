import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

const claims = (actor) => JSON.stringify({ sub: actor, role: "authenticated" });

export async function runPhase02AuthorizationTests(owner, connection, { log = console.log } = {}) {
  const host = connection.connectionString
    ? new URL(connection.connectionString).hostname.replace(/^\[|\]$/g, "")
    : connection.host;
  if (!host || !["127.0.0.1", "localhost", "::1"].includes(host.toLowerCase())) {
    throw new Error("phase02 authorization tests require a local disposable database");
  }
  const results = [];
  const ids = Object.fromEntries(["teacher", "admin", "studentA", "studentB", "parent", "disabledParent", "disabledLearnerParent", "disabledLearner", "revokedStudent", "outsider"]
    .map((name) => [name, randomUUID()]));

  async function check(name, operation) {
    try {
      const evidence = await operation();
      results.push({ name, status: "passed", evidence: evidence ?? null });
      log(`phase02 authorization test passed: ${name}`);
    } catch (error) {
      results.push({ name, status: "failed", error: { code: error.code ?? null, message: error.message } });
      log(`phase02 authorization test failed: ${name}: ${error.message}`);
    }
  }

  async function asUser(userId, operation) {
    const client = new pg.Client(connection);
    await client.connect();
    await client.query("set client_min_messages to warning");
    await client.query("begin");
    await client.query("set local statement_timeout = '8000ms'");
    await client.query("set local lock_timeout = '6000ms'");
    await client.query("select set_config('request.jwt.claims', $1, true)", [claims(userId)]);
    await client.query("set local role authenticated");
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

  const rows = async (client, sql, values = []) => (await client.query(sql, values)).rows;

  for (const [name, id] of Object.entries(ids)) {
    await owner.query(
      `insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
       values ($1, $2, clock_timestamp(), '{"provider":"email","providers":["email"]}'::jsonb, $3::jsonb)
       on conflict (id) do nothing`,
      [id, `phase02-${name}-${id}@example.test`, JSON.stringify({ display_name: `Phase02 ${name}` })],
    );
    await owner.query("delete from public.account_roles where user_id = $1", [id]);
    await owner.query(
      `insert into public.profiles (user_id, display_name, status)
       values ($1, $2, 'active') on conflict (user_id) do update set display_name = excluded.display_name, status = 'active'`,
      [id, `Phase02 ${name}`],
    );
  }

  const roles = {
    teacher: ["teacher"], admin: ["admin"], studentA: ["student"], studentB: ["student"], parent: ["parent"],
    disabledParent: ["parent"], disabledLearnerParent: ["parent"], disabledLearner: ["student"],
    revokedStudent: ["student"], outsider: ["student"],
  };
  for (const [name, assigned] of Object.entries(roles)) {
    for (const role of assigned) await owner.query("insert into public.account_roles (user_id, role_code) values ($1, $2)", [ids[name], role]);
  }

  await owner.query(
    `insert into public.guardian_links (guardian_id, student_id) values ($1, $2), ($3, $2), ($4, $5), ($6, $7)`,
    [ids.parent, ids.studentA, ids.disabledParent, ids.disabledLearnerParent, ids.disabledLearner, ids.revokedStudent, ids.studentA],
  );

  const lookup = (await owner.query("select grade_id, subject_id, track from public.courses order by id limit 1")).rows[0];
  assert.ok(lookup, "a catalog lookup row is required");
  await owner.query(
    `insert into public.teacher_profiles (user_id, subject_id, full_name)
     values ($1, $2, 'Phase02 teacher') on conflict (user_id) do update
     set subject_id = excluded.subject_id, full_name = excluded.full_name`,
    [ids.teacher, lookup.subject_id],
  );
  const courses = {};
  for (const name of ["published", "legacy"]) {
    courses[name] = randomUUID();
    await owner.query(
      `insert into public.courses (id, slug, grade_id, subject_id, track, title, description, status, teacher_id)
       values ($1, $2, $3, $4, $5, $6, 'Phase02 isolated authorization fixture', 'published', $7)`,
      [courses[name], `phase02-${name}-${randomUUID()}`, lookup.grade_id, lookup.subject_id, lookup.track, `Phase02 ${name}`, ids.teacher],
    );
    const unit = randomUUID();
    await owner.query("insert into public.course_units (id, course_id, title, position) values ($1, $2, 'Phase02 unit', 1)", [unit, courses[name]]);
    await owner.query("insert into public.lessons (unit_id, title, position, body) values ($1, 'Phase02 lesson', 1, 'isolated lesson body')", [unit]);
  }

  for (const [requester, student, course, status] of [
    ["studentA", "studentA", "published", "active"],
    ["studentB", "studentB", "published", "active"],
    ["disabledLearner", "disabledLearner", "published", "active"],
    ["revokedStudent", "revokedStudent", "published", "active"],
    ["studentA", null, "legacy", "active"],
  ]) {
    if (!student) {
      await owner.query("begin");
      try {
        await owner.query("set local session_replication_role = replica");
        await owner.query(
          `insert into public.course_enrollments (requester_id, student_id, course_id, learner_name, status, reviewed_by, reviewed_at)
           values ($1, null, $2, $3, $4, $5, clock_timestamp())`,
          [ids[requester], courses[course], `Phase02 ${requester}`, status, ids.admin],
        );
        await owner.query("commit");
      } catch (error) {
        await owner.query("rollback");
        throw error;
      }
      continue;
    }
    await owner.query(
      `insert into public.course_enrollments (requester_id, student_id, course_id, learner_name)
       values ($1, $2, $3, $4)`,
      [ids[requester], ids[student], courses[course], `Phase02 ${requester}`],
    );
    await owner.query(
      `update public.course_enrollments set status = $1, reviewed_by = $2, reviewed_at = clock_timestamp()
       where requester_id = $3 and course_id = $4`,
      [status, ids.admin, ids[requester], courses[course]],
    );
  }

  const group = randomUUID();
  await owner.query(
    `insert into public.learning_groups (id, course_id, teacher_id, name, capacity, fee_minor, weekday, starts_at_local, active)
     values ($1, $2, $3, 'Phase02 attendance group', 20, 0, 1, '09:00', true)`,
    [group, courses.published, ids.teacher],
  );
  for (const student of ["studentA", "studentB", "disabledLearner"]) {
    await owner.query("insert into public.group_members (group_id, student_id) values ($1, $2)", [group, ids[student]]);
  }

  const session = randomUUID();
  await owner.query(
    `insert into public.class_sessions (id, group_id, teacher_id, title, starts_at, ends_at, status)
     values ($1, $2, $3, 'Phase02 attendance session', clock_timestamp() - interval '1 hour', clock_timestamp() - interval '30 minutes', 'completed')`,
    [session, group, ids.teacher],
  );
  await owner.query("insert into public.session_roster_snapshots (session_id, source, captured_by) values ($1, 'live', $2)", [session, ids.teacher]);
  for (const student of ["studentA", "studentB", "disabledLearner"]) {
    await owner.query("insert into public.session_roster_entries (session_id, student_id, display_name) values ($1, $2, $3)", [session, ids[student], `Phase02 ${student}`]);
    await owner.query("insert into public.session_attendance (session_id, student_id, status, marked_by) values ($1, $2, 'present', $3)", [session, ids[student], ids.teacher]);
    await owner.query("insert into public.session_attendance_events (session_id, student_id, previous_status, new_status, marked_by) values ($1, $2, null, 'present', $3)", [session, ids[student], ids.teacher]);
  }

  await owner.query("update public.profiles set status = 'disabled' where user_id = any($1::uuid[])", [[ids.disabledParent, ids.disabledLearner]]);
  await owner.query("delete from public.account_roles where user_id = $1 and role_code = 'student'", [ids.revokedStudent]);

  await check("authoritative active learner can read own enrollment and lesson", async () => {
    const value = await asUser(ids.studentA, async (client) => ({
      enrollments: await rows(client, "select course_id from public.course_enrollments where student_id = $1 and course_id = $2", [ids.studentA, courses.published]),
      canRead: (await rows(client, "select public.can_read_course_lessons($1) as allowed", [courses.published]))[0].allowed,
      lessons: await rows(client, "select l.body from public.lessons l join public.course_units u on u.id = l.unit_id where u.course_id = $1", [courses.published]),
    }));
    assert.equal(value.enrollments.length, 1);
    assert.equal(value.canRead, true);
    assert.deepEqual(value.lessons, [{ body: "isolated lesson body" }]);
    return value;
  });

  await check("legacy unresolved learner cannot read lesson bodies", async () => {
    const value = await asUser(ids.studentA, async (client) => ({
      canRead: (await rows(client, "select public.can_read_course_lessons($1) as allowed", [courses.legacy]))[0].allowed,
      lessons: await rows(client, "select l.body from public.lessons l join public.course_units u on u.id = l.unit_id where u.course_id = $1", [courses.legacy]),
    }));
    assert.equal(value.canRead, false);
    assert.deepEqual(value.lessons, []);
    return value;
  });

  await check("active parent reads only linked active learner data", async () => {
    const value = await asUser(ids.parent, async (client) => ({
      profiles: await rows(client, "select user_id from public.profiles where user_id = $1", [ids.studentA]),
      enrollments: await rows(client, "select student_id from public.course_enrollments where course_id = $1 and student_id = $2", [courses.published, ids.studentA]),
      canRead: (await rows(client, "select public.can_read_course_lessons($1) as allowed", [courses.published]))[0].allowed,
    }));
    assert.equal(value.profiles.length, 1);
    assert.equal(value.enrollments.length, 1);
    assert.equal(value.canRead, true);
    return value;
  });

  await check("disabled parent cannot read lingering guardian or learner records", async () => {
    const value = await asUser(ids.disabledParent, async (client) => ({
      links: await rows(client, "select student_id from public.guardian_links where guardian_id = $1", [ids.disabledParent]),
      profiles: await rows(client, "select user_id from public.profiles where user_id = $1", [ids.studentA]),
      enrollments: await rows(client, "select student_id from public.course_enrollments where student_id = $1", [ids.studentA]),
      canRead: (await rows(client, "select public.can_read_course_lessons($1) as allowed", [courses.published]))[0].allowed,
    }));
    assert.deepEqual(value, { links: [], profiles: [], enrollments: [], canRead: false });
    return value;
  });

  await check("disabled learner is hidden from guardian RLS and lesson authorization", async () => {
    const value = await asUser(ids.disabledLearnerParent, async (client) => ({
      profiles: await rows(client, "select user_id from public.profiles where user_id = $1", [ids.disabledLearner]),
      enrollments: await rows(client, "select student_id from public.course_enrollments where student_id = $1", [ids.disabledLearner]),
      canRead: (await rows(client, "select public.can_read_course_lessons($1) as allowed", [courses.published]))[0].allowed,
      session: await rows(client, "select id from public.class_sessions where id = $1", [session]),
      snapshot: await rows(client, "select session_id from public.session_roster_snapshots where session_id = $1", [session]),
    }));
    assert.deepEqual(value, { profiles: [], enrollments: [], canRead: false, session: [], snapshot: [] });
    return value;
  });

  await check("revoked student role cannot read enrollment or lesson", async () => {
    const value = await asUser(ids.revokedStudent, async (client) => ({
      enrollments: await rows(client, "select course_id from public.course_enrollments where student_id = $1", [ids.revokedStudent]),
      canRead: (await rows(client, "select public.can_read_course_lessons($1) as allowed", [courses.published]))[0].allowed,
    }));
    assert.deepEqual(value, { enrollments: [], canRead: false });
    return value;
  });

  await check("inactive account cannot read its own profile", async () => {
    const value = await asUser(ids.disabledParent, (client) => rows(client, "select user_id from public.profiles where user_id = $1", [ids.disabledParent]));
    assert.deepEqual(value, []);
    return value;
  });

  for (const [table, label] of [
    ["session_attendance", "attendance"], ["session_attendance_events", "attendance events"], ["session_roster_entries", "roster entries"],
  ]) {
    await check(`student ${label} reads are limited to the authenticated learner`, async () => {
      const value = await asUser(ids.studentA, (client) => rows(client, `select student_id from public.${table} where session_id = $1 order by student_id`, [session]));
      assert.deepEqual(value, [{ student_id: ids.studentA }]);
      return value;
    });
    await check(`parent ${label} reads are limited to linked learners`, async () => {
      const value = await asUser(ids.parent, (client) => rows(client, `select student_id from public.${table} where session_id = $1 order by student_id`, [session]));
      assert.deepEqual(value, [{ student_id: ids.studentA }]);
      return value;
    });
    await check(`teacher ${label} reads retain the complete assigned session`, async () => {
      const value = await asUser(ids.teacher, (client) => rows(client, `select student_id from public.${table} where session_id = $1 order by student_id`, [session]));
      assert.deepEqual(value, [ids.studentA, ids.studentB, ids.disabledLearner].sort().map((student_id) => ({ student_id })));
      return value;
    });
  }

  await check("unlinked account cannot read the attendance session", async () => {
    const value = await asUser(ids.outsider, async (client) => ({
      session: await rows(client, "select id from public.class_sessions where id = $1", [session]),
      attendance: await rows(client, "select student_id from public.session_attendance where session_id = $1", [session]),
    }));
    assert.deepEqual(value, { session: [], attendance: [] });
    return value;
  });

  await check("audit view exposes no direct anonymous or authenticated DML", async () => {
    const value = (await owner.query(
      `select has_table_privilege('anon', 'public.course_enrollment_review_audit', 'INSERT') as anon_insert,
              has_table_privilege('authenticated', 'public.course_enrollment_review_audit', 'UPDATE') as authenticated_update,
              has_table_privilege('authenticated', 'public.course_enrollment_review_audit', 'DELETE') as authenticated_delete`,
    )).rows[0];
    assert.deepEqual(value, { anon_insert: false, authenticated_update: false, authenticated_delete: false });
    return value;
  });

  await check("assignment feedback retains the verified service-role column grant", async () => {
    const value = (await owner.query(
      `select has_column_privilege('service_role', 'public.course_assignment_submissions', 'feedback', 'UPDATE') as feedback_update,
              has_table_privilege('service_role', 'public.course_assignment_submissions', 'UPDATE') as table_update`,
    )).rows[0];
    assert.deepEqual(value, { feedback_update: true, table_update: false });
    return value;
  });

  return {
    status: results.every((result) => result.status === "passed") ? "passed" : "failed",
    checks: results.length,
    passed: results.filter((result) => result.status === "passed").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
    environment: "restored disposable PostgreSQL 17.11 with synthetic identities and real authenticated RLS",
    production_accessed: false,
    real_supabase_jwt_postgrest_verified: false,
    fixture: { course_ids: Object.values(courses), session_id: session, identity_ids: ids },
  };
}
