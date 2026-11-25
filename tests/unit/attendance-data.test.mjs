import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAttendanceRecord,
  isAttendanceStatus,
  isUuid,
  loadAttendanceData,
} from "../../src/features/dashboards/attendance-data.ts";

const teacherId = "11111111-1111-4111-8111-111111111111";
const studentId = "22222222-2222-4222-8222-222222222222";
const childId = "33333333-3333-4333-8333-333333333333";
const sessionId = "44444444-4444-4444-8444-444444444444";
const otherSessionId = "55555555-5555-4555-8555-555555555555";
const groupId = "66666666-6666-4666-8666-666666666666";
const now = new Date("2026-11-24T12:00:00.000Z");
const sessions = [
  { id: otherSessionId, group_id: groupId, title: "أحدث حصة", starts_at: "2026-11-24T10:00:00.000Z" },
  { id: sessionId, group_id: groupId, title: "حصة محددة", starts_at: "2026-11-23T10:00:00.000Z" },
];
const rosterEntries = [{ student_id: studentId, display_name: "طالب حقيقي", enrolled_at: null }];
const memberships = [{ student_id: studentId, profiles: { display_name: "طالب حقيقي" } }];
const records = [{
  session_id: sessionId,
  student_id: studentId,
  status: "present",
  class_sessions: { title: "حصة محددة", starts_at: "2026-11-23T10:00:00.000Z" },
  profiles: { display_name: "طالب حقيقي" },
}];

