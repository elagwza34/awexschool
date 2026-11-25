import { expect, test } from "@playwright/test";

const reference = "11111111-1111-4111-8111-111111111111";

test("teacher application requires an authenticated student or parent account", async ({ page }) => {
  await page.goto("/teachers/apply");

  await expect(page.getByRole("heading", { name: "انضم كمدرس", exact: true })).toBeVisible();
  await expect(page.getByText("سجّل الدخول بحساب طالب أو ولي أمر نشط لإرسال طلب الانضمام.")).toBeVisible();
  await expect(page.getByLabel("البريد الإلكتروني", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "إرسال طلب الانضمام" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "متابعة طلب تقديم", exact: true })).toBeVisible();
});

test("tracking fails closed without CAPTCHA configuration and never resolves a bare UUID", async ({ page }) => {
  await page.goto(`/teachers/track?reference=${reference}`);

  await expect(page.getByRole("heading", { name: "متابعة طلب تقديم مدرس" })).toBeVisible();
  await expect(page.getByText("متابعة الطلبات غير متاحة حاليًا.")).toBeVisible();
  await expect(page.getByRole("button", { name: "عرض حالة الطلب" })).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByText("الطلب غير موجود أو رقم المتابعة غير صحيح.")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "انضم كمدرس", exact: true })).toBeVisible();
});

test("teacher intake keeps the Arabic RTL shell and application navigation", async ({ page }) => {
  await page.goto("/teachers/apply");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("link", { name: "متابعة طلب تقديم", exact: true }).click();
  await expect(page).toHaveURL(/\/teachers\/track$/);
});
