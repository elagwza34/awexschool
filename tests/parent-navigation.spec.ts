import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { parentSections } from "../src/features/dashboards/parent-navigation";

for (const width of [375, 768, 1440]) {
  test(`parent sections use separate pages and horizontal navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/parent");
    await page.getByRole("button", { name: "سلمى أحمد", exact: true }).click();
    const nav = page.getByRole("navigation", { name: "أقسام لوحة ولي الأمر" });
    for (const section of parentSections) {
      await nav.getByRole("link", { name: section.label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${section.href}$`));
      await expect(
        nav.getByRole("link", { name: section.label, exact: true }),
      ).toHaveAttribute("aria-current", "page");
      if (section.id !== "courses" && section.id !== "admin-chat")
        await expect(
          page.getByRole("button", { name: "سلمى أحمد", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("aside")).toHaveCount(0);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await expect(page.locator("#courses")).toHaveCount(0);
      await expect(page.locator("#schedule")).toHaveCount(
        section.id === "schedule" ? 1 : 0,
      );
      if (section.id === "courses") {
        await expect(
          page.getByRole("group", { name: "اختيار الابن" }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("heading", { name: "سلمى أحمد", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "يوسف أحمد", exact: true }),
        ).toBeVisible();
        await page.getByRole("link", { name: /سلمى أحمد/ }).click();
        await expect(page).toHaveURL(/\/parent\/courses\/salma$/);
        await expect(
          page.getByRole("heading", { name: "أصدقاء الأرقام", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", {
            name: "الرياضيات.. افهمها بطريقتك",
            exact: true,
          }),
        ).toHaveCount(0);
        await expect(
          nav.getByRole("link", { name: section.label, exact: true }),
        ).toHaveAttribute("aria-current", "page");
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        await page
          .getByRole("link", { name: "كل الأبناء", exact: true })
          .click();
        await expect(page.locator("#courses")).toHaveCount(0);
      }
    }
    await page.goBack();
    await expect(page).toHaveURL(/\/parent\/assignments$/);
    expect(errors).toEqual([]);
  });
}

test("parent routes render directly and pass accessibility checks", async ({
  page,
}) => {
  for (const href of [
    ...parentSections.map((section) => section.href),
    "/parent/courses/youssef",
    "/parent/courses/salma",
  ]) {
    expect((await page.goto(href))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  expect((await page.goto("/parent/courses/unknown-child"))?.status()).toBe(
    404,
  );
});
