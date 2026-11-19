import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { defaultPermission, permissionSections } from "../src/features/dashboards/permissions";

const teacherSections = permissionSections("teacher").filter(({ id }) => defaultPermission("teacher", `page:${id}`));

for (const width of [375, 768, 1440]) {
  test(`teacher pages use horizontal top navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const section of teacherSections) {
      expect((await page.goto(section.href))?.status()).toBe(200);
      await expect(
        page.getByRole("navigation", { name: "القائمة الجانبية", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "فتح قائمة اللوحة", exact: true }),
      ).toHaveCount(0);
      const nav = page.getByRole("navigation", {
        name: "أقسام لوحة المدرس",
        exact: true,
      });
      await expect(nav.getByRole("link")).toHaveCount(teacherSections.length);
      const active = nav.getByRole("link", {
        name: section.label,
        exact: true,
      });
      await expect(active).toHaveAttribute("aria-current", "page");
      await expect(active).toBeInViewport();
      const positions = await nav
        .getByRole("link")
        .evaluateAll((links) =>
          links.map((link) => link.getBoundingClientRect().top),
        );
      expect(new Set(positions).size).toBe(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        section.href,
      ).toBeLessThanOrEqual(width);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

test("teacher sections navigate independently and preserve browser history", async ({
  page,
}) => {
  await page.goto("/teacher");
  await expect(
    page.getByRole("heading", { name: "أعمال تنتظر نظرتك", exact: true }),
  ).toHaveCount(0);
  const nav = page.getByRole("navigation", {
    name: "أقسام لوحة المدرس",
    exact: true,
  });
  await nav.getByRole("link", { name: "مقرراتي", exact: true }).click();
  await expect(page).toHaveURL(/teacher\/courses$/);
  await expect(
    page.getByRole("link", { name: "معاينة المقرر", exact: true }),
  ).toHaveCount(2);
  await nav.getByRole("link", { name: "أعمال للمراجعة", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "أعمال تنتظر نظرتك", exact: true }),
  ).toBeVisible();
  await page.getByLabel("حالة المراجعة", { exact: true }).selectOption("done");
  await expect(
    page.getByRole("heading", {
      name: "لا توجد عناصر بهذه الحالة",
      exact: true,
    }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/teacher\/courses$/);
  await expect(
    nav.getByRole("link", { name: "مقرراتي", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "الجدول الأسبوعي", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "كالندر الحصص", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    nav.getByRole("link", { name: "الجدول الأسبوعي", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("new teacher section pages pass accessibility checks", async ({
  page,
}) => {
  for (const path of [
    "/teacher",
    "/teacher/courses",
    "/teacher/schedule",
    "/teacher/progress",
    "/teacher/reviews",
  ]) {
    await page.goto(path);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      scan.violations,
      `${path}: ${JSON.stringify(scan.violations.map((v) => v.id))}`,
    ).toEqual([]);
  }
});
