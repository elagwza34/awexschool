import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { defaultPermission, permissionSections } from "../src/features/dashboards/permissions";

const studentSections = permissionSections("student").filter(({ id }) => defaultPermission("student", `page:${id}`));

for (const width of [375, 768, 1440]) {
  test(`student sections are independent pages with horizontal navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const section of studentSections) {
      expect((await page.goto(section.href))?.status()).toBe(200);
      await expect(page.locator("aside")).toHaveCount(0);
      await expect(
        page.getByRole("navigation", { name: "القائمة الجانبية", exact: true }),
      ).toHaveCount(0);
      const nav = page.getByRole("navigation", { name: "أقسام لوحة الطالب" });
      await expect(nav.getByRole("link")).toHaveCount(studentSections.length);
      await expect(
        nav.getByRole("link", { name: section.label, exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        nav.getByRole("link", { name: section.label, exact: true }),
      ).toBeInViewport();
      const boxes = await nav
        .getByRole("link")
        .evaluateAll((links) =>
          links.map((link) => link.getBoundingClientRect().top),
        );
      expect(new Set(boxes).size).toBe(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        section.href,
      ).toBeLessThanOrEqual(width);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (section.id !== "overview")
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          section.label,
        );
    }
    expect(errors).toEqual([]);
  });
}

test("student links, browser history and section-only content work", async ({
  page,
}) => {
  await page.goto("/student");
  const nav = page.getByRole("navigation", { name: "أقسام لوحة الطالب" });
  await expect(
    page.getByRole("heading", { name: "خطواتك خلال الأسبوع", exact: true }),
  ).toHaveCount(0);
  await nav.getByRole("link", { name: "مقرراتي", exact: true }).click();
  await expect(page).toHaveURL(/student\/courses$/);
  await expect(page.locator("article")).toHaveCount(3);
  await nav.getByRole("link", { name: "التقدّم والنشاط", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "خطواتك خلال الأسبوع", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "كالندر الحصص", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("فترة النشاط").selectOption("previous");
  await page.goBack();
  await expect(page).toHaveURL(/student\/courses$/);
  await expect(
    nav.getByRole("link", { name: "مقرراتي", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "الجدول الأسبوعي", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "كالندر الحصص", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "الجدول الأسبوعي",
  );
});

test("student page accessibility remains valid", async ({ page }) => {
  for (const section of studentSections) {
    await page.goto(section.href);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      scan.violations,
      `${section.href}: ${JSON.stringify(scan.violations.map((v) => v.id))}`,
    ).toEqual([]);
  }
});
