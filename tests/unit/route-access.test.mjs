import assert from "node:assert/strict";
import test from "node:test";
import * as routeAccess from "../../src/features/auth/route-access.ts";
const { routeAccessRedirect, sessionVerificationMode } = routeAccess;

test("the original owner dashboard requires a verified owner role", () => {
  assert.equal(sessionVerificationMode("/owner"), "roles");
  assert.equal(routeAccessRedirect("/owner", { authenticated: false, roles: [] }), "/login?next=%2Fowner");
  assert.equal(routeAccessRedirect("/owner", { authenticated: true, roles: ["owner"] }), null);
  for (const role of ["admin", "manager", "support", "customer_service", "student"]) {
    assert.equal(routeAccessRedirect("/owner", { authenticated: true, roles: [role] }), "/?message=denied");
  }
});

test("customer service routes require their distinct authenticated role", () => {
  for (const pathname of ["/customer-service", "/customer-service/requests", "/customer-service/activity"]) {
    assert.equal(sessionVerificationMode(pathname), "roles");
    assert.equal(routeAccessRedirect(pathname, { authenticated: false, roles: [] }), `/login?next=${encodeURIComponent(pathname)}`);
    assert.equal(routeAccessRedirect(pathname, { authenticated: true, roles: ["customer_service"] }), null);
    for (const role of ["support", "manager", "admin", "owner", "student"]) {
      assert.equal(routeAccessRedirect(pathname, { authenticated: true, roles: [role] }), "/?message=denied");
    }
  }
});

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

test("proxy verifies identities only where it makes an access decision", () => {
  for (const path of ["/login", "/register", "/student", "/teacher/sessions", "/parent/courses", "/support/activity", "/workspace/student/overview"]) {
    assert.equal(sessionVerificationMode(path), "user", path);
  }
  for (const path of ["/admin", "/admin/catalog", "/manager", "/manager/team"]) {
    assert.equal(sessionVerificationMode(path), "roles", path);
  }
  for (const path of ["/", "/courses", "/teachers", "/account", "/account/callback", "/reset-password", "/teachers/apply", "/dashboards"]) {
    assert.equal(sessionVerificationMode(path), "none", path);
  }
});
