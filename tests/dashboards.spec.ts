import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const roles = ["student", "teacher", "parent", "admin"];

for (const width of [375, 768, 1440]) {
  test(`dashboard routes, RTL, and responsive layout at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    for (const role of roles) {
      expect((await page.goto(`/${role}`))?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("main")).toHaveCount(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await expect(
        page.getByLabel("تبديل اللوحة", { exact: true }),
      ).toHaveValue(role);
    }
    expect(errors).toEqual([]);
  });
}

test("student top navigation, role switch, notifications and public links work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/student");
  await expect(
    page.getByRole("button", { name: "فتح قائمة اللوحة" }),
  ).toHaveCount(0);
  await expect(page.locator("aside")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "أقسام لوحة الطالب" })
    .getByRole("link", { name: "مقرراتي" })
    .click();
  await expect(page).toHaveURL(/student\/courses/);
  await expect(
    page.getByRole("heading", { name: "مقرراتي", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "معاينة الإشعارات" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "لا توجد رسائل أو إشعارات حقيقية",
  );
  await page.keyboard.press("Escape");
  await page
    .getByLabel("تبديل اللوحة", { exact: true })
    .selectOption("teacher");
  await expect(page).toHaveURL(/\/teacher$/);
  await page
    .getByRole("navigation", { name: "أقسام لوحة المدرس", exact: true })
    .getByRole("link", { name: "مقرراتي", exact: true })
    .click();
  await page.getByRole("link", { name: "معاينة المقرر" }).first().click();
  await expect(page).toHaveURL(/teacher\/learn\/math-prep-1/);
});

test("parent child selection changes courses, metrics and activity", async ({
  page,
}) => {
  await page.goto("/parent/courses");
  await page.getByRole("link", { name: /يوسف أحمد/ }).click();
  await expect(
    page.getByRole("heading", { name: "خطوات يوسف أحمد في المقررات" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "كل الأبناء", exact: true }).click();
  await page.getByRole("link", { name: /سلمى أحمد/ }).click();
  await expect(
    page.getByRole("heading", { name: "خطوات سلمى أحمد في المقررات" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "أصدقاء الأرقام", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "الرياضيات.. افهمها بطريقتك" }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "أقسام لوحة ولي الأمر" })
    .getByRole("link", { name: "التقدّم والنشاط", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "وقت تعلّم سلمى أحمد" }),
  ).toBeVisible();
  await page.getByLabel("فترة النشاط").selectOption("previous");
  await expect(page.getByLabel("فترة النشاط")).toHaveValue("previous");
});

test("admin search, content tabs and demo actions remain local", async ({
  page,
}) => {
  await page.goto("/admin/users");
  await expect(page.getByRole("tab")).toHaveText([
    "طالب",
    "ولي أمر",
    "مدرس",
    "إدارة",
  ]);
  const posts: string[] = [];
  const external: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST") posts.push(req.url());
    if (!req.url().startsWith("http://127.0.0.1:3100"))
      external.push(req.url());
  });
  await page.getByLabel("ابحث في مستخدمي المعاينة").fill("سلمى");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "عرض", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("لا يوجد حساب حقيقي");
  await page.keyboard.press("Escape");
  for (const [role, count, person] of [
    ["طالب", 3, "يوسف أحمد"],
    ["ولي أمر", 1, "أحمد محمود"],
    ["مدرس", 6, "أحمد حسن"],
    ["إدارة", 1, "سارة علي"],
  ] as const) {
    await page.getByRole("tab", { name: role, exact: true }).click();
    if (role === "طالب")
      await page.getByLabel("ابحث في مستخدمي المعاينة").fill("");
    await expect(page.locator("tbody tr")).toHaveCount(count);
    await expect(page.locator("tbody")).toContainText(person);
  }
  await expect(
    page.getByRole("tab", { name: "مراجعة المحتوى", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "معاينة إضافة مستخدم" }).click();
  await expect(page.getByRole("dialog")).toContainText("لا يتم إنشاء مستخدم");
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "أقسام لوحة الإدارة", exact: true })
    .getByRole("link", { name: "إدارة المحتوى", exact: true })
    .click();
  await expect(page).toHaveURL(/admin\/content/);
  await expect(page.locator("article[data-content-id]")).toHaveCount(8);
  await page.getByLabel("حالة المحتوى", { exact: true }).selectOption("review");
  await expect(page.locator("article[data-content-id]")).toHaveCount(0);
  await expect(page.getByLabel("ابحث في مستخدمي المعاينة")).toHaveCount(0);
  expect(posts).toEqual([]);
  expect(external).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
});

test("all dashboard roles pass automated accessibility checks", async ({
  page,
}) => {
  for (const role of roles) {
    await page.goto(`/${role}`);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations,
      `${role}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
  }
});
