import { expect, test } from "@playwright/test";
import { grades } from "../src/features/catalog/mock-data";

test("the hero leaves its background video paused when motion is reduced", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/kit-ready/);
  await expect(page.getByRole("button", { name: "تشغيل فيديو الخلفية" })).toBeVisible();
  const video = page.locator("video[data-film]");
  await expect(video).toHaveJSProperty("paused", true);
  expect(await video.getAttribute("src")).toBeNull();
});

test("the stages page links its languages card to the filtered catalog", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/stages");
  const card = page.getByRole("link", { name: /كورسات اللغات/ });
  await card.locator("img").scrollIntoViewIfNeeded();
  await expect.poll(() => card.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await card.click();
  await expect(page).toHaveURL("/courses?track=languages");
  await expect(page.getByRole("heading", { name: "كورسات اللغات", level: 1 })).toBeVisible();
  await expect(page.locator("article")).toHaveCount(grades.length * 2);
  await page.getByLabel("الصف الدراسي", { exact: true }).selectOption("preparatory-2");
  await expect(page).toHaveURL(/track=languages/);
  await expect(page.locator("article")).toHaveCount(2);
});

test("every grade provides Arabic and Languages tracks", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const grade of grades) {
    await page.goto(`/grades/${grade.id}`);
    const arabic = page.getByRole("tab", { name: "عربي", exact: true });
    const languages = page.getByRole("tab", { name: "لغات", exact: true });
    await expect(arabic).toHaveAttribute("aria-selected", "true");
    await arabic.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(languages).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel").locator("article")).toHaveCount(2);
    await arabic.click();
    if (grade.id === "primary-4") {
      await expect(page.getByRole("tabpanel").getByText("أصدقاء الأرقام")).toBeVisible();
    }
  }
});

test("a Languages lesson opens from its grade and shows an example and answer", async ({ page }) => {
  await page.goto("/grades/preparatory-2");
  await page.getByRole("tab", { name: "لغات" }).click();
  await page.getByRole("tabpanel").locator('a[href^="/subjects/english"]').click();
  await expect(page).toHaveURL(/track=languages/);
  await expect(page.locator("article")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Telling a Story in Order" })).toBeVisible();
  await page.getByRole("link", { name: "Talking About Experiences" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Talking About Experiences");
  await page.getByRole("link", { name: "شاهد معاينة مجانية" }).click();
  await expect(page).toHaveURL("/lessons/languages-english-preparatory-2-u1-l1");
  await expect(page.getByText("I have visited Aswan.", { exact: false })).toBeVisible();
  const next = page.getByRole("button", { name: "الفكرة التالية" });
  await next.click();
  await next.click();
  await expect(page.getByText("Have you ever visited Luxor?")).toBeVisible();
});

test("public and dashboard pages share the home header", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const banner = page.getByRole("banner");
  const globalNav = banner.getByRole("navigation", { name: "التنقل الرئيسي" });

  await page.goto("/stages/primary");
  await expect(banner).toHaveCount(1);
  await expect(globalNav.getByRole("link", { name: "المراحل الدراسية" }))
    .toHaveAttribute("aria-current", "page");

  await page.goto("/student");
  await expect(banner).toHaveCount(1);
  await expect(globalNav.getByRole("link", { name: "لوحات التحكم" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "أقسام لوحة الطالب" })).toBeVisible();
  await banner.getByRole("link", { name: "احجز حصة مجانية" }).click();
  await expect(page).toHaveURL("/#trial");
  await expect(page.locator("html")).toHaveClass(/kit-ready/);
  await expect(page.locator("#trial")).toBeInViewport();
});

test("each school stage card opens its academic years", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 812 });
  const stageYears = [
    ["kindergarten", 2],
    ["primary", 6],
    ["preparatory", 3],
    ["secondary", 3],
  ] as const;

  for (const [stage, years] of stageYears) {
    await page.goto("/");
    await page.locator(`#school-stages a[href="/stages/${stage}"]`).click();
    await expect(page).toHaveURL(`/stages/${stage}`);
    const yearLinks = page.locator(`main a[href^="/grades/${stage}-"]`);
    await expect(yearLinks).toHaveCount(years);
    await yearLinks.first().click();
    await expect(page).toHaveURL(`/grades/${stage}-1`);
  }
});

test("the landing page keeps its scroll scenes and Home 2 keeps the original catalog", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/kit-ready/);
  await expect(page.locator("[data-clock] b").first()).toHaveText(/^\d{2}:\d{2}$/);
  await expect(page.locator("[data-onair]").locator("xpath=../..")).toHaveClass(/pin-spacer/);
  await expect(page.locator("#school-stages")).toHaveClass(/kit-hpin/);
  await expect(page.locator("#school-stages article")).toHaveCount(5);
  await expect(page.locator("#school-platform")).toHaveCount(0);
  await expect(page.locator("header").getByRole("link", { name: "واتساب" })).toBeVisible();
  await expect(page.locator("footer").getByRole("link", { name: "واتساب" })).toHaveAttribute("href", "https://wa.me/201033150405");
  await page.goto("/home-2");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("فاهمها");
  await expect(page.locator("#school-platform section")).toHaveCount(6);
  await expect(page.locator("#find-grade select")).toHaveCount(2);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "فتح القائمة" }).click();
  await expect(page.locator("#mobile-navigation").getByRole("link", { name: "واتساب" })).toBeVisible();
});

test("mobile visitors can browse the gallery and prepare the WhatsApp trial request", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    window.open = (url) => {
      document.documentElement.dataset.testOpenedUrl = String(url);
      return null;
    };
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/kit-calm/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);

  await page.locator("#posts [data-lb]").first().click();
  const gallery = page.getByRole("dialog", { name: "معرض الصور" });
  await expect(gallery).toBeVisible();
  const caption = gallery.locator("figcaption");
  const first = await caption.textContent();
  await gallery.getByRole("button", { name: "التالي" }).click();
  await expect(caption).not.toHaveText(first ?? "");
  await page.keyboard.press("Escape");
  await expect(gallery).toBeHidden();

  const form = page.locator("#trial-form");
  await form.locator("button[type=submit]").click();
  await expect(form.getByRole("alert")).toBeVisible();
  await form.locator("[name=parent]").fill("Test Parent");
  await form.locator("[name=phone]").fill("01000000000");
  await form.locator("button[type=submit]").click();
  await expect(form.getByRole("status")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-test-opened-url",
    /^https:\/\/wa\.me\/201033150405\?text=.*Test%20Parent.*01000000000/,
  );
  await form.locator("[data-ok-new]").click();
  await expect(form.locator("[name=parent]")).toBeEmpty();
});
