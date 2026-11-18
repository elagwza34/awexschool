import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getCourse } from "../src/features/catalog/mock-data";

async function role(page: Page, value: string, path: string) {
  await page.getByLabel("تبديل اللوحة", { exact: true }).selectOption(value);
  await page.locator(`nav a[href="${path}"]`).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}
async function group(page: Page, name: string, courseId: string) {
  await page.getByRole("button", { name: "إنشاء مجموعة", exact: true }).click();
  await page.getByLabel("اسم المجموعة", { exact: true }).fill(name);
  await page
    .getByLabel("مقرر المجموعة", { exact: true })
    .selectOption(courseId);
  await page.getByLabel(/يوسف أحمد ·/).check();
  await page
    .getByRole("button", { name: "حفظ المجموعة في المعاينة", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("guardian links control parent lists and child detail visibility", async ({
  page,
}) => {
  await page.goto("/parent/courses/malak");
  await expect(
    page.getByRole("heading", {
      name: "الابن غير مرتبط بولي الأمر",
      exact: true,
    }),
  ).toBeVisible();
  await role(page, "admin", "/admin/enrollments");
  await page
    .getByRole("tab", { name: "ربط أولياء الأمور", exact: true })
    .click();
  await page.getByRole("button", { name: /فك ربط يوسف أحمد من/ }).click();
  await role(page, "parent", "/parent/courses");
  await expect(
    page.getByRole("heading", { name: "يوسف أحمد", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "سلمى أحمد", exact: true }),
  ).toBeVisible();
  await role(page, "admin", "/admin/enrollments");
  await page
    .getByRole("tab", { name: "ربط أولياء الأمور", exact: true })
    .click();
  await page
    .getByRole("button", { name: "ربط الطالب بولي الأمر", exact: true })
    .click();
  await page
    .getByRole("button", { name: "ربط الطالب بولي الأمر", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "الطالب مرتبط بولي الأمر بالفعل.",
  );
  await role(page, "parent", "/parent/courses");
  await expect(
    page.getByRole("heading", { name: "يوسف أحمد", exact: true }),
  ).toBeVisible();
  await role(page, "admin", "/admin/enrollments");
  await page
    .getByRole("tab", { name: "ربط أولياء الأمور", exact: true })
    .click();
  await page.getByRole("button", { name: /فك ربط يوسف أحمد من/ }).click();
  await page.getByRole("button", { name: /فك ربط سلمى أحمد من/ }).click();
  await role(page, "parent", "/parent/courses");
  await expect(
    page.getByRole("heading", {
      name: "لا يوجد أبناء مرتبطون بولي الأمر",
      exact: true,
    }),
  ).toBeVisible();
  await page.locator('nav a[href="/parent"]').click();
  await expect(
    page.getByRole("heading", {
      name: "لا يوجد أبناء مرتبطون بولي الأمر",
      exact: true,
    }),
  ).toBeVisible();
});

test("staff creation respects emails changed in user management", async ({
  page,
}) => {
  await page.goto("/admin/users");
  await page
    .getByRole("button", { name: "تعديل يوسف أحمد", exact: true })
    .click();
  await page
    .getByLabel("بريد المستخدم", { exact: true })
    .fill("linked-user@example.com");
  await page
    .getByRole("button", { name: "حفظ المستخدم في المعاينة", exact: true })
    .click();
  await page.locator('nav a[href="/admin/team"]').click();
  await page
    .getByRole("button", { name: "إضافة عضو للإدارة", exact: true })
    .click();
  await page.getByLabel("اسم العضو", { exact: true }).fill("عضو تجربة");
  await page
    .getByLabel("البريد الإلكتروني للعضو", { exact: true })
    .fill("LINKED-USER@example.com");
  await page
    .getByRole("button", { name: "إضافة في المعاينة", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "البريد مستخدم بالفعل في المعاينة.",
  );
});

test("group membership propagates without duplicating an enrolled course", async ({
  page,
}) => {
  await page.goto("/admin/enrollments");
  const effects: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" ||
      !request.url().startsWith("http://127.0.0.1:3100")
    )
      effects.push(request.url());
  });
  await group(page, "مجموعة جبر مسائية", "math-prep-1");
  await role(page, "teacher", "/teacher/groups");
  const roster = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "مجموعة جبر مسائية",
      exact: true,
    }),
  });
  await expect(roster).toContainText("يوسف أحمد");
  await role(page, "student", "/student/courses");
  await expect(page.locator("article")).toHaveCount(3);
  await expect(
    page.getByText("مجموعة جبر مسائية", { exact: true }),
  ).toBeVisible();
  await role(page, "parent", "/parent/courses");
  await page.getByRole("link", { name: /يوسف أحمد/ }).click();
  await expect(
    page.getByText("مجموعة جبر مسائية", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("مجموعة جبر مسائية", { exact: true }),
  ).toHaveCount(0);
  expect(effects).toEqual([]);
});

