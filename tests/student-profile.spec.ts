import { expect, test } from "@playwright/test";

test("student profile edits remain local, update the header and reset on reload", async ({
  page,
}) => {
  await page.goto("/student/profile");
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.getByLabel("اسم الظهور", { exact: true }).fill("نور أحمد");
  await page
    .getByLabel("المرحلة الدراسية", { exact: true })
    .selectOption("primary");
  await expect(page.getByLabel("الصف الدراسي", { exact: true })).toHaveValue(
    "primary-1",
  );
  await page
    .getByLabel("الصف الدراسي", { exact: true })
    .selectOption("primary-4");
  await page
    .getByLabel("المنهج الدراسي", { exact: true })
    .selectOption("egypt-languages");
  await page
    .getByRole("button", { name: "حفظ البروفايل في المعاينة", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "تم حفظ البروفايل في المعاينة مؤقتًا",
  );
  await page
    .getByRole("navigation", { name: "أقسام لوحة الطالب", exact: true })
    .getByRole("link", { name: "نظرة عامة", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "أهلًا يا نور",
  );
  await page
    .getByRole("navigation", { name: "أقسام لوحة الطالب", exact: true })
    .getByRole("link", { name: "بروفايلي", exact: true })
    .click();
  await expect(page.getByLabel("اسم الظهور", { exact: true })).toHaveValue(
    "نور أحمد",
  );
  await expect(page.getByLabel("الصف الدراسي", { exact: true })).toHaveValue(
    "primary-4",
  );
  await expect(page.getByLabel("المنهج الدراسي", { exact: true })).toHaveValue(
    "egypt-languages",
  );
  expect(posts).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
  await page.reload();
  await expect(page.getByLabel("اسم الظهور", { exact: true })).toHaveValue(
    "يوسف أحمد",
  );
  await expect(page.getByLabel("الصف الدراسي", { exact: true })).toHaveValue(
    "preparatory-1",
  );
});