function createClient(responses) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, filters: [], orders: [], selection: null, limit: null, values: null };
      calls.push(call);
      const query = {
        select(selection) {
          call.selection = selection;
          return query;
        },
        eq(column, value) {
          call.filters.push(["eq", column, value]);
          return query;
        },
        neq(column, value) {
          call.filters.push(["neq", column, value]);
          return query;
        },
        lte(column, value) {
          call.filters.push(["lte", column, value]);
          return query;
        },
        in(column, values) {
          call.filters.push(["in", column, values]);
          return query;
        },
        order(column, options) {
          call.orders.push([column, options]);
          return query;
        },
        limit(value) {
          call.limit = value;
          return query;
        },
        maybeSingle() {
          return query;
        },
        then(resolve, reject) {
          const response = responses[table];
          return Promise.resolve(typeof response === "function" ? response(call) : response).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

function attendanceClient(overrides = {}) {
  return createClient({
    class_sessions: { data: sessions, error: null },
    session_roster_snapshots: { data: { session_id: sessionId }, error: null },
    session_roster_entries: { data: rosterEntries, error: null },
    session_attendance: { data: [{ student_id: studentId, status: "present" }], error: null },
    guardian_links: { data: [{ student_id: studentId }, { student_id: childId }], error: null },
    ...overrides,
  });
}

test("teacher attendance uses scoped sessions, frozen roster entries, and recorded statuses", async () => {
  const client = attendanceClient();
  const result = await loadAttendanceData(client, { role: "teacher", userId: teacherId, sessionId, now });

  assert.deepEqual(result, {
    state: "ready",
    sessions,
    selected: sessions[1],
    memberships,
    recorded: new Map([[studentId, "present"]]),
  });
  assert.deepEqual(client.calls.map(({ table }) => table), [
    "class_sessions", "session_roster_snapshots", "session_roster_entries", "session_attendance",
  ]);
  assert.deepEqual(client.calls[0].filters, [
    ["eq", "teacher_id", teacherId],
    ["lte", "starts_at", now.toISOString()],
    ["neq", "status", "cancelled"],
  ]);
  assert.deepEqual(client.calls[0].orders, [["starts_at", { ascending: false }]]);
  assert.equal(client.calls[0].limit, 50);
  assert.deepEqual(client.calls[1].filters, [["eq", "session_id", sessionId]]);
  assert.deepEqual(client.calls[2].filters, [["eq", "session_id", sessionId]]);
  assert.deepEqual(client.calls[2].orders, [["student_id", { ascending: true }]]);
  assert.deepEqual(client.calls[3].filters, [["eq", "session_id", sessionId]]);
});

test("teacher attendance never substitutes another session for an unavailable requested session", async () => {
  const client = attendanceClient();
  const result = await loadAttendanceData(client, {
    role: "teacher",
    userId: teacherId,
    sessionId: "77777777-7777-4777-8777-777777777777",
    now,
  });
  assert.deepEqual(result, { state: "error" });
  assert.deepEqual(client.calls.map(({ table }) => table), ["class_sessions"]);
});

test("teacher attendance reports an empty state only when no sessions exist", async () => {
  const client = attendanceClient({ class_sessions: { data: [], error: null } });
  assert.deepEqual(await loadAttendanceData(client, { role: "teacher", userId: teacherId, now }), { state: "empty" });
  assert.equal(client.calls.length, 1);
});

test("teacher attendance reports query errors without rendering fictional records", async () => {
  for (const [table, response] of [
    ["class_sessions", { data: null, error: { message: "database unavailable" } }],
    ["session_roster_snapshots", { data: null, error: { message: "permission denied" } }],
    ["session_roster_entries", { data: null, error: { message: "network failure" } }],
    ["session_attendance", { data: null, error: { message: "network failure" } }],
  ]) {
    const client = attendanceClient({ [table]: response });
    assert.deepEqual(await loadAttendanceData(client, { role: "teacher", userId: teacherId, now }), { state: "error" });
  }
});

test("teacher attendance fails closed when a historical session has no roster snapshot", async () => {
  const client = attendanceClient({ session_roster_snapshots: { data: null, error: null } });
  assert.deepEqual(await loadAttendanceData(client, { role: "teacher", userId: teacherId, now }), { state: "error" });
  assert.deepEqual(client.calls.map(({ table }) => table), ["class_sessions", "session_roster_snapshots"]);
});

test("student attendance reads only the authenticated student's real records", async () => {
  const client = attendanceClient({ session_attendance: { data: records, error: null } });
  assert.deepEqual(await loadAttendanceData(client, { role: "student", userId: studentId, now }), {
    state: "ready",
    records,
  });
  assert.deepEqual(client.calls.map(({ table }) => table), ["session_attendance"]);
  assert.deepEqual(client.calls[0].filters, [["in", "student_id", [studentId]]]);
});

test("student attendance distinguishes database errors from an empty record set", async () => {
  const failed = attendanceClient({ session_attendance: { data: null, error: { message: "offline" } } });
  assert.deepEqual(await loadAttendanceData(failed, { role: "student", userId: studentId, now }), { state: "error" });
  const empty = attendanceClient({ session_attendance: { data: [], error: null } });
  assert.deepEqual(await loadAttendanceData(empty, { role: "student", userId: studentId, now }), { state: "empty" });
});

test("parent attendance reports guardian-link errors and does not query unscoped attendance", async () => {
  const client = attendanceClient({ guardian_links: { data: null, error: { message: "offline" } } });
  assert.deepEqual(await loadAttendanceData(client, { role: "parent", userId: teacherId, now }), { state: "error" });
  assert.deepEqual(client.calls.map(({ table }) => table), ["guardian_links"]);
});

test("parent attendance distinguishes no linked children from an empty attendance set", async () => {
  const noChildren = attendanceClient({ guardian_links: { data: [], error: null } });
  assert.deepEqual(await loadAttendanceData(noChildren, { role: "parent", userId: teacherId, now }), { state: "empty" });
  assert.deepEqual(noChildren.calls.map(({ table }) => table), ["guardian_links"]);

  const noRecords = attendanceClient({ session_attendance: { data: [], error: null } });
  assert.deepEqual(await loadAttendanceData(noRecords, { role: "parent", userId: teacherId, now }), { state: "empty" });
});

test("parent attendance scopes records to verified guardian links", async () => {
  const client = attendanceClient({ session_attendance: { data: records, error: null } });
  assert.deepEqual(await loadAttendanceData(client, { role: "parent", userId: teacherId, now }), {
    state: "ready",
    records,
  });
  assert.deepEqual(client.calls.map(({ table }) => table), ["guardian_links", "session_attendance"]);
  assert.deepEqual(client.calls[0].filters, [["eq", "guardian_id", teacherId]]);
  assert.deepEqual(client.calls[1].filters, [["in", "student_id", [studentId, childId]]]);
});

test("attendance accepts real UUID identifiers and rejects fixture identifiers", () => {
  for (const value of [teacherId, studentId, childId, sessionId, otherSessionId]) assert.equal(isUuid(value), true);
  for (const value of ["session-1", "user-1", "teacher-one", "", "not-a-uuid", `${sessionId}' OR true --`]) {
    assert.equal(isUuid(value), false);
  }
});

test("attendance accepts only supported status values", () => {
  for (const value of ["present", "absent", "late"]) assert.equal(isAttendanceStatus(value), true);
  for (const value of ["", "unknown", "PRESENT", "present "]) assert.equal(isAttendanceStatus(value), false);
});

test("attendance writes delegate authorization and state changes to the JWT-aware RPC", async () => {
  const calls = [];
  const client = {
    async rpc(name, args) {
      calls.push([name, args]);
      return { data: true, error: null };
    },
  };
  assert.equal(await applyAttendanceRecord(client, sessionId, studentId, "late"), "saved");
  assert.deepEqual(calls, [["record_session_attendance", {
    p_session: sessionId,
    p_student: studentId,
    p_status: "late",
  }]]);
});

test("attendance writes fail closed unless the database confirms the transition", async () => {
  assert.equal(await applyAttendanceRecord({ rpc: async () => ({ data: false, error: null }) }, sessionId, studentId, "late"), "not_found");
  assert.equal(await applyAttendanceRecord({ rpc: async () => ({ data: null, error: { message: "offline" } }) }, sessionId, studentId, "late"), "failed");
});
