import { expect, test } from "@playwright/test";

test("a visitor can read the assigned team's response using the reference and email", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/contact");
  await page.getByLabel("اسمك").fill("زائر الاختبار");
  await page.getByLabel("البريد الإلكتروني").fill("visitor@example.com");
  await page.getByLabel("عنوان الطلب").fill("تشغيل الفيديو من الهاتف");
  await page.getByLabel("تفاصيل الطلب").fill("الفيديو يتوقف بعد بدء التشغيل على الهاتف.");
  await page.getByRole("button", { name: "إرسال الطلب في المعاينة" }).click();
  const reference = (await page.getByRole("status").locator("bdi").innerText()).trim();
  await page.getByRole("contentinfo").getByRole("link", { name: "لوحات التحكم", exact: true }).click();
  await page.locator('a[href="/support"]').click();
  await page.locator('nav a[href="/support/requests"]').click();
  const ticket = page.getByRole("article").filter({ hasText: "تشغيل الفيديو من الهاتف" });
  await ticket.getByLabel("رد الفريق").fill("جرّب فتح الحصة مرة تانية من صفحة المقررات.");
  await ticket.getByRole("button", { name: "إضافة الرد" }).click();
  await page.getByRole("link", { name: "liveschool — الرئيسية" }).click();
  await page.getByRole("contentinfo").getByRole("link", { name: "متابعة طلب" }).click();
  await page.getByLabel("رقم المتابعة").fill(reference);
  await page.getByLabel("البريد الإلكتروني").fill("wrong@example.com");
  await page.getByRole("button", { name: "عرض حالة الطلب" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("مفيش طلب مطابق");
  await page.getByLabel("البريد الإلكتروني").fill("visitor@example.com");
  await page.getByRole("button", { name: "عرض حالة الطلب" }).click();
  await expect(page.getByText("جرّب فتح الحصة مرة تانية من صفحة المقررات.")).toBeVisible();
});
