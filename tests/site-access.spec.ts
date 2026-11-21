import { expect, test, type Page } from "@playwright/test";
import { createSiteSession, hasSiteSession, lockCookie } from "../src/lib/site-access";

const settingsPath = "/admin/site-locks";
const ownerCode = "local-playwright-owner-code";
const pageCode = "local-teachers-page-code";
const globalCode = "local-whole-site-code";

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
    await page.goto("/admin");
    await page.getByRole("link", { name: "أقفال الموقع" }).click();
    await expect(page).toHaveURL(settingsPath);
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
    for (const path of ["/", "/teachers", "/student", "/school-home/motion.js"]) {
      const response = await guest.request.get(path);
      expect(response.status(), path).toBe(401);
      expect(response.headers()["cache-control"]).toContain("no-store");
    }
    await visitor.goto("/stages/primary");
    await enterCode(visitor, globalCode);
    await expect(visitor.getByRole("heading", { level: 1 })).toContainText("المرحلة الابتدائية");
    const protectedPage = await visitor.goto("/teachers");
    expect(protectedPage?.status()).toBe(200);
    expect(protectedPage?.headers()["cache-control"]).toContain("no-store");
    expect((await guest.request.get("/school-home/motion.js")).status()).toBe(200);
  } finally {
    await page.request.post(settingsPath, { form: { action: "remove", scope: "*" } });
    await page.request.post(settingsPath, { form: { action: "remove", scope: "/teachers" } });
    await guest.close();
  }
  expect((await page.request.get("/teachers")).status()).toBe(200);
});