test("new enrollment adds the course and its teacher to linked views", async ({
  page,
}) => {
  await page.goto("/admin/enrollments");
  await group(page, "مجموعة لغة إضافية", "english-prep-2");
  await role(page, "student", "/student/courses");
  await expect(page.locator("article")).toHaveCount(4);
  await expect(
    page.getByRole("heading", {
      name: getCourse("english-prep-2")!.title,
      exact: true,
    }),
  ).toBeVisible();
  await page.locator('nav a[href="/student/chat"]').click();
  await expect(
    page
      .getByRole("list", { name: "قائمة المدرسين المرتبطين", exact: true })
      .getByRole("button"),
  ).toHaveCount(4);
  await expect(page.getByRole("button", { name: /نور إبراهيم/ })).toBeVisible();
  await role(page, "parent", "/parent/courses");
  await page.getByRole("link", { name: /يوسف أحمد/ }).click();
  await expect(page.locator("article")).toHaveCount(4);
});

test("same-subject reassignment updates courses, teacher groups and chat membership", async ({
  page,
}) => {
  await page.goto("/admin/enrollments");
  await page.getByRole("tab", { name: "إسناد المقررات", exact: true }).click();
  const teacher = page.getByLabel("مدرس المادة", { exact: true });
  await expect(teacher.locator("option")).toHaveCount(2);
  await teacher.selectOption("mahmoud-samir");
  await page
    .getByRole("button", { name: "حفظ إسناد المقرر", exact: true })
    .click();
  await role(page, "student", "/student/courses");
  await expect(page.getByText("أ. محمود سمير", { exact: true })).toBeVisible();
  await page.locator('nav a[href="/student/chat"]').click();
  const contacts = page.getByRole("list", {
    name: "قائمة المدرسين المرتبطين",
    exact: true,
  });
  await expect(
    contacts.getByRole("button", { name: /محمود سمير/ }),
  ).toBeVisible();
  await expect(contacts.getByRole("button", { name: /أحمد حسن/ })).toHaveCount(
    0,
  );
  await role(page, "teacher", "/teacher/groups");
  await expect(page.getByText("يوسف أحمد · نشط", { exact: true })).toHaveCount(
    0,
  );
  await page.locator('nav a[href="/teacher/chat"]').click();
  await expect(
    page
      .getByRole("list", { name: "قائمة الطلاب المرتبطين", exact: true })
      .getByRole("button"),
  ).toHaveCount(1);
});

