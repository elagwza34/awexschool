import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("teacher rejects whitespace-only names without changing saved profile", async ({
  page,
}) => {
  await page.goto("/teacher/profile");
  for (const label of ["اسم الظهور للطلاب", "الاسم الكامل"]) {
    const field = page.getByLabel(label, { exact: true });
    const original = await field.inputValue();
    await field.fill("   ");
    await page
      .getByRole("button", { name: "حفظ الملف في المعاينة", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "اكتب اسم المدرس",
    );
    await expect(field).toBeFocused();
    await page
      .getByRole("button", { name: "إلغاء التعديلات", exact: true })
      .click();
    await expect(field).toHaveValue(original);
  }
});

test("role filtering clears excluded chat recipient and draft", async ({
  page,
}) => {
  await page.goto("/admin/chat");
  await page.getByLabel("رسالتك", { exact: true }).fill("مسودة تخص المدرس فقط");
  await page.getByLabel("نوع المستخدم", { exact: true }).selectOption("parent");
  await expect(page.getByLabel("رسالتك", { exact: true })).toHaveCount(0);
  const contacts = page.getByRole("list", {
    name: "قائمة محادثات الإدارة",
    exact: true,
  });
  await expect(contacts.getByRole("button")).toHaveCount(1);
  await contacts.getByRole("button").click();
  await expect(page.getByLabel("رسالتك", { exact: true })).toHaveValue("");
  await expect(page.getByRole("log")).not.toContainText("مسودة تخص المدرس فقط");
  await page
    .getByLabel("نوع المستخدم", { exact: true })
    .selectOption("teacher");
  await expect(page.getByLabel("رسالتك", { exact: true })).toHaveCount(0);
});

test("teacher schedule retains all created lessons in chronological order", async ({
  page,
}) => {
  await page.goto("/teacher/sessions");
  const lessons = [
    { title: "اختبار الموعد الرابع", date: "2026-11-24", time: "17:00" },
    { title: "اختبار الموعد الأول", date: "2026-11-20", time: "17:00" },
    { title: "اختبار الموعد الثالث", date: "2026-11-21", time: "18:00" },
    { title: "اختبار الموعد الثاني", date: "2026-11-21", time: "16:00" },
  ];
  for (const lesson of lessons) {
    await page.locator("#session-title").fill(lesson.title);
    await page.locator("#session-date").fill(lesson.date);
    await page.locator("#session-time").fill(lesson.time);
    await page
      .getByRole("button", { name: "إنشاء الحصة التجريبية", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
  }
  await page.locator('nav a[href="/teacher/schedule"]').click();
  await expect(page).toHaveURL(/\/teacher\/schedule$/);
  await page.getByLabel("انتقل إلى تاريخ", { exact: true }).fill("2026-11-20");
  await expect(
    page.getByRole("button", { name: /^اختبار الموعد الأول/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "الأسبوع التالي", exact: true })
    .click();
  const entries = page.locator("#schedule [data-calendar-event]");
  await expect(entries).toContainText([
    "اختبار الموعد الثاني",
    "اختبار الموعد الثالث",
    "اختبار الموعد الرابع",
  ]);
});

test("public FAQ works by keyboard and pricing remains a local preview", async ({
  page,
}) => {
  expect((await page.goto("/faq"))?.status()).toBe(200);
  const details = page.locator("details").first();
  await details.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  await expect(details.locator("p")).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
  expect((await page.goto("/pricing"))?.status()).toBe(200);
  await expect(page.getByText("السعر يُحدد لاحقًا", { exact: true })).toHaveCount(
    3,
  );
  await page
    .getByRole("button", { name: "عرض تفاصيل النموذج", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("لا يتم شراء باقة");
});

test("homepage ratings expose valid semantics", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("img", { name: "تقييم 5 من 5", exact: true }),
  ).toHaveCount(3);
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});
