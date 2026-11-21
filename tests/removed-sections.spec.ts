import { expect, test } from "@playwright/test";

test("platform activity and latest updates are absent from every dashboard", async ({
  page,
}) => {
  for (const role of [
    "admin",
    "student",
    "teacher",
    "parent",
    "manager",
    "support",
  ]) {
    await page.goto(`/${role}`);
    await expect(
      page.getByRole("link", { name: "نشاط المنصة", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "آخر المستجدات", exact: true }),
    ).toHaveCount(0);
  }
  for (const route of [
    "/admin/reports",
    "/admin/activity",
    "/student/activity",
    "/parent/activity",
  ]) {
    expect((await page.goto(route))?.status()).toBe(404);
  }
});
