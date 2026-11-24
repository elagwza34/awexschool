import { expect, test } from "@playwright/test";

test("unconfigured public catalog and groups report unavailable data instead of successful empty states", async ({ page }) => {
  await page.goto("/courses");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("تعذّر تحميل بيانات المقررات حاليًا.");
  await expect(page.getByText("لا توجد مقررات منشورة حاليًا.", { exact: true })).toHaveCount(0);

  await page.goto("/groups");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("تعذّر تحميل المجموعات حاليًا.");
  await expect(page.getByText("لا توجد مجموعات منشورة حاليًا.", { exact: true })).toHaveCount(0);
});

test("unconfigured course detail remains unavailable instead of showing fixture data", async ({ request }) => {
  const response = await request.get("/courses/math-prep-1");
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain("أصدقاء الأرقام");
});
