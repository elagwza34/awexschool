import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  staffRoles,
  staffSections,
} from "../src/features/dashboards/staff-data";

test("admin adds all staff roles, rejects duplicates and shares temporary team state", async ({
  page,
}) => {
  await page.goto("/admin/users");
  const effects: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" ||
      !request.url().startsWith("http://127.0.0.1:3100")
    )
      effects.push(request.url());
  });
  await page.getByRole("tab", { name: "إدارة", exact: true }).click();
  for (const role of staffRoles) {
    await page
      .getByRole("button", { name: "إضافة عضو للإدارة", exact: true })
      .click();
    await page
      .getByLabel("اسم العضو", { exact: true })
      .fill(`عضو ${role.label}`);
    await page
      .getByLabel("البريد الإلكتروني للعضو", { exact: true })
      .fill(`${role.id}-new@example.com`);
    await page.getByLabel("دور العضو", { exact: true }).selectOption(role.id);
    await page
      .getByRole("button", { name: "إضافة في المعاينة", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: `عضو ${role.label}`, exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "إضافة عضو للإدارة", exact: true })
    .click();
  await page.getByLabel("اسم العضو", { exact: true }).fill("اسم مكرر");
  await page
    .getByLabel("البريد الإلكتروني للعضو", { exact: true })
    .fill("MANAGER-NEW@example.com");
  await page
    .getByRole("button", { name: "إضافة في المعاينة", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "البريد مستخدم بالفعل في المعاينة.",
  );
  await page.keyboard.press("Escape");
  await page
    .getByLabel("تبديل اللوحة", { exact: true })
    .selectOption("manager");
  await page.locator('nav a[href="/manager/team"]').click();
  await expect(
    page.getByRole("heading", { name: "عضو مدير", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "إضافة عضو للإدارة", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("تصفية دور الفريق", { exact: true })
    .selectOption("support");
  await expect(page.locator("article")).toHaveCount(2);
  await page.getByLabel("البحث في الفريق", { exact: true }).fill("لايوجدxyz");
  await expect(page.getByText("لا يوجد أعضاء مطابقون.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "عضو مدير", exact: true }),
  ).toHaveCount(0);
  expect(effects).toEqual([]);
});

test("support updates requests and manager monitors changes", async ({
  page,
}) => {
  await page.goto("/support/requests");
  await expect(page.locator("article")).toHaveCount(2);
  await page
    .getByLabel("حالة TECH-101", { exact: true })
    .selectOption("resolved");
  await page.getByLabel("حالة الطلب", { exact: true }).selectOption("resolved");
  await expect(page.locator("article")).toHaveCount(1);
  await page.locator('nav a[href="/support/activity"]').click();
  await expect(
    page.getByText("TECH-101: تم الحل", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("تبديل اللوحة", { exact: true })
    .selectOption("manager");
  await page.locator('nav a[href="/manager/requests"]').click();
  await expect(page.locator("article")).toHaveCount(2);
  await expect(page.getByLabel("حالة TECH-101", { exact: true })).toHaveCount(
    0,
  );
  await page.locator('nav a[href="/manager/activity"]').click();
  await expect(
    page.getByText("TECH-101: تم الحل", { exact: true }),
  ).toBeVisible();
});

for (const width of [375, 768, 1440]) {
  test(`staff dashboards and team form are responsive and accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const role of staffRoles) {
      for (const section of staffSections(role.id)) {
        expect((await page.goto(section.href))?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("aside")).toHaveCount(0);
        await expect(
          page.locator('nav a[aria-current="page"]'),
        ).toHaveAttribute("href", section.href);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
      }
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
    }
    await page.goto("/admin/team");
    await page
      .getByRole("button", { name: "إضافة عضو للإدارة", exact: true })
      .click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}
