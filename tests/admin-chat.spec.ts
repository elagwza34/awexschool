import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  adminThreadsForRole,
  adminChatThreads,
} from "../src/features/dashboards/admin-chat-data";

test("admin conversations have explicit per-user membership", () => {
  expect(adminThreadsForRole("admin")).toHaveLength(adminChatThreads.length);
  for (const role of ["teacher", "student", "parent"] as const) {
    const threads = adminThreadsForRole(role);
    expect(threads).toHaveLength(1);
    expect(threads[0].role).toBe(role);
  }
  expect(new Set(adminChatThreads.map((thread) => thread.id)).size).toBe(
    adminChatThreads.length,
  );
});

for (const role of ["teacher", "student", "parent"] as const) {
  test(`admin and ${role} exchange isolated local messages`, async ({
    page,
  }) => {
    await page.goto("/admin/chat");
    const effects: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" ||
        !request.url().startsWith("http://127.0.0.1:3100")
      )
        effects.push(request.url());
    });
    const contacts = page.getByRole("list", { name: "قائمة محادثات الإدارة" });
    await page.getByLabel("نوع المستخدم", { exact: true }).selectOption(role);
    await expect(contacts.getByRole("button")).toHaveCount(
      adminChatThreads.filter((thread) => thread.role === role).length,
    );
    await contacts.getByRole("button").first().click();
    const message = `رسالة الإدارة إلى ${role}`;
    await page.getByLabel("رسالتك", { exact: true }).fill(message);
    await page
      .getByRole("button", { name: "إرسال في المعاينة", exact: true })
      .click();
    await page.getByLabel("تبديل اللوحة", { exact: true }).selectOption(role);
    await page.locator(`nav a[href="/${role}/admin-chat"]`).click();
    await expect(page.getByRole("log")).toContainText(message);
    await expect(
      page
        .getByRole("list", { name: "قائمة محادثات الإدارة" })
        .getByRole("button"),
    ).toHaveCount(1);
    const reply = `رد المستخدم ${role}`;
    await page.getByLabel("رسالتك", { exact: true }).fill(reply);
    await page
      .getByRole("button", { name: "إرسال في المعاينة", exact: true })
      .click();
    await page
      .getByLabel("تبديل اللوحة", { exact: true })
      .selectOption("admin");
    await page.locator('nav a[href="/admin/chat"]').click();
    await page.getByLabel("نوع المستخدم", { exact: true }).selectOption(role);
    await contacts.getByRole("button").first().click();
    await expect(page.getByRole("log")).toContainText(reply);
    await page
      .getByLabel("البحث في المحادثات", { exact: true })
      .fill("غيرموجودxyz");
    await expect(contacts.getByRole("button")).toHaveCount(0);
    await page.getByLabel("البحث في المحادثات", { exact: true }).fill("");
    if (role === "teacher") {
      await contacts.getByRole("button").nth(1).click();
      await expect(page.getByRole("log")).not.toContainText(message);
    }
    expect(effects).toEqual([]);
    await page.reload();
    await expect(page.getByRole("log")).not.toContainText(message);
  });
}

for (const width of [375, 768, 1440]) {
  test(`administration chat is responsive and accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const role of ["admin", "student", "teacher", "parent"]) {
      await page.goto(role === "admin" ? "/admin/chat" : `/${role}/admin-chat`);
      await page
        .getByRole("list", { name: "قائمة محادثات الإدارة" })
        .getByRole("button")
        .first()
        .click();
      await expect(page.getByRole("log")).toBeVisible();
      await expect(page.getByLabel("رسالتك", { exact: true })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
      if (width === 375) {
        await page
          .getByRole("button", { name: "رجوع للمحادثات", exact: true })
          .click();
        await expect(
          page.getByRole("list", { name: "قائمة محادثات الإدارة" }),
        ).toBeVisible();
      }
    }
    expect(errors).toEqual([]);
  });
}
