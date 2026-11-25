import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { NextRequest, NextResponse } from "next/server.js";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
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
