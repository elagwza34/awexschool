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
