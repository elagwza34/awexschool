import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const chatRoutes = [
  "/student/chat",
  "/student/admin-chat",
  "/teacher/chat",
  "/teacher/admin-chat",
  "/parent/admin-chat",
  "/admin/chat",
];

test("guest chat routes require authentication and expose no chat controls", async ({ page }) => {
  const effects: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() !== "GET" ||
      /\/api\/chat-attachment(?:\/|$)|\/rest\/v1\/rpc\/send_direct_chat|supabase/i.test(request.url())
    ) {
      effects.push(`${request.method()} ${request.url()}`);
    }
  });

  for (const path of chatRoutes) {
    await page.goto(path);
    await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("next") === path);
    await expect(page.getByRole("heading", { name: "تسجيل الدخول", exact: true })).toBeVisible();
    await expect(page.getByLabel("رسالتك", { exact: true })).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "إرسال في المعاينة", exact: true })).toHaveCount(0);
    await expect(page.getByText("الشات للعرض فقط حاليًا؛ الإرسال والمرفقات غير متاحين.", { exact: true })).toHaveCount(0);
  }

  expect(effects).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test("chat attachment requests cannot create or retrieve files", async ({ request }) => {
  const download = await request.get("/api/chat-attachment");
  expect(download.status()).toBe(404);

  const upload = await request.post("/api/chat-attachment", {
    multipart: {
      file: { name: "containment.txt", mimeType: "text/plain", buffer: Buffer.from("must not be stored") },
    },
  });
  expect([404, 405]).toContain(upload.status());
  expect(upload.headers()["location"]).toBeUndefined();
  expect(await upload.text()).not.toMatch(/supabase|service[_-]?role|storage/i);
});

for (const width of [375, 768, 1440]) {
  test(`guest chat denial remains responsive and accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    for (const path of ["/student/chat", "/teacher/chat"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "تسجيل الدخول", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(width);
      const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(
        scan.violations,
        JSON.stringify(scan.violations.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => node.target),
        }))),
      ).toEqual([]);
    }

    expect(errors).toEqual([]);
  });
}
