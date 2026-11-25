import { NextResponse, type NextRequest } from "next/server";
import { assertInternalRedirect } from "./auth-redirect.ts";

export function copyResponseCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

export function redirectWithCookies(request: NextRequest, destination: string, source?: NextResponse) {
  assertInternalRedirect(destination);
  const response = NextResponse.redirect(new URL(destination, request.url), {
    headers: { "Cache-Control": "private, no-store" },
  });
  return source ? copyResponseCookies(source, response) : response;
}
