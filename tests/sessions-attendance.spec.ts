import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  sessionConflict,
  validateSessionDraft,
} from "../src/features/sessions/logic";
import type { SessionPreview } from "../src/features/dashboards/management-types";

async function changeRole(page: Page, role: string, path: string) {
  await page.getByLabel("تبديل اللوحة", { exact: true }).selectOption(role);
  await page.locator(`nav a[href="${path}"]`).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}
async function create(
  page: Page,
  title: string,
  time = "16:00",
  groupName?: string,
) {
  await page.locator("#session-title").fill(title);
  await page.locator("#session-date").fill("2026-11-18");
  await page.locator("#session-time").fill(time);
  if (groupName)
    await page.locator("#session-group").selectOption({ label: groupName });
  await page
    .getByRole("button", { name: "إنشاء الحصة التجريبية", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
}
function sessionCard(page: Page, title: string) {
  return page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

test("session validation covers dates, midnight, shared students, cancelled and adjacent slots", () => {
  const session: SessionPreview = {
    id: "one",
    title: "حصة تجريبية",
    courseId: "math-prep-1",
    groupId: "group-one",
    groupName: "مجموعة",
    teacherId: "teacher-one",
    teacherName: "مدرس",
    studentIds: ["student-one"],
    status: "scheduled",
    date: "2026-11-18",
    time: "16:00",
    duration: 45,
    provider: "google-meet",
    description: "",
    timezone: "Africa/Cairo",
    hostName: "مضيف",
    hostEmail: "host@example.com",
    meetingStatus: "disabled",
  };
  expect(validateSessionDraft({ ...session, date: "2026-02-31" })).toBeTruthy();
  expect(validateSessionDraft({ ...session, time: "23:30" })).toBeTruthy();
  expect(validateSessionDraft(session)).toBeUndefined();
  expect(
    sessionConflict(
      {
        ...session,
        teacherId: "teacher-two",
        groupId: "another",
        time: "16:15",
      },
      [session],
    ),
  ).toBe(true);
  expect(
    sessionConflict(
      { ...session, teacherId: "teacher-two", studentIds: [], time: "16:15" },
      [session],
    ),
  ).toBe(true);
  expect(sessionConflict({ ...session, time: "16:45" }, [session])).toBe(false);
  expect(sessionConflict(session, [session], session.id)).toBe(false);
  expect(sessionConflict(session, [{ ...session, status: "cancelled" }])).toBe(
    false,
  );
});

test("edits reject conflicts and updated appointments propagate to all related views", async ({
  page,
}) => {
  await page.goto("/teacher/sessions");
  await create(page, "حصة أولى للتعديل");
  await create(page, "حصة ثانية ثابتة", "17:30");
  await sessionCard(page, "حصة أولى للتعديل")
    .getByRole("button", { name: "تعديل الحصة", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("وقت الحصة — القاهرة", { exact: true }).fill("17:45");
  await dialog
    .getByRole("button", { name: "حفظ تعديل الحصة", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("يتداخل");
  await dialog.getByLabel("وقت الحصة — القاهرة", { exact: true }).fill("15:00");
  await dialog
    .getByLabel("عنوان الحصة", { exact: true })
    .fill("حصة معدلة واضحة");
  await dialog
    .getByRole("button", { name: "حفظ تعديل الحصة", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await changeRole(page, "student", "/student/schedule");
  const event = page.getByRole("button", { name: /^حصة معدلة واضحة/ });
  await expect(event).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^حصة أولى للتعديل/ }),
  ).toHaveCount(0);
  await changeRole(page, "parent", "/parent/schedule");
  await page.getByRole("button", { name: /^حصة معدلة واضحة/ }).click();
  await expect(page.getByRole("dialog")).toContainText("٣:٠٠");
  await page.keyboard.press("Escape");
  await changeRole(page, "admin", "/admin/schedule");
  await page
    .getByLabel("تصفية المدرس", { exact: true })
    .selectOption("ahmed-hassan");
  await page
    .getByLabel("تصفية المجموعة", { exact: true })
    .selectOption("group-math-prep-1");
  await page.getByLabel("انتقل إلى تاريخ", { exact: true }).fill("2026-11-18");
  await page.getByRole("button", { name: "يوم", exact: true }).click();
  await expect(page.locator("[data-calendar-event]")).toHaveCount(2);
  await page.getByLabel("انتقل إلى تاريخ", { exact: true }).fill("2026-11-19");
  await expect(
    page.getByText("لا توجد حصص في هذا اليوم.", { exact: true }),
  ).toBeVisible();
});

test("cancellation requires a reason, stays visible and releases the occupied time", async ({
  page,
}) => {
  await page.goto("/teacher/sessions");
  await create(page, "حصة ستلغى");
  await sessionCard(page, "حصة ستلغى")
    .getByRole("button", { name: "إلغاء الحصة", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("سبب إلغاء الحصة", { exact: true }).fill("   ");
  await dialog
    .getByRole("button", { name: "تأكيد إلغاء الحصة", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("سبب إلغاء");
  await dialog
    .getByLabel("سبب إلغاء الحصة", { exact: true })
    .fill("تغيير موعد المدرس");
  await dialog
    .getByRole("button", { name: "تأكيد إلغاء الحصة", exact: true })
    .click();
  await expect(sessionCard(page, "حصة ستلغى")).toContainText("ملغاة");
  await expect(
    sessionCard(page, "حصة ستلغى").getByRole("button", {
      name: "تعديل الحصة",
      exact: true,
    }),
  ).toHaveCount(0);
  await create(page, "بديل في الموعد المتاح");
  await changeRole(page, "student", "/student/schedule");
  await page.getByRole("button", { name: /^حصة ستلغى/ }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "ملغاة: تغيير موعد المدرس",
  );
  await page.keyboard.press("Escape");
  await changeRole(page, "parent", "/parent/attendance");
  await expect(sessionCard(page, "حصة ستلغى")).toContainText("لا تُحتسب غيابًا");
});

test("attendance is per student, guardian child selection is scoped and records are read-only for admin", async ({
  page,
}) => {
  await page.goto("/admin/enrollments");
  await page.getByRole("button", { name: "إنشاء مجموعة", exact: true }).click();
  await page
    .getByLabel("اسم المجموعة", { exact: true })
    .fill("مجموعة متابعة مشتركة");
  await page.getByLabel(/يوسف أحمد ·/).check();
  await page.getByLabel(/سلمى أحمد ·/).check();
  await page
    .getByRole("button", { name: "حفظ المجموعة في المعاينة", exact: true })
    .click();
  await changeRole(page, "teacher", "/teacher/sessions");
  await create(page, "حصة متابعة الحضور", "16:00", "مجموعة متابعة مشتركة");
  await sessionCard(page, "حصة متابعة الحضور")
    .getByRole("button", { name: "تسجيل الحضور", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("يوسف أحمد", { exact: true }).selectOption("present");
  await dialog.getByLabel("سلمى أحمد", { exact: true }).selectOption("absent");
  await dialog
    .getByRole("button", { name: "حفظ الحضور في المعاينة", exact: true })
    .click();
  await sessionCard(page, "حصة متابعة الحضور")
    .getByRole("button", { name: "تعديل الحصة", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("وقت الحصة — القاهرة", { exact: true }).fill("14:00");
  await dialog
    .getByRole("button", { name: "حفظ تعديل الحصة", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("بعد تسجيل الحضور");
  await page.keyboard.press("Escape");
  await changeRole(page, "student", "/student/attendance");
  await expect(sessionCard(page, "حصة متابعة الحضور")).toContainText(
    "حالة الحضور: حاضر",
  );
  await expect(
    page.getByRole("button", { name: "تسجيل الحضور", exact: true }),
  ).toHaveCount(0);
  await changeRole(page, "parent", "/parent/attendance");
  await page.getByRole("button", { name: "سلمى أحمد", exact: true }).click();
  await expect(sessionCard(page, "حصة متابعة الحضور")).toContainText(
    "حالة الحضور: غائب",
  );
  await changeRole(page, "teacher", "/teacher/attendance");
  await sessionCard(page, "حصة متابعة الحضور")
    .getByRole("button", { name: "تسجيل الحضور", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("سلمى أحمد", { exact: true }).selectOption("late");
  await dialog
    .getByRole("button", { name: "حفظ الحضور في المعاينة", exact: true })
    .click();
  await changeRole(page, "admin", "/admin/schedule");
  await page.getByRole("button", { name: /^حصة متابعة الحضور/ }).click();
  await expect(page.getByRole("dialog")).toContainText("متأخر");
  await expect(page.getByRole("dialog").getByRole("combobox")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await changeRole(page, "parent", "/parent/attendance");
  await page.getByRole("button", { name: "سلمى أحمد", exact: true }).click();
  await expect(sessionCard(page, "حصة متابعة الحضور")).toContainText(
    "حالة الحضور: متأخر",
  );
  await page.reload();
  await expect(
    page.getByText("لا توجد حصص مطابقة للعرض.", { exact: true }),
  ).toBeVisible();
});

test("unmarked is not absence and new group members do not rewrite a recorded roster", async ({
  page,
}) => {
  await page.goto("/teacher/sessions");
  await create(page, "حصة بقائمة محفوظة");
  await changeRole(page, "student", "/student/attendance");
  await expect(sessionCard(page, "حصة بقائمة محفوظة")).toContainText(
    "حالة الحضور: لم يسجل",
  );
  await changeRole(page, "teacher", "/teacher/attendance");
  await sessionCard(page, "حصة بقائمة محفوظة")
    .getByRole("button", { name: "تسجيل الحضور", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("يوسف أحمد", { exact: true })
    .selectOption("present");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "حفظ الحضور في المعاينة", exact: true })
    .click();
  await changeRole(page, "admin", "/admin/enrollments");
  const group = page
    .locator("article")
    .filter({ hasText: "الصف الأول الإعدادي · الرياضيات.. افهمها بطريقتك" });
  await group.getByRole("button").click();
  await page.getByLabel(/سلمى أحمد ·/).check();
  await page
    .getByRole("button", { name: "حفظ المجموعة في المعاينة", exact: true })
    .click();
  await changeRole(page, "parent", "/parent/attendance");
  await page.getByRole("button", { name: "سلمى أحمد", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "حصة بقائمة محفوظة", exact: true }),
  ).toHaveCount(0);
  await changeRole(page, "teacher", "/teacher/attendance");
  await sessionCard(page, "حصة بقائمة محفوظة")
    .getByRole("button", { name: "تسجيل الحضور", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("سلمى أحمد", { exact: true }),
  ).toHaveCount(0);
});

for (const width of [375, 768, 1440])
  test(`sessions and attendance are responsive and accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/teacher/sessions");
    await create(page, "حصة فحص الواجهة");
    for (const name of ["تعديل الحصة", "إلغاء الحصة", "تسجيل الحضور"]) {
      await sessionCard(page, "حصة فحص الواجهة")
        .getByRole("button", { name, exact: true })
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
    for (const [role, path] of [
      ["teacher", "/teacher/attendance"],
      ["student", "/student/attendance"],
      ["parent", "/parent/attendance"],
      ["admin", "/admin/schedule"],
    ]) {
      await changeRole(page, role, path);
      await expect(role === "admin" ? page.getByRole("button", { name: /^حصة فحص الواجهة/ }) : sessionCard(page, "حصة فحص الواجهة")).toBeVisible();
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  });
