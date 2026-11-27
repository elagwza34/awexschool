import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  courses,
  grades,
  stages,
  subjects,
  teachers,
} from "../src/features/catalog/mock-data";
import { safeLoginNextPath } from "../src/features/auth/auth-redirect";

async function expectUrl(page: Page, expected: string) {
  const destination = new URL(expected, "http://127.0.0.1:3100");
  await expect(page).toHaveURL((url) =>
    url.origin === destination.origin &&
    url.pathname === destination.pathname &&
    url.search === destination.search,
  );
}

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

test("200 public routes render RTL pages", async ({ request }) => {
  test.slow();
  const paths = [
    "/",
    "/home-2",
    "/stages",
    ...stages.map((stage) => `/stages/${stage.id}`),
    "/subjects",
    ...grades.map((grade) => `/grades/${grade.id}`),
    "/courses",
    "/teachers",
    "/groups",
    "/faq",
    "/contact",
    "/login",
    "/register",
    "/teachers/apply",
    "/teachers/track",
  ];
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    expect(html, path).toContain('dir="rtl"');
    expect(html, path).toContain("<h1");
  }
});

test("retired public routes redirect to their exact current destinations", async ({ page }) => {
  test.slow();
  const redirects: [string, string][] = [
    ["/search", "/courses"],
    ["/search?q=رياضيات", "/courses"],
    ["/pricing", "/courses"],
    ["/pricing?plan=family", "/courses"],
    ["/track-request", "/contact"],
    ...subjects.map((subject): [string, string] => [
      `/subjects/${subject.id}`,
      `/courses?subject=${subject.id}`,
    ]),
    ["/subjects/unknown", "/courses?subject=unknown"],
    [
      "/subjects/math?grade=primary-4&track=arabic",
      "/courses?subject=math&grade=primary-4&track=arabic",
    ],
    [
      "/subjects/unknown?grade=primary-4&track=languages",
      "/courses?subject=unknown&grade=primary-4&track=languages",
    ],
    ...courses.flatMap((course) => course.units.flatMap((unit) =>
      unit.lessons.map((lesson): [string, string] => [`/lessons/${lesson.id}`, "/courses"]),
    )),
    ["/lessons/unknown", "/courses"],
  ];
  for (const [from, to] of redirects) {
    await page.goto(from);
    await expectUrl(page, to);
  }
});

test("guest-denied portal routes redirect exactly and finish at login", async ({ page, request }) => {
  test.slow();
  const routes: [string, string][] = [
    ["/student", "/login?next=%2Fstudent"],
    ["/student/courses", "/login?next=%2Fstudent%2Fcourses"],
    ["/student/progress", "/account?message=section-unavailable&portal=student"],
    ["/student/schedule", "/login?next=%2Fstudent%2Fschedule"],
    ["/student/profile", "/account?portal=student"],
    ["/student/chat", "/login?next=%2Fstudent%2Fchat"],
    ["/teacher/chat", "/login?next=%2Fteacher%2Fchat"],
    ["/teacher/courses", "/login?next=%2Fteacher%2Fcourses"],
    ["/teacher/schedule", "/login?next=%2Fteacher%2Fschedule"],
    ["/teacher/progress", "/account?message=section-unavailable&portal=teacher"],
    ["/teacher/reviews", "/login?next=%2Fteacher%2Freviews"],
    ["/teacher", "/login?next=%2Fteacher"],
    ["/teacher/profile", "/login?next=%2Fteacher%2Fprofile"],
    ["/teacher/sessions", "/login?next=%2Fteacher%2Fsessions"],
    ["/parent", "/login?next=%2Fparent"],
    ["/admin", "/login?next=%2Fadmin"],
    ["/admin/users", "/account?message=section-unavailable&portal=admin"],
    ["/admin/content", "/account?message=section-unavailable&portal=admin"],
    ["/admin/integrations", "/login?next=%2Fadmin%2Fintegrations"],
    ["/support", "/login?next=%2Fsupport"],
    ["/support/requests", "/account?message=section-unavailable&portal=support"],
    ["/support/activity", "/account?message=section-unavailable&portal=support"],
    ["/parent/help", "/account?message=section-unavailable&portal=parent"],
    ["/student/help", "/account?message=section-unavailable&portal=student"],
  ];
  for (const [path, location] of routes) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(307);
    const destination = new URL(response.headers().location!, response.url());
    expect(destination.origin, path).toBe(new URL(response.url()).origin);
    expect(`${destination.pathname}${destination.search}`, path).toBe(location);

    const final = await request.get(path);
    expect(final.status(), path).toBe(200);
    const finalUrl = new URL(final.url());
    const expectedFinal = new URL(location.startsWith("/login?") ? location : "/login", response.url());
    expect(finalUrl.origin, path).toBe(expectedFinal.origin);
    expect(`${finalUrl.pathname}${finalUrl.search}`, path).toBe(
      `${expectedFinal.pathname}${expectedFinal.search}`,
    );
    expect(await final.text(), path).toContain("تسجيل الدخول");
  }

  await page.goto("/dashboards");
  await expectUrl(page, "/login");
  await expect(page.getByRole("heading", { name: "تسجيل الدخول", exact: true })).toBeVisible();
});

