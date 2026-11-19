import { expect, test } from "@playwright/test";

test("visitor technical complaint goes to support and stays out of customer service", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "قدّم شكوى أو طلب" }).click();
  await page.getByLabel("اسمك", { exact: true }).fill("زائر التجربة");
  await page.getByLabel("البريد الإلكتروني").fill("visitor@example.com");
  await page.getByRole("combobox", { name: "نوع الطلب" }).selectOption("technical");
  await page.getByLabel("عنوان الطلب").fill("عطل في فيديو المراجعة");
  await page.getByLabel("تفاصيل الطلب").fill("الفيديو لا يبدأ عند فتح الدرس.");
  await page.getByRole("button", { name: "إرسال الطلب في المعاينة" }).click();
  await expect(page.getByRole("status")).toContainText("الدعم الفني");
  await page.getByRole("link", { name: "لوحات التحكم", exact: true }).last().click();
  await page.locator('a[href="/support"]').click();
  await page.locator('nav a[href="/support/requests"]').click();
  await expect(page.getByRole("heading", { name: "عطل في فيديو المراجعة" })).toBeVisible();
  await page.getByLabel("تبديل اللوحة").selectOption("customer-service");
  await page.locator('nav a[href="/customer-service/requests"]').click();
  await expect(page.getByRole("heading", { name: "عطل في فيديو المراجعة" })).toHaveCount(0);
});

test("parent can see a customer service status update from their dashboard", async ({ page }) => {
  await page.goto("/parent");
  await page.getByRole("link", { name: "قدّم شكوى أو طلب" }).click();
  await page.getByRole("combobox", { name: "نوع الطلب" }).selectOption("complaint");
  await page.getByLabel("عنوان الطلب").fill("طلب مراجعة المجموعة");
  await page.getByLabel("تفاصيل الطلب").fill("أحتاج مراجعة اختيار مجموعة ابني.");
  await page.getByRole("button", { name: "إرسال الطلب في المعاينة" }).click();
  await expect(page.getByRole("status")).toContainText("خدمة العملاء");
  await page.getByLabel("تبديل اللوحة").selectOption("customer-service");
  await page.locator('nav a[href="/customer-service/requests"]').click();
  const ticket = page.getByRole("article").filter({ hasText: "طلب مراجعة المجموعة" });
  await ticket.getByRole("combobox").selectOption("in-progress");
  await page.getByLabel("تبديل اللوحة").selectOption("parent");
  await page.getByRole("link", { name: "قدّم شكوى أو طلب" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "طلب مراجعة المجموعة" })).toContainText("قيد المتابعة");
});

test("student request is attributed to their preview account and kept out of parent history", async ({ page }) => {
  await page.goto("/student");
  await page.getByRole("link", { name: "قدّم شكوى أو طلب" }).click();
  await page.getByRole("combobox", { name: "نوع الطلب" }).selectOption("inquiry");
  await page.getByLabel("عنوان الطلب").fill("استفسار عن جدول المراجعة");
  await page.getByLabel("تفاصيل الطلب").fill("عايز أعرف موعد المجموعة المتاحة للمراجعة.");
  await page.getByRole("button", { name: "إرسال الطلب في المعاينة" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "استفسار عن جدول المراجعة" })).toContainText("جديد");
  await page.getByLabel("تبديل اللوحة").selectOption("parent");
  await page.getByRole("link", { name: "قدّم شكوى أو طلب" }).click();
  await expect(page.getByText("استفسار عن جدول المراجعة", { exact: true })).toHaveCount(0);
});
