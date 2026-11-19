import { expect, test } from "@playwright/test";
import { classHasEnded, parseSessionRate, teacherTotals } from "../src/features/finance/logic";

test("Cairo class end, exact currency amounts, and teacher balances", () => {
  const session = { date: "2026-11-18", time: "17:00", duration: 60 };
  expect(classHasEnded(session, new Date("2026-11-18T15:59:59Z"))).toBe(false);
  expect(classHasEnded(session, new Date("2026-11-18T16:00:00Z"))).toBe(true);
  expect(parseSessionRate("125.05")).toBe(12505);
  expect(parseSessionRate("0")).toBeUndefined();
  expect(parseSessionRate("12.345")).toBeUndefined();
  expect(teacherTotals([
    { teacherId: "a", amount: 12505, paidAt: undefined },
    { teacherId: "a", amount: 15000, paidAt: "2026-11-19" },
    { teacherId: "b", amount: 30000, paidAt: undefined },
  ], "a")).toEqual({ count: 2, earned: 27505, paid: 15000, due: 12505 });
});

test("approved classes retain their rates and payout clears only the outstanding balance", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-19T14:00:00Z"));
  await page.goto("/teacher/sessions");
  for (const [title, date] of [
    ["حصة معتمدة أولى", "2026-11-16"],
    ["حصة معتمدة ثانية", "2026-11-17"],
    ["حصة اتلغت", "2026-11-18"],
    ["حصة لسه جاية", "2026-11-20"],
  ]) {
    await page.getByLabel("عنوان الحصة", { exact: true }).fill(title);
    await page.getByLabel("تاريخ الحصة", { exact: true }).fill(date);
    await page.getByRole("button", { name: "إنشاء الحصة التجريبية", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
  }
  await page.getByRole("article").filter({ hasText: "حصة اتلغت" }).getByRole("button", { name: "إلغاء الحصة", exact: true }).click();
  await page.getByLabel("سبب إلغاء الحصة").fill("الحصة لم تنعقد");
  await page.getByRole("button", { name: "تأكيد إلغاء الحصة" }).click();
  await page.getByLabel("تبديل اللوحة").selectOption("admin");
  await page.getByRole("link", { name: "مستحقات المدرسين", exact: true }).click();
  await expect(page.getByText("حصة لسه جاية", { exact: true })).toHaveCount(0);
  await expect(page.getByText("حصة اتلغت", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "تأكيد تقديم الحصة" }).first()).toBeDisabled();
  for (const [title, rate] of [["حصة معتمدة أولى", "125.05"], ["حصة معتمدة ثانية", "150"]]) {
    await page.getByLabel("سعر الحصة بالجنيه").fill(rate);
    await page.getByRole("button", { name: "حفظ سعر الحصة" }).click();
    await page.getByRole("listitem").filter({ hasText: title }).getByRole("button", { name: "تأكيد تقديم الحصة" }).click();
  }
  await expect(page.getByText("٢٧٥٫٠٥", { exact: false })).toHaveCount(2);
  await page.getByRole("button", { name: "تسجيل صرف الرصيد" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "تأكيد تسجيل الصرف" }).click();
  await expect(page.getByRole("button", { name: "تسجيل صرف الرصيد" })).toHaveCount(0);

  await page.getByLabel("تبديل اللوحة").selectOption("teacher");
  await page.getByRole("navigation", { name: "أقسام لوحة المدرس" })
    .getByRole("link", { name: "مستحقاتي", exact: true }).click();
  await expect(page.getByText("تم تسجيل الصرف", { exact: true })).toHaveCount(2);
  await expect(page.getByText("١٢٥٫٠٥", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "حفظ سعر الحصة" })).toHaveCount(0);
});
