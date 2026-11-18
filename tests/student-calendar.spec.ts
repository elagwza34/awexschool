import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [375, 768, 1440]) {
  test(`weekly calendar renders its lessons without document overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/student/schedule");
    await expect(
      page.getByRole("heading", { name: "كالندر الحصص", exact: true }),
    ).toBeVisible();
    const calendar = page.getByRole("region", {
      name: "تقويم الحصص الأسبوعي القابل للتمرير",
      exact: true,
    });
    await expect(calendar.getByRole("button")).toHaveCount(3);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.getByRole("button", { name: "يوم", exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "تقويم حصص اليوم", exact: true })
        .getByRole("button"),
    ).toHaveCount(1);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
}

test("calendar lesson details, week controls, date picker, course filters and empty states work", async ({
  page,
}) => {
  await page.goto("/student/schedule");
  await page.getByRole("button", { name: /^فكرة جديدة في الرياضيات/ }).click();
  await expect(page.getByRole("dialog")).toContainText("أ. أحمد حسن");
  await expect(page.getByRole("dialog")).toContainText("Google Meet");
  await expect(page.getByRole("dialog")).toContainText(
    "لا يوجد رابط انضمام أو اجتماع حقيقي",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "الأسبوع التالي", exact: true })
    .click();
  await expect(
    page.getByText("لا توجد حصص في هذا الأسبوع.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "اليوم", exact: true }).click();
  await page
    .getByLabel("تصفية حسب المقرر", { exact: true })
    .selectOption("arabic-prep-1");
  const calendar = page.getByRole("region", {
    name: "تقويم الحصص الأسبوعي القابل للتمرير",
    exact: true,
  });
  await expect(calendar.getByRole("button")).toHaveCount(1);
  await expect(calendar.getByRole("button")).toHaveAccessibleName(
    /^القراءة وبناء المعنى/,
  );
  await page.getByLabel("انتقل إلى تاريخ", { exact: true }).fill("2026-11-17");
  await page.getByRole("button", { name: "يوم", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "تقويم حصص اليوم", exact: true })
      .getByRole("button"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "اليوم التالي", exact: true }).click();
  await expect(
    page.getByText("لا توجد حصص في هذا اليوم للمقرر المختار.", { exact: true }),
  ).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});

test("teacher preview lessons appear only for enrolled courses and overlapping events remain separate", async ({
  page,
}) => {
  await page.goto("/teacher/sessions");
  await page
    .getByLabel("عنوان الحصة", { exact: true })
    .fill("حصة رياضيات على الكالندر");
  await page.getByLabel("تاريخ الحصة", { exact: true }).fill("2026-11-15");
  await page.getByLabel("وقت البداية — القاهرة", { exact: true }).fill("16:30");
  await page
    .getByRole("button", { name: "إنشاء الحصة التجريبية", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page
    .getByLabel("عنوان الحصة", { exact: true })
    .fill("حصة ابتدائي غير مسندة للطالب");
  await page
    .getByLabel("المقرر المسند", { exact: true })
    .selectOption("math-primary-4");
  await page.getByLabel("وقت البداية — القاهرة", { exact: true }).fill("18:00");
  await page
    .getByRole("button", { name: "إنشاء الحصة التجريبية", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page
    .getByLabel("تبديل اللوحة", { exact: true })
    .selectOption("student");
  await page
    .getByRole("navigation", { name: "أقسام لوحة الطالب", exact: true })
    .getByRole("link", { name: "الجدول الأسبوعي", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /^حصة ابتدائي غير مسندة للطالب/ }),
  ).toHaveCount(0);
  const first = await page
    .getByRole("button", { name: /^فكرة جديدة في الرياضيات/ })
    .boundingBox();
  const second = await page
    .getByRole("button", { name: /^حصة رياضيات على الكالندر/ })
    .boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(
    first!.x + first!.width <= second!.x ||
      second!.x + second!.width <= first!.x,
  ).toBe(true);
  await page.getByRole("button", { name: /^حصة رياضيات على الكالندر/ }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "حصة رياضيات على الكالندر",
  );
});