test("account edits reject duplicate emails and disabled users cannot send", async ({
  page,
}) => {
  await page.goto("/admin/users");
  await page
    .getByRole("button", { name: "تعديل يوسف أحمد", exact: true })
    .click();
  await page
    .getByLabel("بريد المستخدم", { exact: true })
    .fill("manager@example.com");
  await page
    .getByRole("button", { name: "حفظ المستخدم في المعاينة", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText(
    "البريد مستخدم بالفعل في المعاينة.",
  );
  await page
    .getByLabel("بريد المستخدم", { exact: true })
    .fill("youssef-updated@example.com");
  await page.getByLabel("حالة المستخدم", { exact: true }).selectOption("معطل");
  await page
    .getByRole("button", { name: "حفظ المستخدم في المعاينة", exact: true })
    .click();
  await expect(
    page.locator("tbody tr").filter({ hasText: "youssef-updated@example.com" }),
  ).toContainText("معطل");
  await role(page, "student", "/student/admin-chat");
  await page
    .getByLabel("رسالتك", { exact: true })
    .fill("محاولة إرسال من مستخدم معطل");
  await page
    .getByRole("button", { name: "إرسال في المعاينة", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "المستخدم غير نشط",
  );
  await page.locator('nav a[href="/student/chat"]').click();
  await expect(
    page
      .getByRole("list", { name: "قائمة المدرسين المرتبطين", exact: true })
      .getByRole("button"),
  ).toHaveCount(0);
});

test("removing all student memberships has safe empty views", async ({
  page,
}) => {
  await page.goto("/admin/enrollments");
  for (const id of ["math-prep-1", "arabic-prep-1", "science-prep-1"]) {
    const row = page
      .locator("article")
      .filter({
        has: page.getByRole("heading", {
          name: new RegExp(
            getCourse(id)!.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          ),
        }),
      })
      .first();
    await row.getByRole("button").click();
    await page.getByLabel(/يوسف أحمد ·/).uncheck();
    await page
      .getByRole("button", { name: "حفظ المجموعة في المعاينة", exact: true })
      .click();
  }
  await role(page, "student", "/student/courses");
  await expect(page.locator("article")).toHaveCount(0);
  await expect(
    page.getByText("لا توجد مجموعات مرتبطة بالطالب حاليًا.", { exact: true }),
  ).toBeVisible();
  await role(page, "parent", "/parent/courses");
  await page.getByRole("link", { name: /يوسف أحمد/ }).click();
  await expect(page.locator("main")).not.toContainText("NaN");
});

test("teacher subject remains canonical after all old courses are reassigned", async ({
  page,
}) => {
  await page.goto("/admin/enrollments");
  await page.getByRole("tab", { name: "إسناد المقررات", exact: true }).click();
  for (const id of ["math-prep-1", "math-primary-4"]) {
    await page
      .getByLabel("المقرر المراد إسناده", { exact: true })
      .selectOption(id);
    await page
      .getByLabel("مدرس المادة", { exact: true })
      .selectOption("mahmoud-samir");
    await page
      .getByRole("button", { name: "حفظ إسناد المقرر", exact: true })
      .click();
  }
  await role(page, "teacher", "/teacher/profile");
  await page
    .getByLabel("التخصص الأساسي", { exact: true })
    .selectOption("science");
  await page
    .getByRole("button", { name: "حفظ الملف في المعاينة", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "تم حفظ الملف",
  );
  await role(page, "admin", "/admin/enrollments");
  await page.getByRole("tab", { name: "إسناد المقررات", exact: true }).click();
  await page
    .getByLabel("المقرر المراد إسناده", { exact: true })
    .selectOption("science-prep-1");
  await page
    .getByLabel("مدرس المادة", { exact: true })
    .selectOption("ahmed-hassan");
  await page
    .getByRole("button", { name: "حفظ إسناد المقرر", exact: true })
    .click();
  await role(page, "teacher", "/teacher/sessions");
  await expect(page.locator("#session-course option")).toHaveCount(1);
  await expect(page.locator("#session-course")).toHaveValue("science-prep-1");
});

for (const width of [375, 768, 1440])
  test(`enrollment workflows are responsive and accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/admin/enrollments");
    for (const name of ["المجموعات", "إسناد المقررات", "ربط أولياء الأمور"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
    }
    await page.getByRole("tab", { name: "المجموعات", exact: true }).click();
    await page
      .getByRole("button", { name: "إنشاء مجموعة", exact: true })
      .click();
    const dialogScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(dialogScan.violations).toEqual([]);
    await page.keyboard.press("Escape");
    await role(page, "teacher", "/teacher/groups");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
  });
