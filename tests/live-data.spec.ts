import { expect, test } from "@playwright/test";

test("unconfigured public catalog and groups retain explicit preview empty states", async ({ page }) => {
  await page.goto("/courses");
  await expect(page.getByText("لا توجد مقررات منشورة حاليًا.", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);

  await page.goto("/groups");
  await expect(page.getByText("لا توجد مجموعات منشورة حاليًا.", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("unconfigured course detail remains unavailable instead of showing fixture data", async ({ request }) => {
  const response = await request.get("/courses/math-prep-1");
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain("أصدقاء الأرقام");
});
