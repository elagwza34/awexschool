import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerHooks } from "node:module";
import test from "node:test";
import { NextRequest, NextResponse } from "next/server.js";

globalThis.__proxyLockAuth = { session: null, user: null, roles: [] };

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier === "@/lib/environment") {
      return {
        url: "data:text/javascript,export function readSupabaseEnvironment(){return {url:'http://127.0.0.1:54321',key:'local-test-key',secretKey:'local-secret-key'}}",
        shortCircuit: true,
      };
    }
    if (specifier === "@supabase/ssr") {
      return {
        url: `data:text/javascript,
          export function createServerClient() {
            return {
              auth: {
                async getSession() { return { data: { session: globalThis.__proxyLockAuth.session } }; },
                async getUser() { return { data: { user: globalThis.__proxyLockAuth.user } }; },
              },
              from() {
                return {
                  select() {
                    return {
                      async eq() {
                        return { data: globalThis.__proxyLockAuth.roles.map((role_code) => ({ role_code })), error: null };
                      },
                    };
                  },
                };
              },
            };
          }
        `,
        shortCircuit: true,
      };
    }
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { copyResponseCookies, redirectWithCookies } = await import("../../src/features/auth/proxy-response.ts");
const authRedirect = await import("../../src/features/auth/auth-redirect.ts").catch(() => ({}));

test("redirect helper retains cookies supplied by an authentication response", () => {
  const refreshed = NextResponse.next();
  refreshed.cookies.set("sb-refreshed-token", "new-token", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  const response = redirectWithCookies(
    new NextRequest("https://liveschool.test/student"),
    "/login?next=%2Fstudent",
    refreshed,
  );
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://liveschool.test/login?next=%2Fstudent");
  assert.deepEqual(response.cookies.get("sb-refreshed-token"), {
    name: "sb-refreshed-token",
    value: "new-token",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
});

test("cookie copy helper can supply authentication cookies to a site-lock response", () => {
  const refreshed = NextResponse.next();
  refreshed.cookies.set("sb-refreshed-token", "new-token");
  const gate = new NextResponse("locked", { status: 401 });
  assert.equal(copyResponseCookies(refreshed, gate).cookies.get("sb-refreshed-token")?.value, "new-token");
});

test("redirects without an authentication response remain cookie-free", () => {
  const response = redirectWithCookies(new NextRequest("https://liveschool.test/login"), "/");
  assert.equal(response.status, 307);
  assert.deepEqual(response.cookies.getAll(), []);
});

test("redirect helper rejects destinations outside the current origin", () => {
  assert.throws(
    () => redirectWithCookies(new NextRequest("https://liveschool.test/login"), "https://attacker.test/phishing"),
    /Unsafe redirect destination/,
  );
  assert.throws(
    () => redirectWithCookies(new NextRequest("https://liveschool.test/login"), "//attacker.test/phishing"),
    /Unsafe redirect destination/,
  );
});

test("login return paths preserve supported deep links and reject redirect bypasses", () => {
  assert.equal(typeof authRedirect.safeLoginNextPath, "function");
  const fallback = "/account?from=login";
  const accepted = [
    "/student",
    "/student/courses?tab=active#current",
    "/teacher/sessions?date=2026-11-24",
    "/parent/attendance",
    "/admin/users",
    "/manager/requests",
    "/support/activity",
    "/workspace/support/group-requests",
    "/account",
    "/courses/123e4567-e89b-12d3-a456-426614174000",
  ];
  for (const value of accepted) assert.equal(authRedirect.safeLoginNextPath(value, fallback), value);

  const rejected = [
    "",
    "student/courses",
    "https://attacker.test/phishing",
    "//attacker.test/phishing",
    "/\\attacker.test/phishing",
    "%2f%2fattacker.test/phishing",
    "/%5cattacker.test/phishing",
    "/student%5c%5cattacker.test",
    "/login",
    "/register?next=%2Fstudent",
    "/reset-password",
    "/account/callback",
    "/%61ccount/callback",
    "/unsupported/path",
    "/student/\u0000evil",
  ];
  for (const value of rejected) assert.equal(authRedirect.safeLoginNextPath(value, fallback), fallback, value);
});

test("a global lock admits authenticated portals without bypassing role checks", async () => {
  const directory = mkdtempSync(join(tmpdir(), "awex-proxy-lock-test-"));
  process.env.SITE_LOCK_STORE_DIR = directory;
  const { saveLock, removeLock } = await import("../../src/lib/site-access.ts");
  const { proxy } = await import("../../src/proxy.ts");
  try {
    await saveLock("*", "local-global-lock-code");

    globalThis.__proxyLockAuth = { session: null, user: null, roles: [] };
    const guest = await proxy(new NextRequest("https://liveschool.test/student"));
    assert.equal(guest.status, 401);

    globalThis.__proxyLockAuth = { session: { access_token: "student-token" }, user: { id: "student-id" }, roles: ["student"] };
    const student = await proxy(new NextRequest("https://liveschool.test/student"));
    assert.equal(student.status, 200);

    const restricted = await proxy(new NextRequest("https://liveschool.test/student/subscriptions"));
    assert.equal(restricted.status, 307);
    assert.equal(restricted.headers.get("location"), "https://liveschool.test/account?message=section-unavailable&portal=student");


    const deniedAdmin = await proxy(new NextRequest("https://liveschool.test/admin"));
    assert.equal(deniedAdmin.status, 307);
    assert.equal(deniedAdmin.headers.get("location"), "https://liveschool.test/?message=denied");

    globalThis.__proxyLockAuth = { session: { access_token: "admin-token" }, user: { id: "admin-id" }, roles: ["admin"] };
    const admin = await proxy(new NextRequest("https://liveschool.test/admin"));
    assert.equal(admin.status, 200);

    await saveLock("/student", "local-student-lock-code");
    const pathLockedStudent = await proxy(new NextRequest("https://liveschool.test/student"));
    assert.equal(pathLockedStudent.status, 401);
  } finally {
    await removeLock("/student");
    await removeLock("*");
    rmSync(directory, { recursive: true, force: true });
    delete process.env.SITE_LOCK_STORE_DIR;
  }
});
