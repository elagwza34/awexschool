import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  courses,
  grades,
  stages,
  subjects,
  teachers,
} from "../src/features/catalog/mock-data";

test("the fixed global header stays above page content while scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/home-2");
  const header = page.getByRole("banner");
  const hero = page.getByRole("heading", { level: 1 });
  await expect(hero).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await header.evaluate((element) => getComputedStyle(element).position),
  ).toBe("fixed");
  const headerBox = await header.boundingBox();
  const heroBox = await hero.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(heroBox).not.toBeNull();
  expect(heroBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height);

  await page.evaluate(() => window.scrollTo(0, 400));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const scrolledHeaderBox = await header.boundingBox();
  expect(scrolledHeaderBox).not.toBeNull();
  expect(scrolledHeaderBox!.y).toBe(headerBox!.y);
  expect(scrolledHeaderBox!.height).toBe(headerBox!.height);
  await expect(header).toBeInViewport();
});

test("all public routes and fixture detail routes render; invalid resources return 404", async ({
  request,
}) => {
  test.slow();
  const paths = [
    "/",
    "/stages",
    "/subjects",
    "/courses",
    "/teachers",
    "/pricing",
    "/login",
    "/register",
    "/search",
    "/dashboards",
    "/student",
    "/student/courses",
    "/student/progress",
    "/student/schedule",
    "/student/profile",
    "/student/chat",
    "/teacher/chat",
    "/teacher/courses",
    "/teacher/schedule",
    "/teacher/progress",
    "/teacher/reviews",
    "/teacher",
    "/parent",
    "/admin",
    "/teacher/profile",
    "/teacher/sessions",
    "/admin/users",
    "/admin/content",
    "/admin/integrations",
    ...stages.map((s) => `/stages/${s.id}`),
    ...grades.map((g) => `/grades/${g.id}`),
    ...subjects.map((s) => `/subjects/${s.id}`),
    ...teachers.map((t) => `/teachers/${t.id}`),
    ...courses.flatMap((c) => [
      `/courses/${c.id}`,
      `/courses/${c.id}/lessons`,
      ...c.units.flatMap((u) => u.lessons.map((l) => `/lessons/${l.id}`)),
    ]),
  ];
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    expect(html, path).toContain('dir="rtl"');
    expect(html, path).toContain("<h1");
  }
  for (const path of [
    "/not-a-page",
    "/stages/unknown",
    "/grades/unknown",
    "/subjects/unknown",
    "/courses/unknown",
    "/teachers/unknown",
    "/lessons/unknown",
  ]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

for (const viewport of [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
]) {
  test(`RTL layout and overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const path of [
      "/",
      "/stages",
      "/stages/primary",
      "/grades/preparatory-1",
      "/subjects",
      "/courses",
      "/courses/math-prep-1",
      "/courses/math-prep-1/lessons",
      "/lessons/math-prep-1-u1-l1",
      "/teachers/ahmed-hassan",
      "/pricing",
      "/register",
      "/search?q=الرياضيات",
    ]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
      expect(await page.locator("html").getAttribute("lang")).toBe("ar");
      const size = await page.evaluate(() => ({
        content: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(size.content, path).toBeLessThanOrEqual(size.viewport);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (path === "/courses/math-prep-1" || path === "/register") {
        await page.screenshot({
          path: `test-results/${path === "/register" ? "register" : "course"}-${viewport.width}.png`,
          fullPage: true,
        });
      }
    }
    await page.goto("/");
    await page.screenshot({
      path: `test-results/home-${viewport.width}.png`,
      fullPage: true,
    });
  });
}

test("grade finder and mobile navigation work", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "فتح القائمة" });
  await menuButton.click();
  await expect(
    page.getByRole("navigation", { name: "التنقل على الهاتف" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("navigation", { name: "التنقل على الهاتف" }),
  ).toHaveCount(0);
  await expect(menuButton).toBeFocused();

  await page.goto("/home-2");
  const stage = page.getByLabel("المرحلة الدراسية", { exact: true });
  const grade = page.getByLabel("الصف الدراسي", { exact: true });
  await stage.selectOption("primary");
  await expect(grade).toHaveValue("primary-1");
  await expect(grade.locator("option")).toHaveCount(6);
  await grade.selectOption("primary-4");
  await page.getByRole("button", { name: "اكتشف مقرراتك" }).click();
  await expect(page).toHaveURL(/\/grades\/primary-4$/);
  await expect(
    page.getByRole("heading", { name: "الصف الرابع الابتدائي", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/courses?grade=primary-4&track=arabic"]'),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/courses?grade=primary-4&track=languages"]'),
  ).toBeVisible();
});

test("search, filters, query URLs, and empty states work", async ({ page }) => {
  await page.goto("/search");
  await page.getByLabel("عن إيه بتدور؟").fill("رياضيات");
  await page.getByRole("button", { name: "تطبيق" }).click();
  await expect(page).toHaveURL(/q=/);
  await expect(page.locator("article")).toHaveCount(2);
  await page
    .getByLabel("الصف الدراسي", { exact: true })
    .selectOption("primary-1");
  await expect(
    page.getByRole("heading", { name: "لم نجد نتائج مطابقة" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "مسح الفلاتر" }).click();
  await expect(page.locator("article")).toHaveCount(courses.length);
  await page.goto("/subjects/math?grade=primary-4");
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.getByLabel("الصف الدراسي", { exact: true })).toHaveValue(
    "primary-4",
  );
});

test("repeated and long query parameters remain safe and responsive", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(
    "/search?q=رياضيات&q=invalid&grade=preparatory-1&grade=unknown",
  );
  await expect(page.getByLabel("عن إيه بتدور؟")).toHaveValue("رياضيات");
  await expect(page.locator("article")).toHaveCount(1);
  await page.goto(`/search?q=${"a".repeat(400)}`);
  await expect(page.getByLabel("عن إيه بتدور؟")).toHaveValue("a".repeat(120));
  await expect(
    page.getByRole("heading", { name: "لم نجد نتائج مطابقة" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});

test("FAQ disclosures and retired lesson preview redirects work", async ({
  page,
}) => {
  await page.goto("/faq");
  const disclosure = page.locator("details").nth(1);
  const summary = disclosure.locator("summary");
  await expect(disclosure).not.toHaveAttribute("open", "");
  await summary.press("Enter");
  await expect(disclosure).toHaveAttribute("open", "");
  await expect(
    disclosure.getByText(
      "لا. شاشات الدخول والتسجيل ولوحات الأدوار للمعاينة فقط، ولا تنشئ حسابات فعلية.",
      { exact: true },
    ),
  ).toBeVisible();
  await summary.press("Enter");
  await expect(disclosure).not.toHaveAttribute("open", "");

  await page.goto("/lessons/math-prep-1-u1-l1");
  await expect(page).toHaveURL(/\/courses$/);
  await expect(
    page.getByRole("heading", { name: "المقررات الدراسية", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("ابحث عن مقرر", { exact: true })).toBeVisible();
});

test("pricing dialog traps focus and restores trigger focus", async ({
  page,
}) => {
  await page.goto("/pricing");
  const trigger = page
    .getByRole("button", { name: "عرض تفاصيل النموذج" })
    .first();
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("registration and login remain local demos without requests or storage", async ({
  page,
}) => {
  for (const path of ["/register", "/login"]) {
    await page.goto(path);
    const posts: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST") posts.push(req.url());
    });
    if (path === "/register")
      await page.getByLabel("الاسم في النموذج").fill("طالب تجريبي");
    await page
      .getByLabel("البريد الإلكتروني", { exact: true })
      .fill("demo@example.com");
    await page
      .getByLabel("كلمة المرور التجريبية", { exact: true })
      .fill("demo-password");
    await page.getByRole("button", { name: "إظهار كلمة المرور" }).click();
    await expect(
      page.getByLabel("كلمة المرور التجريبية", { exact: true }),
    ).toHaveAttribute("type", "text");
    await page
      .getByRole("button", {
        name:
          path === "/register" ? "معاينة إنشاء الحساب" : "معاينة تسجيل الدخول",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toContainText("لم يتم");
    expect(posts).toEqual([]);
    expect(
      await page.evaluate(() => localStorage.length + sessionStorage.length),
    ).toBe(0);
    await expect(
      page.getByLabel("البريد الإلكتروني", { exact: true }),
    ).toHaveValue("");
  }
});

test("representative routes and dialog pass automated WCAG checks", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/stages",
    "/courses",
    "/courses/math-prep-1",
    "/lessons/math-prep-1-u1-l1",
    "/teachers/ahmed-hassan",
    "/pricing",
    "/login",
    "/register",
    "/search?q=zzzz",
  ]) {
    await page.goto(path);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      scan.violations,
      `${path}: ${JSON.stringify(scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
  }
  await page.goto("/pricing");
  await page
    .getByRole("button", { name: "عرض تفاصيل النموذج" })
    .first()
    .click();
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});

test("public journeys have no browser errors or broken internal links", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (req) => {
    if (!req.url().startsWith("http://127.0.0.1:3100"))
      external.push(req.url());
  });
  const links = new Set<string>();
  for (const path of [
    "/",
    "/stages/preparatory",
    "/grades/preparatory-1",
    "/subjects/math",
    "/courses",
    "/courses/math-prep-1",
    "/courses/math-prep-1/lessons",
    "/lessons/math-prep-1-u1-l1",
    "/teachers",
    "/pricing",
    "/login",
    "/register",
  ]) {
    await page.goto(path);
    for (const href of await page
      .locator('a[href^="/"]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")!)))
      links.add(href);
  }
  for (const href of links)
    expect((await request.get(href)).ok(), href).toBe(true);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
