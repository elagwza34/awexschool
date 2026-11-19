import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { adminSections } from "../src/features/dashboards/admin-navigation";

for (const width of [375, 768, 1440]) {
  test(`admin uses horizontal route navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/admin");
    const nav = page.getByRole("navigation", {
      name: "أقسام لوحة الإدارة",
      exact: true,
    });
    for (const section of adminSections) {
      await nav.getByRole("link", { name: section.label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${section.href}$`));
      const active = nav.getByRole("link", {
        name: section.label,
        exact: true,
      });
      await expect(active).toHaveAttribute("aria-current", "page");
      await expect(active).toBeInViewport();
      await expect(page.locator("aside")).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      const rows = await nav
        .getByRole("link")
        .evaluateAll((links) =>
          links.map((link) => link.getBoundingClientRect().top),
        );
      expect(new Set(rows).size).toBe(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await expect(page.locator("#schedule")).toHaveCount(
        section.id === "schedule" ? 1 : 0,
      );
    }
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${adminSections.at(-2)!.href}$`));
    expect(errors).toEqual([]);
  });
}

test("new admin section routes render directly and pass accessibility checks", async ({
  page,
}) => {
  for (const href of ["/admin/schedule"]) {
    expect((await page.goto(href))?.status()).toBe(200);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  }
});
