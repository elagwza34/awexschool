import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  validateAssignment,
  cairoDate,
  submissionState,
} from "../src/features/assignments/logic";
import type { Assignment } from "../src/features/assignments/types";
async function role(page: Page, value: string) {
  await page.getByLabel("تبديل اللوحة", { exact: true }).selectOption(value);
  await page.locator(`nav a[href="/${value}/assignments"]`).click();
  await expect(page).toHaveURL(new RegExp(`/${value}/assignments$`));
}
async function publish(page: Page, title = "واجب الكسور", group?: string) {
  await page.getByLabel("عنوان الواجب", { exact: true }).fill(title);
  await page
    .getByLabel("تعليمات الواجب", { exact: true })
    .fill("حل المسائل مع توضيح خطوات الحل.");
  await page.getByLabel("آخر يوم للتسليم", { exact: true }).fill("2099-11-18");
  if (group)
    await page.getByLabel("مجموعة الواجب", { exact: true }).selectOption(group);
  await page
    .getByRole("button", { name: "نشر الواجب التجريبي", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
}
function card(page: Page, title = "واجب الكسور") {
  return page
    .locator("article[data-assignment-id]")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}
test("owner can delegate grading to admin and revoke student submission separately", async ({ page }) => {
  await page.goto("/teacher/assignments");
  await publish(page);
  await role(page, "student");
  await page.getByLabel("إجابتك", { exact: true }).fill("إجابة للتصحيح من الإدارة");
  await page.getByRole("button", { name: "تسليم الإجابة", exact: true }).click();
  await expect(card(page)).toContainText("بانتظار التصحيح");

  await page.getByLabel("تبديل اللوحة").selectOption("owner");
  await page.getByLabel("الدور").selectOption("student");
  await page.getByRole("checkbox", { name: "تسليم واجب", exact: true }).uncheck();
  await page.getByRole("link", { name: "اختبار الوصول إلى الواجبات والتكليفات" }).click();
  await expect(card(page)).toContainText("إجابة للتصحيح من الإدارة");
  await expect(page.getByRole("button", { name: "تحديث الإجابة", exact: true })).toHaveCount(0);

  await page.getByLabel("تبديل اللوحة").selectOption("owner");
  await page.getByLabel("الدور").selectOption("admin");
  await page.getByRole("checkbox", { name: "تصحيح واجب", exact: true }).check();
  await page.getByRole("link", { name: "اختبار الوصول إلى الواجبات والتكليفات" }).click();
  await card(page).locator("summary").click();
  await page.getByLabel("درجة الطالب", { exact: true }).fill("9");
  await page.getByLabel("ملاحظات التصحيح", { exact: true }).fill("أحسنت، راجع آخر خطوة.");
  await page.getByRole("button", { name: "حفظ التصحيح", exact: true }).click();
  await role(page, "student");
  await expect(card(page)).toContainText("الدرجة: 9 / 10");
});
test("deadline validation, Cairo day, late submissions and zero grades remain distinct", () => {
  const draft = {
    title: "واجب جديد",
    instructions: "حل المسائل",
    groupId: "g",
    dueDate: "2099-02-28",
    maxScore: 10,
  };
  expect(validateAssignment(draft, "2026-11-16")).toBeUndefined();
  expect(validateAssignment({ ...draft, dueDate: "2099-02-30" })).toBeTruthy();
  expect(validateAssignment({ ...draft, dueDate: "2020-01-01" })).toBeTruthy();
  expect(validateAssignment({ ...draft, maxScore: 1.5 })).toBeTruthy();
  expect(validateAssignment({ ...draft, title: "   " })).toBeTruthy();
  expect(cairoDate(new Date("2026-11-16T22:30:00Z"))).toBe("2026-11-17");
  const assignment = { ...draft, dueDate: "2026-11-16" } as Assignment;
  const answer = {
    assignmentId: "a",
    studentId: "s",
    answer: "حل",
    submittedAt: "2026-11-16T22:30:00Z",
  };
  expect(submissionState(assignment)).toBe("لم يُسلّم");
  expect(submissionState(assignment, answer)).toBe("تسليم متأخر");
  expect(submissionState(assignment, { ...answer, score: 0 })).toBe(
    "تم التصحيح",
  );
});
test("publish, answer, replace, grade zero and review across roles without external writes", async ({
  page,
}) => {
  const errors: string[] = [],
    writes: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(r.method()))
      writes.push(r.url());
  });
  await page.goto("/teacher/assignments");
  await publish(page);
  await role(page, "student");
  await expect(card(page)).toContainText("لم يُسلّم");
  await page.getByLabel("إجابتك", { exact: true }).fill("الحل الأول");
  await page
    .getByRole("button", { name: "تسليم الإجابة", exact: true })
    .click();
  await expect(card(page)).toContainText("بانتظار التصحيح");
  await page.getByLabel("إجابتك", { exact: true }).fill("الإجابة المعدلة");
  await page
    .getByRole("button", { name: "تحديث الإجابة", exact: true })
    .click();
  await role(page, "teacher");
  await card(page).locator("summary").click();
  await expect(card(page)).toContainText("الإجابة المعدلة");
  await expect(card(page)).not.toContainText("الحل الأول");
  await page.getByLabel("درجة الطالب", { exact: true }).fill("11");
  await page
    .getByLabel("ملاحظات التصحيح", { exact: true })
    .fill("راجع خطوات الحل");
  await page.getByRole("button", { name: "حفظ التصحيح", exact: true }).click();
  expect(
    await page
      .getByLabel("درجة الطالب", { exact: true })
      .evaluate((input: HTMLInputElement) => input.validity.rangeOverflow),
  ).toBe(true);
  await expect(card(page)).not.toContainText("الدرجة: 11");
  await page.getByLabel("درجة الطالب", { exact: true }).fill("0");
  await page.getByRole("button", { name: "حفظ التصحيح", exact: true }).click();
  await expect(card(page)).toContainText("الدرجة: 0 / 10");
  await role(page, "student");
  await expect(card(page)).toContainText("راجع خطوات الحل");
  await expect(page.getByLabel("إجابتك", { exact: true })).toHaveCount(0);
  await role(page, "parent");
  await expect(card(page)).toContainText("الدرجة: 0 / 10");
  await page.getByRole("button", { name: "سلمى أحمد", exact: true }).click();
  await expect(card(page)).toHaveCount(0);
  await role(page, "admin");
  await card(page).locator("summary").click();
  await expect(card(page)).toContainText("الدرجة: 0 / 10");
  await expect(page.getByRole("button", { name: "حفظ التصحيح" })).toHaveCount(
    0,
  );
  await page
    .getByLabel("حالة التسليم", { exact: true })
    .selectOption("لم يُسلّم");
  await expect(card(page)).toHaveCount(0);
  await page
    .getByLabel("حالة التسليم", { exact: true })
    .selectOption("تم التصحيح");
  await expect(card(page)).toBeVisible();
  await page.reload();
  await expect(card(page)).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(writes).toEqual([]);
});
test("group scoping, guardian selection and no automatic grades for missing submissions", async ({
  page,
}) => {
  await page.goto("/teacher/assignments");
  await publish(page, "واجب سلمى", "group-math-primary-4");
  await role(page, "student");
  await expect(card(page, "واجب سلمى")).toHaveCount(0);
  await role(page, "parent");
  await page.getByRole("button", { name: "سلمى أحمد", exact: true }).click();
  await expect(card(page, "واجب سلمى")).toContainText("لا توجد درجة مسجلة");
  await expect(page.getByRole("button", { name: "تسليم الإجابة" })).toHaveCount(
    0,
  );
  await role(page, "admin");
  await page
    .getByLabel("تصفية مجموعة الواجب", { exact: true })
    .selectOption("group-math-primary-4");
  await expect(card(page, "واجب سلمى")).toBeVisible();
  await page
    .getByLabel("حالة التسليم", { exact: true })
    .selectOption("تم التصحيح");
  await expect(card(page, "واجب سلمى")).toHaveCount(0);
});
test('published roster stays fixed after group changes and empty groups cannot receive assignments', async ({ page }) => {
  await page.goto('/teacher/assignments');
  await publish(page);
  await page.getByLabel('تبديل اللوحة', { exact: true }).selectOption('admin');
  await page.locator('nav a[href="/admin/enrollments"]').click();
  await page.waitForURL('**/admin/enrollments');
  const group = page.locator('article').filter({ hasText: 'الصف الأول الإعدادي · الرياضيات.. افهمها بطريقتك' });
  await group.getByRole('button').click();
  await page.getByLabel(/يوسف أحمد ·/).uncheck();
  await page.getByLabel(/سلمى أحمد ·/).check();
  await page.getByRole('button', { name: 'حفظ المجموعة في المعاينة', exact: true }).click();
  await role(page, 'parent');
  await page.getByRole('button', { name: 'سلمى أحمد', exact: true }).click();
  await expect(card(page)).toHaveCount(0);
  await role(page, 'student');
  await expect(card(page)).toBeVisible();
  await role(page, 'admin');
  await page.locator('nav a[href="/admin/enrollments"]').click();
  await page.waitForURL('**/admin/enrollments');
  await group.getByRole('button').click();
  await page.getByLabel(/سلمى أحمد ·/).uncheck();
  await page.getByRole('button', { name: 'حفظ المجموعة في المعاينة', exact: true }).click();
  await role(page, 'teacher');
  await page.getByLabel('عنوان الواجب', { exact: true }).fill('واجب بلا طلاب');
  await page.getByLabel('تعليمات الواجب', { exact: true }).fill('حل جميع المسائل');
  await page.getByLabel('آخر يوم للتسليم', { exact: true }).fill('2099-11-18');
  await page.getByRole('button', { name: 'نشر الواجب التجريبي' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('أضف طلابًا نشطين للمجموعة أولًا.');
  await expect(card(page, 'واجب بلا طلاب')).toHaveCount(0);
});

test('optional lesson linkage is scoped to the selected group and cancellation preserves the assignment', async ({ page }) => {
  await page.goto('/teacher/sessions');
  await page.locator('#session-title').fill('حصة تدريب الكسور');
  await page.locator('#session-date').fill('2099-11-17');
  await page.locator('#session-time').fill('16:00');
  await page.getByRole('button', { name: 'إنشاء الحصة التجريبية', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('nav a[href="/teacher/assignments"]').click();
  await page.waitForURL('**/teacher/assignments');
  await page.getByLabel('حصة مرتبطة (اختياري)', { exact: true }).selectOption({ label: 'حصة تدريب الكسور · 2099-11-17' });
  await publish(page);
  await expect(card(page)).toContainText('الحصة: حصة تدريب الكسور');
  await page.getByLabel('مجموعة الواجب', { exact: true }).selectOption('group-math-primary-4');
  await expect(page.getByLabel('حصة مرتبطة (اختياري)', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('حصة مرتبطة (اختياري)', { exact: true }).locator('option')).toHaveCount(1);
  await page.locator('nav a[href="/teacher/sessions"]').click();
  await page.waitForURL('**/teacher/sessions');
  await page.getByRole('button', { name: 'إلغاء الحصة', exact: true }).click();
  await page.getByLabel('سبب إلغاء الحصة', { exact: true }).fill('تغيير موعد الحصة');
  await page.getByRole('dialog').getByRole('button', { name: /تأكيد/ }).click();
  await role(page, 'student');
  await expect(card(page)).toContainText('ملغاة؛ الواجب ما زال متاحًا');
  await page.getByLabel('إجابتك', { exact: true }).fill('إجابة مستقلة عن الحصة');
  await page.getByRole('button', { name: 'تسليم الإجابة', exact: true }).click();
  await expect(card(page)).toContainText('بانتظار التصحيح');
});

for (const width of [375, 768, 1440])
  test(`assignment flows remain accessible and responsive at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/teacher/assignments");
    await publish(page);
    for (const value of ["teacher", "student", "parent", "admin"]) {
      if (value !== "teacher") await role(page, value);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "الواجبات والتكليفات",
      );
      await expect(page).toHaveTitle(/الواجبات والتكليفات/);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
    }
  });
