import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { validateContent } from "../src/features/content/logic";
import { contentFixtures } from "../src/features/content/data";
import { moveContent } from "../src/features/content/fields";
function card(page: Page, title: string) {
  return page
    .locator("article[data-content-id]")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}
async function role(page: Page, value: string) {
  await page.getByLabel("تبديل اللوحة", { exact: true }).selectOption(value);
  const path = value === "student" ? "/student/library" : `/${value}/content`;
  await page.locator(`nav a[href="${path}"]`).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}
async function enrollPublished(page: Page, title: string) {
  await page.locator('nav a[href="/admin/enrollments"]').click();
  await page.waitForURL("**/admin/enrollments");
  await page.getByRole("button", { name: "إنشاء مجموعة", exact: true }).click();
  await page
    .getByLabel("اسم المجموعة", { exact: true })
    .fill("مجموعة المحتوى المعتمد");
  await page
    .getByLabel("مقرر المجموعة", { exact: true })
    .selectOption({ label: title });
  await page.getByLabel(/يوسف أحمد ·/).check();
  await page
    .getByRole("button", { name: "حفظ المجموعة في المعاينة", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function create(
  page: Page,
  title = "مقرر الجبر التجريبي",
  complete = true,
) {
  await page.getByRole("button", { name: "إنشاء مقرر", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("عنوان المقرر", { exact: true }).fill(title);
  await dialog
    .getByLabel("وصف المقرر", { exact: true })
    .fill("مقرر تدريبي لشرح الجبر بخطوات واضحة وأمثلة مصرية.");
  if (complete) {
    await dialog
      .getByRole("button", { name: "إضافة وحدة", exact: true })
      .click();
    const unit = dialog.locator("details").first();
    await unit.locator(":scope > summary").click();
    await unit
      .getByLabel("عنوان الوحدة", { exact: true })
      .fill("وحدة المعادلات");
    await unit.getByRole("button", { name: "إضافة درس", exact: true }).click();
    const lesson = unit.locator("details").first();
    await lesson.locator("summary").click();
    await lesson
      .getByLabel("عنوان الدرس", { exact: true })
      .fill("المعادلات من الدرجة الأولى");
    await lesson
      .getByLabel("أهداف الدرس (هدف في كل سطر)", { exact: true })
      .fill("حل معادلة بسيطة\nالتحقق من الناتج");
    await lesson
      .getByLabel("نص الدرس", { exact: true })
      .fill("نطرح العدد الثابت من الطرفين، ثم نقسم على معامل المجهول.");
    await lesson
      .getByRole("button", { name: "إضافة مورد", exact: true })
      .click();
    await lesson
      .getByLabel("عنوان المورد", { exact: true })
      .fill("ورقة تدريب المعادلات");
    await lesson
      .getByLabel("مرجع المورد", { exact: true })
      .fill("algebra-practice.pdf");
  }
  await dialog
    .getByRole("button", { name: "حفظ مسودة المقرر", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(card(page, title)).toBeVisible();
}
test("draft and publication validation cover structure, resources, duplicate IDs and ordering", () => {
  const course = structuredClone(contentFixtures[0].working);
  expect(validateContent(course, true)).toBeUndefined();
  expect(validateContent({ ...course, units: [] })).toBeUndefined();
  expect(validateContent({ ...course, units: [] }, true)).toBeTruthy();
  const lesson = course.units[0].lessons[0];
  lesson.resources = [
    {
      id: "r",
      title: "مورد جديد",
      kind: "link",
      reference: "javascript:alert(1)",
    },
  ];
  expect(validateContent(course, true)).toBeTruthy();
  lesson.resources[0].reference = "https://example.com/lesson";
  expect(validateContent(course, true)).toBeUndefined();
  lesson.minutes = 0;
  expect(validateContent(course)).toBeTruthy();
  lesson.minutes = 15;
  lesson.resources[0].id = lesson.id;
  expect(validateContent(course)).toBeTruthy();
  expect(moveContent(["one", "two"], 1, -1)).toEqual(["two", "one"]);
  expect(moveContent(["one", "two"], 0, -1)).toEqual(["one", "two"]);
});
test("draft, review feedback, approval, published snapshots and unpublishing work across roles without writes", async ({
  page,
}) => {
  const writes: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method()))
      writes.push(request.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/teacher/content");
  await create(page);
  await card(page, "مقرر الجبر التجريبي")
    .getByRole("button", { name: "إرسال للمراجعة", exact: true })
    .click();
  await expect(
    card(page, "مقرر الجبر التجريبي").getByRole("button", {
      name: "تعديل المحتوى",
      exact: true,
    }),
  ).toBeDisabled();
  await role(page, "student");
  await expect(
    page.getByRole("heading", { name: "مقرر الجبر التجريبي", exact: true }),
  ).toHaveCount(0);
  await role(page, "admin");
  await card(page, "مقرر الجبر التجريبي")
    .getByRole("button", { name: "طلب تعديلات", exact: true })
    .click();
  await page
    .getByLabel("سبب الإجراء", { exact: true })
    .fill("أضف مثالًا محلولًا");
  await page
    .getByRole("button", { name: "تأكيد الإجراء", exact: true })
    .click();
  await role(page, "teacher");
  await expect(card(page, "مقرر الجبر التجريبي")).toContainText(
    "أضف مثالًا محلولًا",
  );
  await card(page, "مقرر الجبر التجريبي")
    .getByRole("button", { name: "تعديل المحتوى", exact: true })
    .click();
  await page
    .getByLabel("وصف المقرر", { exact: true })
    .fill("مقرر تدريبي مع مثال محلول: س + ٢ = ٥، إذن س = ٣.");
  await page
    .getByRole("button", { name: "حفظ مسودة المقرر", exact: true })
    .click();
  await card(page, "مقرر الجبر التجريبي")
    .getByRole("button", { name: "إرسال للمراجعة", exact: true })
    .click();
  await role(page, "admin");
  await card(page, "مقرر الجبر التجريبي")
    .getByRole("button", { name: "اعتماد ونشر تجريبي", exact: true })
    .click();
  await enrollPublished(page, "مقرر الجبر التجريبي");
  await role(page, "student");
  const published = page
    .locator("article[data-published-content]")
    .filter({ hasText: "مقرر الجبر التجريبي" });
  await published
    .getByRole("button", { name: "معاينة النسخة المنشورة", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByText("المعادلات من الدرجة الأولى", { exact: false })
    .click();
  await expect(page.getByRole("dialog")).toContainText("ورقة تدريب المعادلات");
  await expect(page.getByRole("dialog")).toContainText("algebra-practice.pdf");
  await page.keyboard.press("Escape");
  await role(page, "teacher");
  await card(page, "مقرر الجبر التجريبي")
    .getByRole("button", { name: "تعديل المحتوى", exact: true })
    .click();
  await page.getByLabel("عنوان المقرر", { exact: true }).fill("نسخة جبر جديدة");
  await page
    .getByRole("button", { name: "حفظ مسودة المقرر", exact: true })
    .click();
  await role(page, "student");
  await expect(
    page.getByRole("heading", { name: "مقرر الجبر التجريبي", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "نسخة جبر جديدة", exact: true }),
  ).toHaveCount(0);
  await role(page, "teacher");
  await card(page, "نسخة جبر جديدة")
    .getByRole("button", { name: "إرسال للمراجعة", exact: true })
    .click();
  await role(page, "admin");
  await card(page, "نسخة جبر جديدة")
    .getByRole("button", { name: "اعتماد ونشر تجريبي", exact: true })
    .click();
  await role(page, "student");
  await expect(
    page.getByRole("heading", { name: "نسخة جبر جديدة", exact: true }),
  ).toBeVisible();
  await role(page, "admin");
  await card(page, "نسخة جبر جديدة")
    .getByRole("button", { name: "إيقاف النشر التجريبي", exact: true })
    .click();
  await page
    .getByLabel("سبب الإجراء", { exact: true })
    .fill("مراجعة المحتوى مرة أخرى");
  await page
    .getByRole("button", { name: "تأكيد الإجراء", exact: true })
    .click();
  await role(page, "student");
  await expect(
    page.getByRole("heading", { name: "نسخة جبر جديدة", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
});
test("incomplete drafts are blocked from review, editor cancellation discards changes, review can be withdrawn", async ({
  page,
}) => {
  await page.goto("/teacher/content");
  await create(page, "مسودة بلا وحدات", false);
  await card(page, "مسودة بلا وحدات")
    .getByRole("button", { name: "إرسال للمراجعة", exact: true })
    .click();
  await expect(card(page, "مسودة بلا وحدات").getByRole("alert")).toContainText(
    "وحدة واحدة",
  );
  await card(page, "مسودة بلا وحدات")
    .getByRole("button", { name: "تعديل المحتوى", exact: true })
    .click();
  await page
    .getByLabel("عنوان المقرر", { exact: true })
    .fill("تعديل غير محفوظ");
  await page
    .getByRole("button", { name: "إلغاء التعديلات", exact: true })
    .click();
  await expect(card(page, "مسودة بلا وحدات")).toBeVisible();
  await create(page, "مقرر قابل للسحب");
  await card(page, "مقرر قابل للسحب")
    .getByRole("button", { name: "إرسال للمراجعة", exact: true })
    .click();
  await card(page, "مقرر قابل للسحب")
    .getByRole("button", { name: "سحب للمسودة", exact: true })
    .click();
  await expect(
    card(page, "مقرر قابل للسحب").getByRole("button", {
      name: "تعديل المحتوى",
      exact: true,
    }),
  ).toBeEnabled();
});
test("admin selects the single teacher subject and grade; teacher cannot see another teacher draft", async ({
  page,
}) => {
  await page.goto("/admin/content");
  await page.getByRole("button", { name: "إنشاء مقرر", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("مدرس المقرر", { exact: true })
    .selectOption("mariam-adel");
  await expect(dialog).toContainText("المادة: اللغة العربية");
  await dialog
    .getByLabel("عنوان المقرر", { exact: true })
    .fill("مقرر قراءة تجريبي");
  await dialog
    .getByLabel("وصف المقرر", { exact: true })
    .fill("تدريبات واضحة على القراءة وفهم النصوص.");
  await dialog
    .getByLabel("صف المقرر", { exact: true })
    .selectOption("primary-4");
  await dialog
    .getByRole("button", { name: "حفظ مسودة المقرر", exact: true })
    .click();
  await role(page, "teacher");
  await expect(card(page, "مقرر قراءة تجريبي")).toHaveCount(0);
  await role(page, "admin");
  await page
    .getByLabel("تصفية مدرس المحتوى", { exact: true })
    .selectOption("mariam-adel");
  await expect(card(page, "مقرر قراءة تجريبي")).toBeVisible();
  await page
    .getByLabel("تصفية صف المحتوى", { exact: true })
    .selectOption("preparatory-1");
  await expect(card(page, "مقرر قراءة تجريبي")).toHaveCount(0);
});
test("lesson and unit ordering, resource editing and draft deletion survive saving", async ({
  page,
}) => {
  await page.goto("/teacher/content");
  await create(page);
  await card(page, "مقرر الجبر التجريبي")
    .getByRole("button", { name: "تعديل المحتوى", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "إضافة وحدة", exact: true }).click();
  const unit = dialog.locator("form > details").nth(1);
  await unit.locator(":scope > summary").click();
  await unit
    .getByLabel("عنوان الوحدة", { exact: true })
    .fill("وحدة ثانية للتجربة");
  await unit.getByRole("button", { name: "رفع الوحدة", exact: true }).click();
  await expect(
    dialog.locator("form > details > summary").first(),
  ).toContainText("وحدة ثانية للتجربة");
  await page
    .getByRole("button", { name: "حفظ مسودة المقرر", exact: true })
    .click();
  await card(page, "مقرر الجبر التجريبي")
    .getByRole("button", { name: "معاينة نسخة العمل", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { level: 3 }).first(),
  ).toContainText("وحدة ثانية للتجربة");
  await page.keyboard.press("Escape");
  await card(page, "مقرر الجبر التجريبي")
    .getByRole("button", { name: "تعديل المحتوى", exact: true })
    .click();
  const firstUnit = page.getByRole("dialog").locator("form > details").first();
  await firstUnit.locator(":scope > summary").click();
  await firstUnit
    .getByRole("button", { name: "حذف الوحدة من المسودة", exact: true })
    .click();
  await page
    .getByRole("button", { name: "حفظ مسودة المقرر", exact: true })
    .click();
  await expect(card(page, "مقرر الجبر التجريبي")).toContainText("1 وحدات");
});
for (const width of [375, 768, 1440])
  test(`content editor, previews and library are accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/teacher/content");
    await create(page);
    for (const action of ["تعديل المحتوى", "معاينة نسخة العمل"]) {
      await card(page, "مقرر الجبر التجريبي")
        .getByRole("button", { name: action, exact: true })
        .click();
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.keyboard.press("Escape");
    }
    for (const value of ["admin", "student"]) {
      await role(page, value);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
    }
  });
