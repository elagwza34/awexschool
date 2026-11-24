import assert from "node:assert/strict";
import test from "node:test";
import { routeAccessRedirect } from "../../src/features/auth/route-access.ts";

test("guests are redirected from every live portal namespace to login with a safe next path", () => {
  for (const path of [
    "/student",
    "/student/attendance",
    "/teacher/sessions",
    "/parent/courses",
    "/admin/catalog",
    "/manager/requests",
    "/support/activity",
    "/workspace/student/overview",
  ]) {
    assert.equal(
      routeAccessRedirect(path, { authenticated: false, roles: [] }),
      `/login?next=${encodeURIComponent(path)}`,
      path,
    );
  }
});

test("authenticated users are redirected away from login and registration", () => {
  for (const path of ["/login", "/register"]) {
    assert.equal(routeAccessRedirect(path, { authenticated: true, roles: ["student"] }), "/");
  }
});

test("public routes do not receive an authentication redirect", () => {
  for (const path of ["/", "/courses", "/teachers", "/reset-password", "/account/callback"]) {
    assert.equal(routeAccessRedirect(path, { authenticated: false, roles: [] }), null, path);
  }
});

test("admin and manager routes allow only admin, manager, or owner roles", () => {
  for (const path of ["/admin", "/admin/catalog", "/manager", "/manager/team"]) {
    for (const role of ["admin", "manager", "owner"]) {
      assert.equal(routeAccessRedirect(path, { authenticated: true, roles: [role] }), null, `${path} ${role}`);
    }
    for (const role of ["student", "teacher", "parent", "support"]) {
      assert.equal(routeAccessRedirect(path, { authenticated: true, roles: [role] }), "/?message=denied", `${path} ${role}`);
    }
    assert.equal(routeAccessRedirect(path, { authenticated: true, roles: [] }), "/?message=denied", path);
  }
});

test("non-admin live portals allow authenticated users to continue to page-level checks", () => {
  for (const path of ["/student", "/teacher", "/parent", "/support"]) {
    assert.equal(routeAccessRedirect(path, { authenticated: true, roles: ["student"] }), null, path);
  }
});
