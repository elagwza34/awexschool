import { expect, test } from "@playwright/test";

test("the retired dashboard routes return 404 and the admin portal requires login", async ({ page, request }) => {
  for (const path of ["/owner", "/owner/permissions", "/owner/settings"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  for (const path of ["/admin", "/admin/permissions", "/admin/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  }
});

test("study groups are linked from the desktop header and mobile menu", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto("/groups");
  const header = page.locator("[data-home-header]");
  await expect(header.getByRole("link", { name: "المجموعات الدراسية" })).toHaveAttribute("href", "/groups");

  await page.setViewportSize({ width: 375, height: 812 });
  await header.getByRole("button", { name: "فتح القائمة" }).click();
  await expect(header.getByRole("navigation", { name: "التنقل على الهاتف" })
    .getByRole("link", { name: "المجموعات الدراسية" })).toHaveAttribute("href", "/groups");
});

test("the Arabic login and signup flows are usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("تسجيل الدخول");
  const password = page.locator('input[name="password"]');
  await password.fill("not-a-production-password");
  await page.getByRole("button", { name: "إظهار كلمة المرور" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "إخفاء كلمة المرور" }).click();
  await expect(password).toHaveAttribute("type", "password");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await page.getByRole("link", { name: "تسجيل جديد" }).click();
  const kind = page.getByLabel("نوع الحساب");
  await expect(kind).toBeVisible();
  await expect(kind.locator("option")).toHaveText(["اختر نوع الحساب", "طالب", "ولي أمر"]);
  await kind.selectOption("parent");
  await expect(kind).toHaveValue("parent");
  await kind.selectOption("student");
  await expect(kind).toHaveValue("student");
  await expect(page.getByLabel("تأكيد كلمة المرور")).toHaveAttribute("autocomplete", "new-password");
  await expect(page.getByRole("link", { name: "انضم كمدرس" })).toHaveAttribute("href", "/teachers/apply");
});

test("password recovery accepts a pasted email code and a new password", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "نسيت كلمة المرور؟" }).click();
  await expect(page.getByRole("button", { name: "إرسال الكود" })).toBeVisible();
  await page.goto("/reset-password?step=code");
  const code = page.getByLabel("كود التفعيل");
  await expect(code).toHaveAttribute("autocomplete", "one-time-code");
  await code.fill("12345678");
  await expect(code).toHaveValue("12345678");
  await expect(page.getByRole("button", { name: "حفظ كلمة المرور الجديدة" })).toBeVisible();
});

test("signup activation offers email code entry and a separate resend form", async ({ page }) => {
  await page.goto("/register?message=code");
  await expect(page.getByLabel("كود التفعيل")).toHaveAttribute("autocomplete", "one-time-code");
  await expect(page.getByRole("button", { name: "تفعيل الحساب" })).toBeVisible();
  await page.getByText("الرسالة موصلتش؟ أعد الإرسال").click();
  await expect(page.getByRole("button", { name: "إعادة إرسال الكود" })).toBeVisible();
});

test("guest portal redirects do not wait for an unconfigured Supabase service", async ({ page }) => {
  await page.goto("/student", { timeout: 5_000 });
  await expect(page).toHaveURL(/\/login\?next=%2Fstudent$/);
});

test("guest users cannot open legacy portal previews or fictional courses", async ({ page }) => {
  await page.goto("/student/attendance");
  await expect(page).toHaveURL("/login?next=%2Fstudent%2Fattendance");
  const result = await page.goto("/courses/unpublished-verification-course");
  expect(result?.status()).toBe(404);
});

test("the old student profile link redirects to the merged account", async ({ request }) => {
  const response = await request.get("/student/profile", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  const destination = new URL(response.headers().location, response.url());
  expect(destination.pathname).toBe("/account");
  expect(destination.searchParams.get("portal")).toBe("student");
});
