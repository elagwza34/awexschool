import { expect, test } from "@playwright/test";

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

test("the school landing page keeps its scroll scenes and the existing catalog", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/kit-ready/);
  await expect(page.locator("[data-clock] b").first()).toHaveText(/^\d{2}:\d{2}$/);
  await expect(page.locator("[data-onair]").locator("xpath=../..")).toHaveClass(/pin-spacer/);
  await expect(page.locator("#school-stages")).toHaveClass(/kit-hpin/);
  await expect(page.locator("#school-stages article")).toHaveCount(5);
  await expect(page.locator("#school-platform section")).toHaveCount(9);
  await expect(page.locator("#find-grade select")).toHaveCount(2);
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