test("unavailable live detail routes and unknown resources return 404", async ({ request }) => {
  for (const path of [
    "/not-a-page",
    "/stages/unknown",
    "/grades/unknown",
    "/courses/unknown",
    ...courses.flatMap((course) => [`/courses/${course.id}`, `/courses/${course.id}/lessons`]),
    "/teachers/unknown",
    ...teachers.map((teacher) => `/teachers/${teacher.id}`),
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
      "/courses?q=الرياضيات&track=arabic",
      "/teachers",
      "/faq",
      "/contact",
      "/login",
      "/register",
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
      if (path === "/courses" || path === "/register") {
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

test("course search, filters, query URLs, and unavailable results work", async ({ page }) => {
  await page.goto("/courses");
  const search = page.getByRole("searchbox", { name: "ابحث عن مقرر", exact: true });
  const track = page.getByRole("combobox", { name: "المسار", exact: true });
  const unavailable = page.getByRole("main").getByRole("alert");
  await expect(unavailable).toContainText("تعذّر تحميل بيانات المقررات حاليًا.");
  await expect(page.locator('main a[href^="/courses/"]')).toHaveCount(0);

  await search.fill("رياضيات");
  await track.selectOption("arabic");
  await page.getByRole("button", { name: "بحث", exact: true }).click();
  await expect(page).toHaveURL((url) =>
    url.pathname === "/courses" &&
    url.searchParams.get("q") === "رياضيات" &&
    url.searchParams.get("grade") === "" &&
    url.searchParams.get("subject") === "" &&
    url.searchParams.get("track") === "arabic" &&
    [...url.searchParams.keys()].sort().join(",") === "grade,q,subject,track",
  );
  await expect(search).toHaveValue("رياضيات");
  await expect(track).toHaveValue("arabic");
  await expect(unavailable).toBeVisible();
  await expect(page.locator('main a[href^="/courses/"]')).toHaveCount(0);

  await search.fill("");
  await track.selectOption("");
  await page.getByRole("button", { name: "بحث", exact: true }).click();
  await expectUrl(page, "/courses?q=&grade=&subject=&track=");

  await page.goto("/subjects/math?grade=primary-4&track=languages");
  await expectUrl(page, "/courses?subject=math&grade=primary-4&track=languages");
  await expect(page.getByRole("combobox", { name: "الصف", exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "المادة", exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "المسار", exact: true })).toHaveValue("languages");
  await expect(unavailable).toBeVisible();
});

test("repeated and long course query parameters remain safe and responsive", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(
    "/courses?q=رياضيات&q=invalid&grade=preparatory-1&grade=unknown&track=languages",
  );
  const search = page.getByRole("searchbox", { name: "ابحث عن مقرر", exact: true });
  await expect(search).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "الصف", exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "المسار", exact: true })).toHaveValue("languages");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("تعذّر تحميل بيانات المقررات حاليًا.");
  await expect(page.locator('main a[href^="/courses/"]')).toHaveCount(0);

  const longQuery = "a".repeat(400);
  await page.goto(`/courses?q=${longQuery}`);
  await expect(search).toHaveValue(longQuery);
  await expect(search).toHaveAttribute("maxlength", "100");
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});

test("FAQ disclosures and retired lesson redirects work", async ({ page }) => {
  await page.goto("/faq");
  const disclosure = page.locator("details").nth(1);
  const summary = disclosure.locator("summary");
  await expect(disclosure).not.toHaveAttribute("open", "");
  await summary.press("Enter");
  await expect(disclosure).toHaveAttribute("open", "");
  await expect(disclosure.locator("p")).toBeVisible();
  await summary.press("Enter");
  await expect(disclosure).not.toHaveAttribute("open", "");

  await page.goto("/lessons/math-prep-1-u1-l1");
  await expectUrl(page, "/courses");
  await expect(
    page.getByRole("heading", { name: "المقررات الدراسية", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("ابحث عن مقرر", { exact: true })).toBeVisible();
});

test("retired pricing preview redirects to courses without a dialog", async ({ page }) => {
  await page.goto("/pricing");
  await expectUrl(page, "/courses");
  await expect(
    page.getByRole("heading", { name: "المقررات الدراسية", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "ابحث عن مقرر", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "عرض تفاصيل النموذج" })).toHaveCount(0);
});

test("real auth forms expose current labels, validation, visibility controls, and activation mode", async ({ page }) => {
  await page.goto("/login?next=%2Fcourses");
  await expect(page.getByRole("heading", { name: "تسجيل الدخول", exact: true })).toBeVisible();
  await expect(page.locator('input[type="hidden"][name="next"]')).toHaveValue("/courses");
  const loginForm = page.locator("main form");
  const loginEmail = page.getByLabel("البريد الإلكتروني", { exact: true });
  const loginPassword = page.getByLabel("كلمة المرور", { exact: true });
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  expect(await loginForm.evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(false);
  expect(await loginEmail.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  await loginEmail.fill("not-an-email");
  expect(await loginEmail.evaluate((input: HTMLInputElement) => input.validity.typeMismatch)).toBe(true);
  await loginPassword.fill("not-a-production-password");
  await page.getByRole("button", { name: "إظهار كلمة المرور", exact: true }).click();
  await expect(loginPassword).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "إخفاء كلمة المرور", exact: true }).click();
  await expect(loginPassword).toHaveAttribute("type", "password");

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "تسجيل جديد", exact: true })).toBeVisible();
  const registerForm = page.locator("main form");
  const password = page.getByLabel("كلمة المرور", { exact: true });
  const confirmation = page.getByLabel("تأكيد كلمة المرور", { exact: true });
  await page.getByRole("button", { name: "تسجيل جديد", exact: true }).click();
  expect(await registerForm.evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(false);
  await page.getByLabel("الاسم الكامل", { exact: true }).fill("زائر تجربة آمن");
  await page.getByLabel("البريد الإلكتروني", { exact: true }).fill("playwright-unavailable@example.com");
  await page.getByRole("combobox", { name: "نوع الحساب", exact: true }).selectOption("student");
  await password.fill("short");
  await confirmation.fill("short");
  expect(await password.evaluate((input: HTMLInputElement) => input.validity.tooShort)).toBe(true);
  expect(await registerForm.evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(false);
  await password.locator("..").getByRole("button", { name: "إظهار كلمة المرور", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  await password.locator("..").getByRole("button", { name: "إخفاء كلمة المرور", exact: true }).click();
  await confirmation.locator("..").getByRole("button", { name: "إظهار كلمة المرور", exact: true }).click();
  await expect(confirmation).toHaveAttribute("type", "text");
  await expect(page.getByText("استخدم ١٢ حرفًا على الأقل.", { exact: true })).toBeVisible();

  await page.goto("/register?message=confirm");
  await expect(page.getByRole("heading", { name: "تفعيل البريد الإلكتروني", exact: true })).toBeVisible();
  const code = page.getByLabel("كود التفعيل", { exact: true });
  await expect(code).toHaveAttribute("autocomplete", "one-time-code");
  await expect(code).toHaveAttribute("pattern", "[0-9]{6,10}");
  await expect(page.getByLabel("كلمة المرور", { exact: true })).toHaveCount(0);
  await page.getByText("الرسالة موصلتش؟ أعد الإرسال", { exact: true }).click();
  await expect(page.getByRole("button", { name: "إعادة إرسال الكود", exact: true })).toBeVisible();
});

test("valid fake auth submissions use same-origin Server Actions and do not store credentials", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const email = "playwright-unavailable@example.com";
  const password = "NotARealPassword!42";
  const posts: { url: string; method: string; nextAction: string | undefined }[] = [];
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(origin)) external.push(request.url());
    if (request.method() === "POST") {
      posts.push({
        url: request.url(),
        method: request.method(),
        nextAction: request.headers()["next-action"],
      });
    }
  });

  const cases = [
    { path: "/register", submit: "تسجيل جديد", message: "تعذّر إنشاء الحساب. جرّب مرة تانية بعد قليل." },
    { path: "/login?next=%2Fcourses", submit: "تسجيل الدخول", message: "تسجيل الدخول غير متاح حاليًا. جرّب مرة تانية." },
  ];
  for (const authCase of cases) {
    await page.goto(authCase.path);
    if (authCase.path === "/register") {
      await page.getByLabel("الاسم الكامل", { exact: true }).fill("زائر تجربة آمن");
      await page.getByRole("combobox", { name: "نوع الحساب", exact: true }).selectOption("student");
      await page.getByLabel("تأكيد كلمة المرور", { exact: true }).fill(password);
    }
    await page.getByLabel("البريد الإلكتروني", { exact: true }).fill(email);
    await page.getByLabel("كلمة المرور", { exact: true }).fill(password);
    const postsBefore = posts.length;
    const pathname = new URL(authCase.path, origin).pathname;
    await Promise.all([
      page.waitForURL((url) =>
        url.origin === origin &&
        url.pathname === pathname &&
        url.searchParams.get("message") === "unavailable",
      ),
      page.getByRole("button", { name: authCase.submit, exact: true }).click(),
    ]);
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(authCase.message);
    expect(posts.length).toBeGreaterThan(postsBefore);
    expect(posts.at(-1)).toMatchObject({ method: "POST" });
    expect(new URL(posts.at(-1)!.url).origin).toBe(origin);
    expect(new URL(posts.at(-1)!.url).pathname).toBe(pathname);
    expect(posts.at(-1)!.nextAction).toBeTruthy();
    await expect(page.getByLabel("البريد الإلكتروني", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("كلمة المرور", { exact: true })).toHaveValue("");
  }

  expect(external).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  const cookies = JSON.stringify(await page.context().cookies());
  expect(cookies).not.toContain(email);
  expect(cookies).not.toContain(password);
});

test("safe login next paths accept internal destinations and reject external or auth routes", () => {
  const fallback = "/account?from=login";
  for (const value of ["/courses", "/account?from=login", "/student/courses"]) {
    expect(safeLoginNextPath(value, fallback)).toBe(value);
  }
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "/%2f%2fevil.example",
    "/\\evil.example",
    "/login",
    "/register",
    "/not-a-portal",
    " /courses",
    undefined,
  ]) {
    expect(safeLoginNextPath(value, fallback)).toBe(fallback);
  }
});

test("representative current routes pass automated WCAG checks", async ({ page }) => {
  test.slow();
  for (const path of [
    "/",
    "/stages",
    "/courses",
    "/teachers",
    "/faq",
    "/contact",
    "/login",
    "/register",
    "/courses?q=zzzz&track=arabic",
    "/register?message=code",
  ]) {
    await page.goto(path);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      scan.violations,
      `${path}: ${JSON.stringify(scan.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) })))}`,
    ).toEqual([]);
  }
});

test("public journeys have no browser errors or broken internal links", async ({
  page,
  request,
  baseURL,
}) => {
  test.slow();
  const origin = new URL(baseURL!).origin;
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    if (!request.url().startsWith(origin)) external.push(request.url());
  });
  const links = new Set<string>();
  for (const path of [
    "/",
    "/stages/preparatory",
    "/grades/preparatory-1",
    "/subjects",
    "/subjects/math",
    "/courses",
    "/teachers",
    "/faq",
    "/contact",
    "/login",
    "/register",
  ]) {
    await page.goto(path);
    for (const href of await page
      .locator('a[href^="/"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")!)))
      links.add(href);
  }
  for (const href of links)
    expect((await request.get(href)).ok(), href).toBe(true);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
