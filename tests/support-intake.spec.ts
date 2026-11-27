import { expect, test } from "@playwright/test";

async function expectUrl(page: import("@playwright/test").Page, expected: string) {
  const destination = new URL(expected, "http://127.0.0.1:3100");
  await expect(page).toHaveURL((url) =>
    url.origin === destination.origin &&
    url.pathname === destination.pathname &&
    url.search === destination.search,
  );
}

async function expectNoPreviewIntake(page: import("@playwright/test").Page) {
  for (const label of ["اسمك", "نوع الطلب", "عنوان الطلب", "تفاصيل الطلب", "تبديل اللوحة"]) {
    await expect(page.getByLabel(label, { exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: "إرسال الطلب في المعاينة", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "قدّم شكوى أو طلب", exact: true })).toHaveCount(0);
  await expect(page.locator('a[href="/support/requests"]')).toHaveCount(0);
}

test("footer help labels lead to contact without a support intake form", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  for (const label of ["تواصل معنا", "ابعت لنا طلب"]) {
    const link = footer.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", "/contact");
    await link.click();
    await expectUrl(page, "/contact");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("main").locator("form")).toHaveCount(0);
    await expectNoPreviewIntake(page);
    await page.goto("/");
  }

  await page.goto("/track-request");
  await expectUrl(page, "/contact");
  await expect(page.getByRole("main").locator("form")).toHaveCount(0);
  await expectNoPreviewIntake(page);
});

test("support and retired help sections contain guests and hide the preview queue", async ({ page, request }) => {
  const support = await request.get("/support", { maxRedirects: 0 });
  expect(support.status()).toBe(307);
  const supportDestination = new URL(support.headers().location!, support.url());
  expect(`${supportDestination.pathname}${supportDestination.search}`).toBe("/login?next=%2Fsupport");
  await page.goto("/support");
  await expectUrl(page, "/login?next=%2Fsupport");
  await expect(page.getByRole("heading", { name: "تسجيل الدخول", exact: true })).toBeVisible();
  await expectNoPreviewIntake(page);

  const disabled: [string, string][] = [
    ["/support/requests", "/account?message=section-unavailable&portal=support"],
    ["/support/activity", "/account?message=section-unavailable&portal=support"],
    ["/parent/help", "/account?message=section-unavailable&portal=parent"],
    ["/student/help", "/account?message=section-unavailable&portal=student"],
  ];
  for (const [path, location] of disabled) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(307);
    const destination = new URL(response.headers().location!, response.url());
    expect(destination.origin, path).toBe(new URL(response.url()).origin);
    expect(`${destination.pathname}${destination.search}`, path).toBe(location);
    await page.goto(path);
    await expectUrl(page, "/login");
    await expectNoPreviewIntake(page);
  }

  await page.goto("/dashboards");
  await expectUrl(page, "/login");
  await expectNoPreviewIntake(page);
  expect((await request.get("/customer-service/requests")).status()).toBe(404);
});
