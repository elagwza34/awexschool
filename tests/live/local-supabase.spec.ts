import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseEnvironment } from "../../src/lib/environment";

let localEnvironment: ReturnType<typeof readSupabaseEnvironment> = null;
let skipReason = "BLOCKED: set LIVESCHOOL_LIVE_TESTS=1 with explicitly allowlisted local-only Supabase keys.";

if (process.env.LIVESCHOOL_LIVE_TESTS === "1") {
  try {
    localEnvironment = readSupabaseEnvironment();
  } catch (error) {
    skipReason = `BLOCKED: ${error instanceof Error ? error.message : "unsafe local test environment"}`;
  }
}

const enabled = Boolean(localEnvironment?.key && localEnvironment.secretKey);
test.skip(!enabled, skipReason);

function localAdmin() {
  if (!localEnvironment?.secretKey) throw new Error("Local Supabase credentials are unavailable.");
  return createClient(localEnvironment.url, localEnvironment.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function login(page: Page, email: string, password: string, destination: "/student" | "/admin") {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).toHaveURL(new RegExp(`${destination}(?:[?#]|$)`));
}

for (const kind of ["student", "parent"] as const) {
  test(`local ${kind} signup persists metadata and the triggered account role`, async ({ page }) => {
    const admin = localAdmin();
    const email = `phase-01-${kind}-${randomUUID()}@example.test`;
    const password = `Local-test-${randomUUID()}`;
    let userId: string | undefined;
    try {
      await page.goto("/register");
      await page.getByLabel("الاسم الكامل").fill("Local QA Learner");
      await page.getByLabel("البريد الإلكتروني").fill(email);
      await page.getByLabel("نوع الحساب").selectOption(kind);
      await page.getByLabel("كلمة المرور", { exact: true }).fill(password);
      await page.getByLabel("تأكيد كلمة المرور").fill(password);
      await page.getByRole("button", { name: "تسجيل جديد" }).click();
      await expect(page).toHaveURL(/\/register\?message=confirm$/);

      const { data: users, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      expect(error).toBeNull();
      const user = users.users.find(({ email: candidate }) => candidate?.toLowerCase() === email);
      expect(user).toBeDefined();
      userId = user!.id;
      expect(user!.user_metadata).toMatchObject({ display_name: "Local QA Learner", account_kind: kind });
      const roles = await admin.from("account_roles").select("role_code").eq("user_id", userId);
      expect(roles.error).toBeNull();
      expect(roles.data).not.toBeNull();
      expect(roles.data!.map(({ role_code }) => role_code)).toEqual([kind]);
    } finally {
      if (userId) await admin.auth.admin.deleteUser(userId);
    }
  });
}

test("local role gates protect admin and fixture chat remains read-only", async ({ page, browser, baseURL }) => {
  const admin = localAdmin();
  const studentPassword = `Local-test-${randomUUID()}`;
  const adminPassword = `Local-test-${randomUUID()}`;
  const student = await admin.auth.admin.createUser({
    email: `phase-01-student-${randomUUID()}@example.test`, password: studentPassword,
    email_confirm: true, user_metadata: { display_name: "Local QA Student", account_kind: "student" },
  });
  expect(student.error).toBeNull();
  const studentId = student.data.user!.id;
  let adminId: string | undefined;
  try {
    const administrator = await admin.auth.admin.createUser({
      email: `phase-01-admin-${randomUUID()}@example.test`, password: adminPassword,
      email_confirm: true, user_metadata: { display_name: "Local QA Admin", account_kind: "student" },
    });
    expect(administrator.error).toBeNull();
    adminId = administrator.data.user!.id;
    const assigned = await admin.rpc("assign_created_account_role", { account_id: adminId, assigned_role: "admin" });
    expect(assigned.error).toBeNull();
    expect(assigned.data).toBe(true);

    await login(page, student.data.user!.email!, studentPassword, "/student");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/\?message=denied$/);

    const writes: string[] = [];
    page.on("request", (request) => {
      if (/\/storage\/v1\/object\/upload|\/rpc\/send_direct_chat/.test(request.url())) writes.push(request.url());
    });
    await page.goto("/student/chat");
    await expect(page.getByRole("main").getByRole("status")).toContainText("الشات للعرض فقط حاليًا");
    await expect(page.locator("textarea")).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    expect(writes).toEqual([]);

    const adminContext = await browser.newContext({ baseURL });
    try {
      const adminPage = await adminContext.newPage();
      await login(adminPage, administrator!.data.user!.email!, adminPassword, "/admin");
      await adminPage.goto("/admin");
      await expect(adminPage).toHaveURL(/\/admin$/);
    } finally {
      await adminContext.close();
    }
  } finally {
    await admin.auth.admin.deleteUser(studentId);
    if (adminId) await admin.auth.admin.deleteUser(adminId);
  }
});
