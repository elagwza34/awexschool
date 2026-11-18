import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const paths = [
  "/teacher/profile",
  "/teacher/sessions",
  "/admin/users",
  "/admin/content",
  "/admin/integrations",
];

async function changeRole(page: Page, role: "teacher" | "admin") {
  await page.getByLabel("تبديل اللوحة", { exact: true }).selectOption(role);
  await expect(page).toHaveURL(new RegExp(`/${role}$`));
}
async function openTeacherSessions(page: Page) {
  await changeRole(page, "teacher");
  await page.getByRole("link", { name: "إنشاء حصة", exact: true }).click();
  await expect(page).toHaveURL(/teacher\/sessions/);
}
async function openIntegrations(page: Page) {
  await changeRole(page, "admin");
  await page
    .getByRole("navigation", { name: "أقسام لوحة الإدارة", exact: true })
    .getByRole("link", { name: "ربط Meet وZoom", exact: true })
    .click();
  await expect(page).toHaveURL(/admin\/integrations/);
}

for (const width of [375, 768, 1440]) {
  test(`management screens render without overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    for (const path of paths) {
      expect((await page.goto(path))?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        path,
      ).toBeLessThanOrEqual(width);
    }
    expect(errors).toEqual([]);
  });
}

test("teacher profile saves temporary specialization/curriculum and clears invalid grade selections", async ({
  page,
}) => {
  await page.goto("/teacher/profile");
  await page
    .getByLabel("اسم الظهور للطلاب", { exact: true })
    .fill("أ. أحمد — تجربة");
  await page.getByLabel("التخصص الأساسي", { exact: true }).selectOption("math");
  await page
    .getByLabel("المنهج", { exact: true })
    .selectOption("egypt-languages");
  await page.getByLabel("المرحلة الابتدائية", { exact: true }).uncheck();
  await expect(
    page.getByLabel("الصف الرابع الابتدائي", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("الصف الثاني الإعدادي", { exact: true }).check();
  await page
    .getByRole("button", { name: "حفظ الملف في المعاينة", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "تم حفظ الملف في المعاينة مؤقتًا",
  );
  await page
    .getByRole("navigation", { name: "مسار اللوحة", exact: true })
    .getByRole("link", { name: "لوحة المدرس", exact: true })
    .click();
  await expect(
    page.getByText("أ. أحمد — تجربة", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "تعديل البروفايل", exact: true })
    .click();
  await expect(page.getByLabel("التخصص الأساسي", { exact: true })).toHaveValue(
    "math",
  );
  await expect(page.getByLabel("المنهج", { exact: true })).toHaveValue(
    "egypt-languages",
  );
  await page.reload();
  await expect(
    page.getByLabel("اسم الظهور للطلاب", { exact: true }),
  ).toHaveValue("أ. أحمد حسن");
  await expect(page.getByLabel("التخصص الأساسي", { exact: true })).toHaveValue(
    "math",
  );
});

test("Google Meet connection simulation flows from admin to teacher; overlap is blocked; no external effects", async ({
  page,
}) => {
  await page.goto("/teacher/sessions");
  const calls: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" ||
      !request.url().startsWith("http://127.0.0.1:3100")
    )
      calls.push(request.url());
  });
  await page.getByLabel("عنوان الحصة", { exact: true }).fill("حصة بدون ربط");
  await page
    .getByRole("button", { name: "إنشاء الحصة التجريبية", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "محاكاة الربط غير مفعّلة",
  );
  await page.keyboard.press("Escape");
  await openIntegrations(page);
  await page
    .getByLabel("بريد المستضيف التجريبي", { exact: true })
    .fill("school-host@example.com");
  await page
    .getByRole("button", { name: "محاكاة ربط Google Meet", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "school-host@example.com",
  );
  await page
    .getByRole("button", { name: "تأكيد محاكاة الربط", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "محاكاة Google Meet جاهزة",
  );
  await openTeacherSessions(page);
  await page
    .getByLabel("عنوان الحصة", { exact: true })
    .fill("حصة Meet بعد الربط");
  await page.getByLabel("وقت البداية — القاهرة", { exact: true }).fill("18:00");
  await page
    .getByRole("button", { name: "إنشاء الحصة التجريبية", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(/MEET-DEMO-/);
  await expect(page.getByRole("dialog")).toContainText(
    "لم يتم إنشاء اجتماع لدى Google أو Zoom",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("article")).toHaveCount(2);
  await expect(
    page.getByText("school-host@example.com", { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel("عنوان الحصة", { exact: true }).fill("موعد متداخل");
  await page
    .getByRole("button", { name: "إنشاء الحصة التجريبية", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "الموعد يتداخل",
  );
  await expect(page.locator("article")).toHaveCount(2);
  expect(calls).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
});

test("Zoom settings control defaults and automatic creation independently of Google Meet", async ({
  page,
}) => {
  await page.goto("/admin/integrations");
  await page.getByRole("tab", { name: "Zoom", exact: true }).click();
  await page
    .getByLabel("مدة الحصة الافتراضية", { exact: true })
    .selectOption("60");
  await page
    .getByRole("checkbox", { name: "إنشاء اجتماع تلقائي للحصة في المحاكاة" })
    .uncheck();
  await page
    .getByRole("button", { name: "محاكاة ربط Zoom", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تأكيد محاكاة الربط", exact: true })
    .click();
  await openTeacherSessions(page);
  await page.getByLabel("منصة الاجتماع", { exact: true }).selectOption("zoom");
  await expect(
    page.getByLabel("مدة الحصة بالدقائق", { exact: true }),
  ).toHaveValue("60");
  await page
    .getByLabel("عنوان الحصة", { exact: true })
    .fill("Zoom بدون إنشاء تلقائي");
  await page
    .getByRole("button", { name: "إنشاء الحصة التجريبية", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "الإنشاء التلقائي متوقف",
  );
  await page.keyboard.press("Escape");
  await openIntegrations(page);
  await page.getByRole("tab", { name: "Zoom", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "إنشاء اجتماع تلقائي للحصة في المحاكاة" })
    .check();
  await page
    .getByRole("button", { name: "حفظ إعدادات المعاينة", exact: true })
    .click();
  await openTeacherSessions(page);
  await page.getByLabel("منصة الاجتماع", { exact: true }).selectOption("zoom");
  await page.getByLabel("وقت البداية — القاهرة", { exact: true }).fill("19:00");
  await page
    .getByLabel("عنوان الحصة", { exact: true })
    .fill("اجتماع Zoom تجريبي");
  await page
    .getByRole("button", { name: "إنشاء الحصة التجريبية", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(/ZOOM-DEMO-/);
});

test("management pages and role/connection dialogs pass automated accessibility checks", async ({
  page,
}) => {
  for (const path of paths) {
    await page.goto(path);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      scan.violations,
      `${path}: ${JSON.stringify(scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
  }
  await page
    .getByRole("button", { name: "محاكاة ربط Google Meet", exact: true })
    .click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await page.goto("/admin/users");
  await page.getByRole("tab", { name: "مدرس", exact: true }).click();
  await page
    .locator("tbody tr")
    .filter({ hasText: "teacher@example.com" })
    .getByRole("button", { name: "عرض", exact: true })
    .click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
