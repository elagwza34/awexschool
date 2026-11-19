import { expect, test } from "@playwright/test";
import { availableSeats } from "../src/features/enrollments/registration";

test("expired reservations release seats, paid requests hold them, and members are counted once", () => {
  const group = { id: "g", name: "Test", courseId: "c", studentIds: ["existing"], capacity: 3, active: true, day: "sun", time: "17:00", fee: 10000 };
  const requests = [
    { id: "a", groupId: "g", studentId: "new", fee: 10000, expiresAt: 500, status: "reserved" },
    { id: "b", groupId: "g", studentId: "paid", fee: 10000, expiresAt: 100, status: "paid" },
    { id: "c", groupId: "g", studentId: "existing", fee: 10000, expiresAt: 100, status: "paid" },
  ] as const;
  expect(availableSeats(group, [...requests], 499)).toBe(0);
  expect(availableSeats(group, [...requests], 500)).toBe(1);
});

test("reserved seat becomes membership only after approval", async ({ page }) => {
  await page.goto("/groups");
  await page.getByRole("combobox", { name: "المادة", exact: true }).selectOption("english");
  const card = page.getByRole("article").first();
  const groupName = await card.getByRole("heading").innerText();
  await card.getByRole("button", { name: "انضم للمجموعة" }).click();
  await page.getByRole("button", { name: "احجز مكانك مؤقتًا" }).click();
  await page.getByRole("button", { name: "تأكيد الدفع التجريبي" }).click();
  await expect(page.getByRole("dialog")).toContainText("بانتظار موافقة الإدارة");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "لوحات التحكم", exact: true }).last().click();
  await page.locator('a[href="/student"]').click();
  await page.getByRole("navigation", { name: "أقسام لوحة الطالب" }).locator('a[href="/student/courses"]').click();
  await expect(page.getByText(groupName, { exact: true })).toHaveCount(0);
  await page.getByLabel("تبديل اللوحة").selectOption("admin");
  await page.getByRole("link", { name: "طلبات انضمام المجموعات", exact: true }).click();
  await page.getByRole("button", { name: "تأكيد الدفع والموافقة" }).click();
  await expect(page.getByRole("status")).toContainText("تم تفعيل العضوية");
  await page.getByLabel("تبديل اللوحة").selectOption("student");
  await page.getByRole("navigation", { name: "أقسام لوحة الطالب" }).locator('a[href="/student/courses"]').click();
  await expect(page.getByText(groupName, { exact: true })).toBeVisible();
  await page.getByLabel("تبديل اللوحة").selectOption("parent");
  await page.getByRole("navigation", { name: "أقسام لوحة ولي الأمر" }).locator('a[href="/parent/courses"]').click();
  await page.locator('a[href="/parent/courses/youssef"]').first().click();
  await expect(page.getByText(groupName, { exact: true })).toBeVisible();
});

test("a support member can publish a one-seat paid group and an expired hold frees the seat", async ({ page }) => {
  await page.clock.install();
  await page.goto("/workspace/support/group-requests");
  await page.getByRole("button", { name: "إنشاء مجموعة", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("اسم المجموعة").fill("مجموعة مكان واحد للاختبار");
  await dialog.getByLabel("سعة المجموعة").fill("1");
  await dialog.getByLabel("سعر الاشتراك بالجنيه").fill("125.50");
  await dialog.getByRole("combobox", { name: "يوم المجموعة" }).selectOption("wed");
  await dialog.getByLabel("وقت المجموعة بتوقيت القاهرة").fill("18:30");
  await dialog.getByRole("button", { name: "حفظ المجموعة في المعاينة" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("navigation", { name: "التنقل الرئيسي" }).getByRole("link", { name: "المجموعات الدراسية" }).click();
  const card = page.locator("article").filter({ hasText: "مجموعة مكان واحد للاختبار" });
  await expect(card).toContainText("1 من 1");
  await card.getByRole("button", { name: "انضم للمجموعة" }).click();
  await dialog.getByRole("button", { name: "احجز مكانك مؤقتًا" }).click();
  await expect(card).toContainText("0 من 1");
  await page.clock.fastForward(10 * 60 * 1000 + 1000);
  await expect(card).toContainText("1 من 1");
  await expect(dialog.getByRole("button", { name: "تأكيد الدفع التجريبي" })).toHaveCount(0);
});
