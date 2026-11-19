import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("delegated user creation saves a record and explains duplicate emails", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/owner");
  await page.getByLabel("الدور").selectOption("support");
  await page.getByRole("checkbox", { name: "المستخدمون والأدوار", exact: true }).check();
  await page.getByRole("checkbox", { name: "إضافة مستخدم", exact: true }).check();
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(scan.violations.map(({ id }) => id)).toEqual([]);
  await page.getByRole("link", { name: "اختبار الوصول إلى المستخدمون والأدوار" }).click();

  for (const name of ["سارة الاختبار", "مريم الاختبار"]) {
    await page.getByRole("button", { name: "إضافة مستخدم", exact: true }).click();
    await page.getByLabel("اسم المستخدم").fill(name);
    await page.getByLabel("بريد المستخدم").fill("preview-account@example.com");
    await page.getByRole("button", { name: "حفظ المستخدم في المعاينة" }).click();
    if (name === "سارة الاختبار") {
      await expect(page.getByRole("row", { name: /سارة الاختبار/ })).toContainText("بانتظار المراجعة");
      await expect(page.getByRole("button", { name: "تعديل سارة الاختبار" })).toHaveCount(0);
    } else {
      await expect(page.getByRole("alert")).toContainText("البريد مستخدم بالفعل");
    }
  }
});

test("owner controls user actions independently of page access", async ({ page }) => {
  await page.goto("/owner");
  await page.getByRole("checkbox", { name: "إضافة مستخدم", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "تغيير حالة المستخدم", exact: true }).uncheck();
  await page.getByRole("link", { name: "اختبار الوصول إلى المستخدمون والأدوار" }).click();
  await expect(page.getByRole("button", { name: "إضافة مستخدم", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /تعديل يوسف/ }).click();
  await expect(page.getByLabel("اسم المستخدم")).toBeEditable();
  await expect(page.getByRole("combobox", { name: "حالة المستخدم" })).toHaveCount(0);
});

test("owner can remove assignment creation while keeping the teacher workspace", async ({ page }) => {
  await page.goto("/owner");
  await page.getByLabel("الدور").selectOption("teacher");
  const create = page.getByRole("checkbox", { name: "إنشاء واجب", exact: true });
  await create.uncheck();
  await page.getByRole("link", { name: "اختبار الوصول إلى الواجبات والتكليفات" }).click();
  await expect(page.getByRole("heading", { name: "الواجبات والتكليفات" })).toBeVisible();
  await expect(page.getByRole("button", { name: "نشر الواجب التجريبي" })).toHaveCount(0);
});

test("owner can revoke and restore direct access to curricula", async ({ page }) => {
  await page.goto("/owner");
  await page.getByLabel("الدور").selectOption("admin");
  const access = page.getByRole("checkbox", { name: "إدارة المناهج" });
  await expect(access).toBeChecked();
  await access.uncheck();
  await page.goto("/admin/curricula");
  await expect(page.getByRole("heading", { name: "الصلاحية غير متاحة" })).toBeVisible();
  await expect(page.getByRole("link", { name: "إدارة المناهج", exact: true })).toHaveCount(0);

  await page.getByLabel("تبديل اللوحة").selectOption("owner");
  await page.getByLabel("الدور").selectOption("admin");
  await expect(access).not.toBeChecked();
  await access.check();
  await page.getByRole("link", { name: "اختبار الوصول إلى إدارة المناهج" }).click();
  await expect(page.getByRole("heading", { name: "إدارة المناهج" })).toBeVisible();
});

test("owner can delegate publication to a teacher and revoke it again", async ({ page }) => {
  await page.goto("/owner");
  await page.getByLabel("الدور").selectOption("teacher");
  const publish = page.getByRole("checkbox", { name: "اعتماد ونشر المحتوى" });
  await expect(publish).not.toBeChecked();
  await publish.check();
  await page.getByRole("link", { name: "اختبار الوصول إلى إدارة المحتوى" }).click();
  const card = page.locator("[data-content-id]").first();
  await card.getByRole("button", { name: "تعديل المحتوى" }).click();
  await page.getByRole("button", { name: "حفظ مسودة المقرر" }).click();
  await card.getByRole("button", { name: "إرسال للمراجعة" }).click();
  await expect(card.getByRole("button", { name: "اعتماد ونشر تجريبي" })).toBeEnabled();
  await card.getByRole("button", { name: "اعتماد ونشر تجريبي" }).click();
  await expect(card.getByRole("status")).toContainText("تم تحديث حالة المحتوى");
  await card.getByRole("button", { name: "تعديل المحتوى" }).click();
  await page.getByRole("button", { name: "حفظ مسودة المقرر" }).click();
  await card.getByRole("button", { name: "إرسال للمراجعة" }).click();
  await expect(card.getByRole("button", { name: "اعتماد ونشر تجريبي" })).toBeVisible();

  await page.getByLabel("تبديل اللوحة").selectOption("owner");
  await page.getByLabel("الدور").selectOption("teacher");
  await publish.uncheck();
  await page.getByRole("link", { name: "اختبار الوصول إلى إدارة المحتوى" }).click();
  await expect(card.getByRole("button", { name: "سحب للمسودة" })).toBeVisible();
  await expect(card.getByRole("button", { name: "اعتماد ونشر تجريبي" })).toHaveCount(0);
});

test("a role can gain a delegated workspace and only the actions granted there", async ({ page }) => {
  await page.goto("/owner");
  await page.getByLabel("الدور").selectOption("support");
  await page.getByRole("checkbox", { name: "إدارة المناهج" }).check();
  await page.getByRole("checkbox", { name: "إنشاء المحتوى" }).check();
  await page.getByRole("link", { name: "اختبار الوصول إلى إدارة المناهج" }).click();
  await expect(page.getByRole("heading", { name: "إدارة المناهج" })).toBeVisible();
  await expect(page.getByRole("button", { name: "إنشاء مقرر" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "تعديل المحتوى" })).toHaveCount(0);
});
