import { expect, test, type Page } from "@playwright/test";

async function fillTeacher(page: Page, email: string, name: string) {
  await page.getByLabel("الاسم الكامل", { exact: true }).fill(name);
  await page.getByLabel("اسم الظهور", { exact: true }).fill(name);
  await page.getByLabel("البريد الإلكتروني", { exact: true }).fill(email);
  await page.getByLabel("رقم الهاتف", { exact: true }).fill("01000000000");
  await page.getByLabel("المحافظة", { exact: true }).fill("القاهرة");
  await page.getByLabel("المؤهل", { exact: true }).fill("بكالوريوس تربية");
  await page.getByLabel("سنوات الخبرة", { exact: true }).fill("5");
  await page.getByRole("combobox", { name: "المادة", exact: true }).selectOption("math");
  await page.getByRole("checkbox", { name: "المرحلة الابتدائية", exact: true }).check();
  await page.getByRole("checkbox", { name: "الصف الأول الابتدائي", exact: true }).check();
  await page.getByLabel("نبذة عنك", { exact: true }).fill("أشرح الرياضيات بأمثلة من الحياة اليومية.");
  await page.getByLabel("طريقة الشرح", { exact: true }).fill("أمثلة تطبيقية وتمارين متدرجة.");
}

test("footer application without video reaches admin and becomes a teacher record", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "انضم إلينا كمدرس" }).click();
  await fillTeacher(page, "candidate@example.com", "مدرس من طلب التقديم");
  await page.getByRole("button", { name: "إرسال طلب الانضمام" }).click();
  await expect(page.getByRole("status")).toContainText("تم تسجيل طلبك");
  const reference = (await page.getByRole("status").locator("bdi").innerText()).trim();
  await page.getByRole("link", { name: "لوحات التحكم", exact: true }).last().click();
  await page.locator('a[href="/admin"]').click();
  await page.getByRole("navigation", { name: "أقسام لوحة الإدارة" }).getByRole("link", { name: "طلبات المدرسين" }).click();
  await page.locator("summary").filter({ hasText: "مدرس من طلب التقديم" }).click();
  await expect(page.getByText("بكالوريوس تربية", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "قبول وإضافة المدرس" }).click();
  await expect(page.locator("summary").filter({ hasText: "مدرس من طلب التقديم" })).toContainText("مقبول");
  await page.getByRole("navigation", { name: "أقسام لوحة الإدارة" }).getByRole("link", { name: "المستخدمون والأدوار" }).click();
  await page.getByRole("tab", { name: "مدرس", exact: true }).click();
  await expect(page.getByRole("row", { name: /مدرس من طلب التقديم/ })).toBeVisible();
  await page.getByRole("link", { name: "liveschool — الرئيسية" }).click();
  await page.getByRole("contentinfo").getByRole("link", { name: "انضم إلينا كمدرس" }).click();
  await page.getByRole("link", { name: "متابعة طلب انضمام مدرس" }).click();
  await page.getByLabel("رقم المتابعة").fill(reference);
  await page.getByLabel("البريد الإلكتروني").fill("candidate@example.com");
  await page.getByRole("button", { name: "عرض حالة الطلب" }).click();
  await expect(page.getByRole("status")).toContainText("مقبول");
});

test("admin adds a teacher through the same professional fields", async ({ page }) => {
  await page.goto("/admin/users");
  await page.getByRole("tab", { name: "مدرس", exact: true }).click();
  await page.getByRole("button", { name: "إضافة مستخدم", exact: true }).click();
  await fillTeacher(page, "direct@example.com", "مدرس من لوحة الإدارة");
  await page.getByRole("button", { name: "حفظ المدرس" }).click();
  const row = page.getByRole("row", { name: /مدرس من لوحة الإدارة/ });
  await row.getByText("الملف المهني", { exact: true }).click();
  await expect(row.getByText("بكالوريوس تربية", { exact: true })).toBeVisible();
});

test("invalid video reports an error and the application can be sent without it", async ({ page }) => {
  await page.goto("/teachers/apply");
  await page.getByLabel("فيديو شرح (اختياري)").setInputFiles({
    name: "invalid.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("invalid video"),
  });
  await expect(page.getByRole("main").getByRole("alert")).toContainText("تعذّر قراءة الفيديو");
  await fillTeacher(page, "without-video@example.com", "مدرس بدون فيديو");
  await page.getByRole("button", { name: "إرسال طلب الانضمام" }).click();
  await expect(page.getByRole("status")).toContainText("تم تسجيل طلبك");
});
