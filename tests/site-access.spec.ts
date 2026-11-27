import { expect, test, type Page } from "@playwright/test";
import { request as httpRequest } from "node:http";
import { createSiteSession, hasSiteSession, lockCookie } from "../src/lib/site-access";

const settingsPath = "/admin/site-locks";
const ownerCode = "local-playwright-owner-code";
const pageCode = "local-teachers-page-code";
const globalCode = "local-whole-site-code";
const proxyHeaders = {
  "x-liveschool-proxy-secret": "local-playwright-proxy-secret",
  "x-forwarded-for": "192.0.2.250, 10.0.0.1",
};

async function enterCode(page: Page, code: string) {
  await page.getByLabel("كود الدخول").fill(code);
  await page.getByRole("button", { name: "دخول" }).click();
}

async function save(page: Page, scope: string, code: string) {
  await page.getByLabel("مسار الصفحة أو *").fill(scope);
  await page.getByLabel("كود الزائر").fill(code);
  await page.getByRole("button", { name: "حفظ القفل" }).click();
  await expect(page.getByText(scope === "*" ? "الموقع بالكامل" : scope, { exact: true })).toBeVisible();
}

test("known oversized request bodies are rejected before route processing", async ({ browser, baseURL }) => {
  const guest = await browser.newContext({ baseURL });
  try {
    const response = await guest.request.post("/", { data: Buffer.alloc(1024 * 1024 + 1) });
    expect(response.status()).toBe(413);
  } finally {
    await guest.close();
  }
});

async function chunkedStatus(baseURL: string | undefined, path: string, body: string | Buffer) {
  return new Promise<number>((resolve, reject) => {
    const request = httpRequest(new URL(path, baseURL), {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "transfer-encoding": "chunked",
      },
    }, (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode ?? 0));
    });
    request.on("error", reject);
    request.end(body);
  });
}

test("small chunked request bodies remain usable without a declared length", async ({ baseURL }) => {
  const status = await chunkedStatus(baseURL, settingsPath, `code=${ownerCode}`);
  expect(status).toBe(303);
});

test("oversized chunked request bodies are rejected by actual byte size", async ({ baseURL }) => {
  const status = await chunkedStatus(baseURL, "/", Buffer.alloc(1024 * 1024 + 1, "a"));
  expect(status).toBe(413);
});

test("private sessions expire and rotating the key invalidates them", () => {
  const issued = Date.now();
  const token = createSiteSession(ownerCode, issued);
  expect(hasSiteSession(token, ownerCode, issued)).toBe(true);
  expect(hasSiteSession(token, globalCode, issued)).toBe(false);
  expect(hasSiteSession(token, ownerCode, issued + 8 * 60 * 60 * 1000)).toBe(false);
});

test("a global lock preserves framework assets for the public login page", async ({ page, request }) => {
  await page.goto(settingsPath);
  await enterCode(page, ownerCode);
  try {
    await save(page, "*", globalCode);
    expect((await request.get("/")).status()).toBe(401);

    const login = await request.get("/login");
    expect(login.ok()).toBe(true);
    const html = await login.text();
    for (const [extension, contentType] of [["css", "text/css"], ["js", "javascript"]] as const) {
      const asset = html.match(new RegExp(`"(/_next/static/[^"]+\\.${extension})"`))?.[1];
      expect(asset).toBeDefined();
      const response = await request.get(asset!);
      expect(response.ok(), asset).toBe(true);
      expect(response.headers()["content-type"]).toContain(contentType);
    }
  } finally {
    await page.request.post(settingsPath, { form: { action: "remove", scope: "*" } });
  }
});

test("the admin can lock a direct page, lock the entire site, and reopen both", async ({ page, browser, baseURL }) => {
  const guest = await browser.newContext({ baseURL });
  const visitor = await guest.newPage();
  try {
    expect((await guest.request.get("/teachers")).status()).toBe(200);
    expect((await guest.request.post(settingsPath, { form: { action: "save", scope: "*", code: globalCode } })).status()).toBe(403);
    await page.goto(settingsPath);
    await enterCode(page, ownerCode);
    await expect(page.getByRole("heading", { name: "الأقفال الحالية" })).toBeVisible();

    await save(page, "/teachers", pageCode);
    for (const path of ["/teachers", "/teachers?preview=1", "/teachers?_rsc=test", "/%74eachers"]) {
      expect((await guest.request.get(path, { headers: { RSC: "1" } })).status(), path).toBe(401);
    }
    expect((await guest.request.get("/stages")).status()).toBe(200);
    await visitor.goto("/teachers");
    await enterCode(visitor, "wrong-code");
    await expect(visitor.getByRole("alert")).toContainText("الكود غير صحيح");
    await enterCode(visitor, pageCode);
    await expect(visitor).toHaveURL("/teachers");
    await expect(visitor.getByLabel("كود الدخول")).toHaveCount(0);
    expect((await guest.cookies()).find((cookie) => cookie.name === lockCookie("/teachers")))
      .toMatchObject({ secure: true, httpOnly: true, sameSite: "Lax", path: "/" });

    await save(page, "*", globalCode);
    for (const path of ["/", "/student", "/school-home/motion.js"]) {
      const response = await guest.request.get(path);
      expect(response.status(), path).toBe(401);
      expect(response.headers()["cache-control"]).toContain("no-store");
    }
    expect((await guest.request.get("/teachers")).status()).toBe(401);
    await visitor.goto("/teachers");
    expect(await visitor.getByLabel("كود الدخول").count()).toBe(1);
    await enterCode(visitor, globalCode);
    await expect(visitor).toHaveURL("/teachers");
    await expect(visitor.getByLabel("كود الدخول")).toHaveCount(0);
    const globalContext = await browser.newContext({ baseURL });
    const globalVisitor = await globalContext.newPage();
    try {
      await globalVisitor.goto("/stages/primary");
      await enterCode(globalVisitor, globalCode);
      await expect(globalVisitor.getByRole("heading", { level: 1 })).toContainText("المرحلة الابتدائية");
      expect((await globalVisitor.goto("/teachers"))?.status()).toBe(401);
      await enterCode(globalVisitor, pageCode);
      await expect(globalVisitor).toHaveURL("/teachers");
    } finally {
      await globalContext.close();
    }
    const protectedPage = await visitor.goto("/teachers");
    expect(protectedPage?.status()).toBe(200);
    expect(protectedPage?.headers()["cache-control"]).toContain("no-store");
    expect((await page.request.get("/school-home/motion.js")).status()).toBe(401);
  } finally {
    await page.request.post(settingsPath, { form: { action: "remove", scope: "*" } });
    await page.request.post(settingsPath, { form: { action: "remove", scope: "/teachers" } });
    await guest.close();
  }
  expect((await page.request.get("/teachers")).status()).toBe(200);
});

