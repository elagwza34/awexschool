import { isIP } from "node:net";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { liveDashboardPaths } from "@/features/auth/dashboard-roles";
import { routeAccessRedirect, sessionVerificationMode, type SessionVerificationMode } from "@/features/auth/route-access";
import { redirectWithCookies } from "@/features/auth/proxy-response";
import { readSupabaseEnvironment } from "@/lib/environment";
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
  verifyLockAttempt,
  withLockVerification,
} from "./lib/site-access";

const headers = {
  "Cache-Control": "private, no-store",
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": "default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; img-src 'self' data: https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

const portalPath = /^\/(?:admin|manager|support|customer-service|teacher|student|parent|workspace)(?:\/|$)/;
const globalLockExemptPaths = new Set([
  "/login", "/register", "/account", "/account/callback", "/reset-password",
  "/teachers/apply", "/teachers/track", "/dashboards",
]);

function lockClient(request: NextRequest) {
  const secret = process.env.LIVESCHOOL_TRUSTED_PROXY_SECRET;
  const supplied = request.headers.get("x-liveschool-proxy-secret");
  const trustedProxies = new Set((process.env.LIVESCHOOL_TRUSTED_PROXY_IPS ?? "")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
  if (!secret || !supplied || !matchesSiteCode(supplied, secret) || !trustedProxies.size) return "unknown";
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()) ?? [];
  if (!forwarded.length || forwarded.length > 30 || forwarded.some((value) => !isIP(value))) return "unknown";
  let clientIndex = forwarded.length - 1;
  while (clientIndex >= 0 && trustedProxies.has(forwarded[clientIndex]!.toLowerCase())) clientIndex -= 1;
  if (clientIndex < 0 || clientIndex === forwarded.length - 1) return "unknown";
  return forwarded[clientIndex]!.toLowerCase();
}

function throttled(owner = false) {
  const response = gate(429, owner
    ? "محاولات كثيرة. انتظر 15 دقيقة قبل المحاولة تاني."
    : "محاولات كثيرة. انتظر 15 دقيقة قبل المحاولة تاني.", owner);
  response.headers.set("Retry-After", "900");
  return response;
}

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
  const declaredLength = request.headers.get("content-length");
  const contentType = request.headers.get("content-type")?.split(";")[0];
  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    contentType !== "application/x-www-form-urlencoded" ||
    (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) < 1 || Number(declaredLength) > 2048)) ||
    (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")
  ) {
    return undefined;
  }
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > 2048) return undefined;
  return new URLSearchParams(body);
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
    if (!fields) return gate(403, "طلب غير صالح.", true);
    const subject = `owner:${lockClient(request)}`;
    const matched = await verifyLockAttempt(subject, () => matchesSiteCode(fields.get("code") ?? "", secret));
    if (matched === null) return throttled(true);
    if (!matched) return gate(403, "كود إدارة الأقفال غير صحيح.", true);
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

async function continueRequest(request: NextRequest, verification: SessionVerificationMode = "none") {
  const responseHeaders = { "Cache-Control": "private, no-store", "CDN-Cache-Control": "no-store" };
  let response = NextResponse.next({ request, headers: responseHeaders });
  const config = readSupabaseEnvironment();
  if (!config) {
    return { response, authenticated: false, roles: [] as string[] };
  }

  const client = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        for (const { name, value } of items) request.cookies.set(name, value);
        response = NextResponse.next({ request, headers: responseHeaders });
        for (const { name, value, options } of items) response.cookies.set(name, value, options);
      },
    },
  });
  const { data: { session } } = await client.auth.getSession();
  if (!session || verification === "none") return { response, authenticated: false, roles: [] as string[] };
  const { data: { user } } = await client.auth.getUser();
  let roles: string[] = [];
  if (user && verification === "roles") {
    const result = await client.from("account_roles").select("role_code").eq("user_id", user.id);
    roles = result.error ? [] : result.data.map(({ role_code }) => role_code);
  }
  return { response, authenticated: Boolean(user), roles };
}

