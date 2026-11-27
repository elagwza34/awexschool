import { expect, test } from "@playwright/test";

test("the original pricing disclosure opens and closes", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "عرض تفاصيل النموذج" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("unconfigured hierarchy routes show errors instead of fixture records", async ({ page }) => {
  for (const path of ["/stages", "/stages/preparatory", "/grades/preparatory-1", "/subjects", "/subjects/math"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  }
});

test("the original catalog search route preserves filters and distinguishes unavailable data", async ({ page }) => {
  await page.goto("/search?q=math");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("searchbox")).toHaveValue("math");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("تعذّر تحميل بيانات المقررات");
  await page.getByRole("searchbox").fill("algebra");
  await page.getByRole("button", { name: "تطبيق" }).click();
  await expect(page).toHaveURL((url) =>
    url.pathname === "/search" && url.searchParams.get("q") === "algebra",
  );
});

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

test("failed enrollment submissions return visible feedback on the catalog", async ({ page }) => {
  await page.goto("/courses?enrollment=unavailable");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("تعذّر إرسال طلب الالتحاق حاليًا.");
});
