import { expect, test } from "@playwright/test";
import {
  courses,
  teachers,
  subjects,
  getTeachersForSubject,
} from "../src/features/catalog/mock-data";

test("each teacher has one subject and every assigned course matches it", () => {
  for (const teacher of teachers)
    expect(subjects.some((subject) => subject.id === teacher.subjectId)).toBe(
      true,
    );
  for (const course of courses) {
    const teacher = teachers.find((item) => item.id === course.teacherId);
    expect(teacher, course.id).toBeDefined();
    expect(teacher!.subjectId, course.id).toBe(course.subjectId);
  }
  expect(getTeachersForSubject("math").map((teacher) => teacher.id)).toEqual([
    "ahmed-hassan",
    "mahmoud-samir",
  ]);
});

test("subject page lists multiple teachers and does not mix unrelated subjects", async ({
  page,
}) => {
  await page.goto("/subjects/math");
  await expect(
    page.getByRole("heading", { name: "أ. أحمد حسن", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "أ. محمود سمير", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "أ. عمر سالم", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: /أ\. محمود سمير/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "لا توجد مقررات لهذا المدرس في المعاينة حاليًا",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/courses/physics-secondary-2");
  await expect(
    page.getByRole("link", { name: /مع أ\. خالد إبراهيم/ }),
  ).toBeVisible();
});

test("subject teacher cards scroll horizontally within the mobile row", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/subjects/math");
  const row = page.getByRole("region", { name: "بطاقات مدرسو المادة" });
  const cards = row.getByRole("link");
  await expect(cards).toHaveCount(2);
  expect(await row.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await cards.last().scrollIntoViewIfNeeded();
  await expect.poll(() => row.evaluate((element) => Math.abs(element.scrollLeft))).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await cards.last().click();
  await expect(page).toHaveURL("/teachers/mahmoud-samir");
});

test("the teachers directory stacks compact cards with portraits on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/teachers");
  let previousTop = -Infinity;
  for (const teacher of teachers) {
    const card = page.locator(`main a[href="/teachers/${teacher.id}"]`);
    await expect(card).toBeVisible();
    const portrait = card.locator("img");
    await portrait.scrollIntoViewIfNeeded();
    await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    const box = await card.evaluate((element) => ({
      top: element.getBoundingClientRect().top + window.scrollY,
      height: element.getBoundingClientRect().height,
    }));
    expect(box.top).toBeGreaterThan(previousTop);
    expect(box.height).toBeLessThan(120);
    previousTop = box.top;
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await page.locator('main a[href="/teachers/ahmed-hassan"]').click();
  await expect(page).toHaveURL("/teachers/ahmed-hassan");
});

test("the same teacher portrait is reused across public and dashboard views", async ({ page }) => {
  const paths = [
    "/", "/subjects/math", "/courses", "/courses/math-prep-1",
    "/teachers/ahmed-hassan", "/teacher/profile", "/student/chat",
  ];
  for (const path of paths) {
    await page.goto(path);
    const portrait = page.locator('main img[src="/teachers/ahmed-hassan.webp"]:visible').first();
    await expect(portrait).toBeVisible();
    await portrait.scrollIntoViewIfNeeded();
    await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  }
});

test("profile subject changes cannot contradict existing teaching assignments", async ({
  page,
}) => {
  await page.goto("/teacher/profile");
  const specialization = page.getByLabel("التخصص الأساسي", { exact: true });
  await expect(specialization).not.toHaveAttribute("multiple", "");
  await specialization.selectOption("science");
  await page
    .getByRole("button", { name: "حفظ الملف في المعاينة", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "كل مدرس مرتبط بمادة واحدة",
  );
  await page
    .getByRole("button", { name: "إلغاء التعديلات", exact: true })
    .click();
  await expect(specialization).toHaveValue("math");
});
