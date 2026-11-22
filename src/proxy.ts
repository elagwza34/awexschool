import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { liveDashboardPaths } from "@/features/auth/dashboard-roles";
import {
  createSiteSession,
  getOwnerCode,
  getRequestLock,
  hasSiteSession,
  isValidAccessCode,
  listLocks,
  lockCookie,
  lockSettingsPath,
  matchesLockCode,
  matchesSiteCode,
  normalizeLockPath,
  ownerCookie,
  parseLockScope,
  removeLock,
  saveLock,
  siteSessionSeconds,
} from "./lib/site-access";

const headers = {
  "Cache-Control": "private, no-store",
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

const portalPath = /^\/(?:admin|manager|support|teacher|student|parent|workspace)(?:\/|$)/;

function gate(status: number, message: string, owner = false) {
  return screen(status, owner ? "إدارة أقفال الموقع" : "دخول Awex School", message, status === 503 ? "" : `
    <form method="post" enctype="application/x-www-form-urlencoded">
      <label for="code">كود الدخول</label>
      <input id="code" name="code" type="password" dir="ltr" maxlength="128" autocomplete="current-password" required>
      <button type="submit">دخول</button>
    </form>`);
}

function screen(status: number, title: string, message: string, content: string) {
  return new NextResponse(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box }
    body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 1rem;
      background: #eef5f1; color: #173e33; font: 1rem/1.65 system-ui, sans-serif }
    main { width: min(100%, ${status === 200 ? "36rem" : "25rem"}); padding: clamp(1.25rem, 5vw, 2rem); border: 1px solid #c9d8cf;
      border-radius: 1rem; background: white }
    h1 { font-size: 1.5rem; margin: 0 }
    p { margin: .5rem 0 1.25rem }
    [role=alert] { color: #a12219 }
    form { display: grid; gap: .75rem }
    input, button { min-height: 44px; padding: .5rem .75rem; font: inherit; border-radius: .5rem }
    input { width: 100%; border: 1px solid #69867a }
    button { border: 0; background: #205c49; color: white; cursor: pointer }
    :focus-visible { outline: 2px solid #205c49; outline-offset: 3px }
    li { margin-block: .75rem; overflow-wrap: anywhere }
    li form { display: inline; margin-inline-start: .5rem }
    a { color: #205c49 }
  </style>
</head>
<body><main>
  <h1>${title}</h1>
  <p${status >= 400 && status !== 401 ? ' role="alert"' : ""}>${message}</p>
  ${content}
</main></body>
</html>`, { status, headers });
}

async function readForm(request: NextRequest) {
  const length = Number(request.headers.get("content-length"));
  const contentType = request.headers.get("content-type")?.split(";")[0];
  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    contentType !== "application/x-www-form-urlencoded" ||
    !Number.isInteger(length) || length < 1 || length > 2048 ||
    (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")
  ) {
    return undefined;
  }
  return new URLSearchParams(await request.text());
}

function redirectBack(request: NextRequest) {
  const destination = new URL(request.url);
  return NextResponse.redirect(destination, {
    status: 303,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function unlock(request: NextRequest, cookie: string, secret: string) {
  const response = redirectBack(request);
  response.cookies.set(cookie, createSiteSession(secret), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: siteSessionSeconds,
  });
  return response;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

async function settings(request: NextRequest) {
  const secret = getOwnerCode();
  if (!secret) return gate(503, "ضبط كود إدارة الأقفال مطلوب قبل استخدام الشاشة.", true);
  const authorized = hasSiteSession(request.cookies.get(ownerCookie)?.value, secret);
  if (!authorized) {
    if (request.method !== "POST") return gate(401, "أدخل كود إدارة الأقفال.", true);
    const fields = await readForm(request);
    if (!fields || !matchesSiteCode(fields.get("code") ?? "", secret)) {
      return gate(403, "كود إدارة الأقفال غير صحيح.", true);
    }
    return unlock(request, ownerCookie, secret);
  }

  let status = 200;
  let message = "استخدم * للموقع كله، أو اكتب رابط الصفحة داخل الموقع مثل /teachers.";
  if (request.method === "POST") {
    const fields = await readForm(request);
    if (!fields) return gate(403, "طلب غير صالح.", true);
    const scope = parseLockScope(fields.get("scope") ?? "");
    const code = fields.get("code") ?? "";
    const action = fields.get("action");
    if (!scope || (action === "save" && !isValidAccessCode(code)) || (action !== "save" && action !== "remove")) {
      status = 400;
      message = "اكتب مسار صفحة صحيح وكود من 16 إلى 128 حرف عند الحفظ.";
    } else {
      if (action === "save") await saveLock(scope, code);
      else await removeLock(scope);
      return redirectBack(request);
    }
  }

  const locks = await listLocks();
  return screen(status, "إدارة أقفال الموقع", message, `
    <form method="post">
      <input type="hidden" name="action" value="save">
      <label for="scope">مسار الصفحة أو *</label>
      <input id="scope" name="scope" dir="ltr" maxlength="200" placeholder="/teachers" required>
      <label for="lock-code">كود الزائر</label>
      <input id="lock-code" name="code" type="password" dir="ltr" minlength="16" maxlength="128" autocomplete="new-password" required>
      <button type="submit">حفظ القفل</button>
    </form>
    <h2>الأقفال الحالية</h2>
    ${locks.length ? `<ul>${locks.map((scope) => `<li>
      ${scope === "*" ? "<span>الموقع بالكامل</span>" : `<bdi>${escapeHtml(scope)}</bdi>`}
      <form method="post">
        <input type="hidden" name="action" value="remove">
        <input type="hidden" name="scope" value="${escapeHtml(scope)}">
        <button type="submit">إلغاء القفل</button>
      </form>
    </li>`).join("")}</ul>` : "<p>مفيش أقفال مفعّلة.</p>"}
    <a href="/admin">العودة للوحة الإدارة</a>`);
}

async function continueRequest(request: NextRequest, verifySession = false) {
  const responseHeaders = { "Cache-Control": "private, no-store", "CDN-Cache-Control": "no-store" };
  let response = NextResponse.next({ request, headers: responseHeaders });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if ((!verifySession && request.nextUrl.pathname !== "/account") || !url || !key) {
    return { response, authenticated: false };
  }

  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        for (const { name, value } of items) request.cookies.set(name, value);
        response = NextResponse.next({ request, headers: responseHeaders });
        for (const { name, value, options } of items) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await client.auth.getClaims();
  return { response, authenticated: typeof data?.claims.sub === "string" };
}

export async function proxy(request: NextRequest) {
  let pathname: string;
  try {
    pathname = normalizeLockPath(request.nextUrl.pathname);
  } catch {
    return gate(400, "الرابط غير صالح.");
  }

  try {
    if (pathname === lockSettingsPath) return await settings(request);
    if (pathname === "/student/profile") return NextResponse.redirect(new URL("/account?portal=student", request.url));
    if (portalPath.test(pathname) && !liveDashboardPaths.has(pathname)) {
      const destination = new URL("/account", request.url);
      destination.searchParams.set("message", "section-unavailable");
      destination.searchParams.set("portal", pathname.split("/")[1]);
      return NextResponse.redirect(destination);
    }
    if (["/account", "/account/callback", "/login", "/register", "/reset-password", "/teachers/apply", "/teachers/track", "/dashboards"].includes(pathname)) {
      return (await continueRequest(request)).response;
    }

    // Portal routes enforce their own account and role checks.
    const lock = await getRequestLock(pathname, !portalPath.test(pathname));
    if (!lock || hasSiteSession(request.cookies.get(lockCookie(lock.scope))?.value, lock.key)) {
      return (await continueRequest(request)).response;
    }

    // Account holders can use the catalog and teacher profiles while the landing page is locked.
    if (lock.scope === "*" && /^\/(?:courses|teachers)(?:\/|$)/.test(pathname) && !await getRequestLock(pathname, false)) {
      const account = await continueRequest(request, true);
      if (account.authenticated) return account.response;
    }

    if (request.method !== "POST") return gate(401, "أدخل الكود اللي وصلك عشان تفتح الصفحة.");
    const fields = await readForm(request);
    if (!fields || !await matchesLockCode(fields.get("code") ?? "", lock)) {
      return gate(403, "الكود غير صحيح. جرّب تاني.");
    }
    return unlock(request, lockCookie(lock.scope), lock.key);
  } catch (error) {
    console.error("Unable to load or update site locks", error);
    return gate(503, "الدخول غير متاح حاليًا.");
  }
}

// Public framework bundles are also needed by login and authenticated portals under a global lock.
export const config = { matcher: "/((?!_next/static/).*)" };
