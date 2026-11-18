import { expect, test } from "@playwright/test";

test("shared application style uses small radii and underline navigation across roles", async ({
  page,
}) => {
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const role of [
      "student",
      "teacher",
      "parent",
      "admin",
      "manager",
      "support",
      "customer-service",
    ]) {
      await page.goto(`/${role}`);
      const current = page.locator('nav a[aria-current="page"]');
      const style = await current.evaluate((element) => {
        const value = getComputedStyle(element);
        return {
          radius: value.borderRadius,
          border: value.borderBottomWidth,
          background: value.backgroundColor,
        };
      });
      expect(style.radius).toBe("0px");
      expect(style.border).toBe("2px");
      expect(style.background).toBe("rgba(0, 0, 0, 0)");
      const card = page.locator(".soft-card").first();
      if (await card.count())
        expect(
          await card.evaluate(
            (element) => getComputedStyle(element).borderRadius,
          ),
        ).toBe("8px");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  }
  await page.goto("/admin/team");
  const button = page.getByRole("button", {
    name: "إضافة عضو للإدارة",
    exact: true,
  });
  expect(
    await button.evaluate((element) => getComputedStyle(element).borderRadius),
  ).toBe("6px");
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