test("explicit locks apply to routes exempt from the global lock", async ({ page, browser, baseURL }) => {
  const guest = await browser.newContext({ baseURL });
  try {
    await page.goto(settingsPath);
    await enterCode(page, ownerCode);
    await save(page, "/login", pageCode);
    expect((await guest.request.get("/login")).status()).toBe(401);
    await save(page, "*", globalCode);
    expect((await guest.request.get("/login")).status()).toBe(401);
    const unlocked = await guest.request.post("/login", { form: { code: pageCode }, maxRedirects: 0 });
    expect(unlocked.status()).toBe(303);
    expect((await guest.request.get("/login")).status()).toBe(200);
  } finally {
    await page.request.post(settingsPath, { form: { action: "remove", scope: "*" } });
    await page.request.post(settingsPath, { form: { action: "remove", scope: "/login" } });
    await guest.close();
  }
});

test("visitor lock guesses are persistently throttled", async ({ page, request }) => {
  const scope = "/teachers/phase02-throttle";
  try {
    await page.goto(settingsPath);
    await enterCode(page, ownerCode);
    await save(page, scope, pageCode);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await request.post(scope, { form: { code: "wrong-code" }, headers: proxyHeaders })).status()).toBe(403);
    }
    expect((await request.post(scope, { form: { code: "wrong-code" }, headers: proxyHeaders })).status()).toBe(429);
    expect((await request.post(scope, { form: { code: pageCode }, headers: proxyHeaders })).status()).toBe(429);
  } finally {
    await page.request.post(settingsPath, { form: { action: "remove", scope } });
  }
});

test("client-controlled forwarding entries cannot rotate the throttle identity", async ({ page, request }) => {
  const scope = "/teachers/phase02-forwarding";
  try {
    await page.goto(settingsPath);
    await enterCode(page, ownerCode);
    await save(page, scope, pageCode);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request.post(scope, {
        form: { code: "wrong-code" },
        headers: { ...proxyHeaders, "x-forwarded-for": `203.0.113.${attempt + 1}, 192.0.2.250, 10.0.0.1` },
      });
      expect(response.status()).toBe(403);
    }
    const blocked = await request.post(scope, {
      form: { code: "wrong-code" },
      headers: { ...proxyHeaders, "x-forwarded-for": "203.0.113.200, 192.0.2.250, 10.0.0.1" },
    });
    expect(blocked.status()).toBe(429);
  } finally {
    await page.request.post(settingsPath, { form: { action: "remove", scope } });
  }
});

test("owner lock guesses are persistently throttled", async ({ browser, baseURL }) => {
  const guest = await browser.newContext({ baseURL });
  const headers = { ...proxyHeaders, "x-forwarded-for": "192.0.2.251, 10.0.0.1" };
  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await guest.request.post(settingsPath, { form: { code: "wrong-owner-code" }, headers })).status()).toBe(403);
    }
    expect((await guest.request.post(settingsPath, { form: { code: "wrong-owner-code" }, headers })).status()).toBe(429);
    expect((await guest.request.post(settingsPath, { form: { code: ownerCode }, headers })).status()).toBe(429);
  } finally {
    await guest.close();
  }
});

test("concurrent owner guesses cannot bypass the attempt limit", async ({ browser, baseURL }) => {
  const guest = await browser.newContext({ baseURL });
  const headers = { ...proxyHeaders, "x-forwarded-for": "192.0.2.252, 10.0.0.1" };
  try {
    const statuses = await Promise.all(Array.from({ length: 20 }, () =>
      guest.request.post(settingsPath, { form: { code: "wrong-owner-code" }, headers }).then((response) => response.status()),
    ));
    expect(statuses.filter((status) => status === 403)).toHaveLength(10);
    expect(statuses.filter((status) => status === 429)).toHaveLength(10);
  } finally {
    await guest.close();
  }
});

test("successful owner verification refunds its admission attempt", async ({ browser, baseURL }) => {
  const guest = await browser.newContext({ baseURL });
  const headers = { ...proxyHeaders, "x-forwarded-for": "192.0.2.253, 10.0.0.1" };
  try {
    expect((await guest.request.post(settingsPath, { form: { code: ownerCode }, headers, maxRedirects: 0 })).status()).toBe(303);
    await guest.clearCookies();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await guest.request.post(settingsPath, { form: { code: "wrong-owner-code" }, headers })).status()).toBe(403);
    }
    expect((await guest.request.post(settingsPath, { form: { code: "wrong-owner-code" }, headers })).status()).toBe(429);
  } finally {
    await guest.close();
  }
});
