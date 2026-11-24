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

test("authentication redirects retain cookies refreshed by Supabase", () => {
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

test("site-lock responses can retain refreshed authentication cookies", () => {
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