async function continueRoutedRequest(request: NextRequest, pathname: string) {
  if (pathname === "/student/profile") {
    const access = await continueRequest(request);
    return redirectWithCookies(request, "/account?portal=student", access.response);
  }
  if (portalPath.test(pathname) && !liveDashboardPaths.has(pathname)) {
    const access = await continueRequest(request);
    const destination = new URL("/account", request.url);
    destination.searchParams.set("message", "section-unavailable");
    destination.searchParams.set("portal", pathname.split("/")[1]);
    return redirectWithCookies(request, `${destination.pathname}${destination.search}`, access.response);
  }
  if (pathname === "/login" || pathname === "/register") {
    const access = await continueRequest(request, "user");
    const destination = routeAccessRedirect(pathname, access);
    return destination ? redirectWithCookies(request, destination, access.response) : access.response;
  }
  if (globalLockExemptPaths.has(pathname)) return (await continueRequest(request)).response;
  const access = await continueRequest(request, sessionVerificationMode(pathname));
  const destination = routeAccessRedirect(pathname, access);
  return destination ? redirectWithCookies(request, destination, access.response) : access.response;
}

export async function proxy(request: NextRequest) {
  const maxBodyBytes = 1024 * 1024;
  const contentLength = request.headers.get("content-length");
  const mayHaveBody = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (mayHaveBody) {
    if (contentLength && (!/^\d+$/.test(contentLength) || BigInt(contentLength) > BigInt(maxBodyBytes))) {
      return screen(413, "طلب كبير جدًا", "حجم الطلب أكبر من الحد المسموح.", "");
    }
    try {
      if ((await request.clone().arrayBuffer()).byteLength > maxBodyBytes) {
        return screen(413, "طلب كبير جدًا", "حجم الطلب أكبر من الحد المسموح.", "");
      }
    } catch {
      return screen(413, "طلب كبير جدًا", "حجم الطلب أكبر من الحد المسموح.", "");
    }
  }

  let pathname: string;
  try {
    pathname = normalizeLockPath(request.nextUrl.pathname);
  } catch {
    return gate(400, "الرابط غير صالح.");
  }

  try {
    if (pathname === lockSettingsPath) return await settings(request);

    const [pathLock, globalLock] = await Promise.all([
      getRequestLock(pathname, false),
      getRequestLock("*"),
    ]);
    const globalExempt = Boolean(globalLock && globalLockExemptPaths.has(pathname));
    let globalAuthorized = !globalLock || globalExempt || hasSiteSession(
      request.cookies.get(lockCookie("*"))?.value,
      globalLock.key,
    );
    const pathAuthorized = !pathLock || hasSiteSession(
      request.cookies.get(lockCookie(pathLock.scope))?.value,
      pathLock.key,
    );
    if (globalAuthorized && pathAuthorized) return continueRoutedRequest(request, pathname);

    if (!globalAuthorized && globalLock && portalPath.test(pathname)) {
      const access = await continueRequest(request, sessionVerificationMode(pathname));
      if (access.authenticated) {
        globalAuthorized = true;
        if (pathAuthorized) {
          const destination = routeAccessRedirect(pathname, access);
          return destination ? redirectWithCookies(request, destination, access.response) : access.response;
        }
      }
    }

    if (!globalAuthorized && globalLock && /^\/(?:courses|teachers)(?:\/|$)/.test(pathname)) {
      const account = await continueRequest(request, "user");
      if (account.authenticated) {
        globalAuthorized = true;
        if (pathAuthorized) return account.response;
      }
    }

    if (globalAuthorized && pathAuthorized) return continueRoutedRequest(request, pathname);
    const lock = !globalAuthorized ? globalLock : pathLock;
    if (!lock) return continueRoutedRequest(request, pathname);
    if (request.method !== "POST") return gate(401, "أدخل الكود اللي وصلك عشان تفتح الصفحة.");
    const fields = await readForm(request);
    if (!fields) return gate(403, "طلب غير صالح.");
    const subject = `visitor:${lockClient(request)}:${lock.scope}`;
    const matched = await withLockVerification(() =>
      verifyLockAttempt(subject, () => matchesLockCode(fields.get("code") ?? "", lock)),
    );
    if (matched === null) return throttled();
    if (!matched) return gate(403, "الكود غير صحيح. جرّب تاني.");
    return unlock(request, lockCookie(lock.scope), lock.key);
  } catch (error) {
    console.error("Unable to load or update site locks", error);
    return gate(503, "الدخول غير متاح حاليًا.");
  }
}

// Public framework bundles are also needed by login and authenticated portals under a global lock.
export const config = { matcher: "/((?!_next/static/).*)" };
