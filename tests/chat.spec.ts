import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("student and assigned teacher exchange preview messages without network delivery or storage", async ({
  page,
}) => {
  await page.goto("/student/chat");
  const effects: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" ||
      !request.url().startsWith("http://127.0.0.1:3100")
    )
      effects.push(request.url());
  });
  await expect(
    page
      .getByRole("list", { name: "قائمة المدرسين المرتبطين", exact: true })
      .getByRole("button"),
  ).toHaveCount(3);
  await expect(page.getByRole("button", { name: /نور إبراهيم/ })).toHaveCount(
    0,
  );
  await page
    .getByLabel("رسالتك", { exact: true })
    .fill("سؤال تجريبي من الطالب عن الجبر");
  await page
    .getByRole("button", { name: "إرسال في المعاينة", exact: true })
    .click();
  await expect(page.getByRole("log")).toContainText(
    "سؤال تجريبي من الطالب عن الجبر",
  );
  await page
    .getByLabel("تبديل اللوحة", { exact: true })
    .selectOption("teacher");
  await page
    .getByRole("navigation", { name: "أقسام لوحة المدرس", exact: true })
    .getByRole("link", { name: "شات الطلاب", exact: true })
    .click();
  await expect(
    page
      .getByRole("list", { name: "قائمة الطلاب المرتبطين", exact: true })
      .getByRole("button"),
  ).toHaveCount(2);
  await expect(page.getByRole("log")).toContainText(
    "سؤال تجريبي من الطالب عن الجبر",
  );
  await page
    .getByLabel("رسالتك", { exact: true })
    .fill("رد تجريبي من المدرس على السؤال");
  await page.getByLabel("رسالتك", { exact: true }).press("Enter");
  await expect(page.getByRole("log")).toContainText(
    "رد تجريبي من المدرس على السؤال",
  );
  await page
    .getByLabel("تبديل اللوحة", { exact: true })
    .selectOption("student");
  await page
    .getByRole("navigation", { name: "أقسام لوحة الطالب", exact: true })
    .getByRole("link", { name: "الشات", exact: true })
    .click();
  await expect(page.getByRole("log")).toContainText(
    "رد تجريبي من المدرس على السؤال",
  );
  expect(effects).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
  await page.reload();
  await expect(page.getByRole("log")).not.toContainText(
    "سؤال تجريبي من الطالب عن الجبر",
  );
});

test("unrelated conversation messages stay separate and contacts support search", async ({
  page,
}) => {
  await page.goto("/teacher/chat");
  await page.getByRole("button", { name: /سلمى أحمد/ }).click();
  await page
    .getByLabel("رسالتك", { exact: true })
    .fill("رسالة خاصة بسلمى في المعاينة");
  await page
    .getByRole("button", { name: "إرسال في المعاينة", exact: true })
    .click();
  await page
    .getByLabel("تبديل اللوحة", { exact: true })
    .selectOption("student");
  await page
    .getByRole("navigation", { name: "أقسام لوحة الطالب", exact: true })
    .getByRole("link", { name: "الشات", exact: true })
    .click();
  await expect(page.getByRole("log")).not.toContainText(
    "رسالة خاصة بسلمى في المعاينة",
  );
  await page.getByLabel("البحث في المحادثات", { exact: true }).fill("نور");
  await expect(
    page.getByText("لا توجد جهات اتصال مطابقة.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("البحث في المحادثات", { exact: true }).fill("العربية");
  await expect(
    page
      .getByRole("list", { name: "قائمة المدرسين المرتبطين", exact: true })
      .getByRole("button"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: /مريم عادل/ }).click();
  await expect(page.getByRole("log")).not.toContainText(
    "الفرق بين العدد النسبي",
  );
  await page.getByLabel("رسالتك", { exact: true }).fill("   ");
  await expect(
    page.getByRole("button", { name: "إرسال في المعاينة", exact: true }),
  ).toBeDisabled();
});

for (const width of [375, 768, 1440]) {
  test(`chat contacts, composer and accessibility work at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of ["/student/chat", "/teacher/chat"]) {
      await page.goto(path);
      const contacts = page.getByRole("list", {
        name: path.includes("student")
          ? "قائمة المدرسين المرتبطين"
          : "قائمة الطلاب المرتبطين",
        exact: true,
      });
      await contacts.getByRole("button").first().click();
      await expect(page.getByRole("log")).toBeVisible();
      await page.getByLabel("رسالتك", { exact: true }).fill("سطر أول");
      await page.getByLabel("رسالتك", { exact: true }).press("Shift+Enter");
      await page.getByLabel("رسالتك", { exact: true }).press("b");
      await expect(page.getByLabel("رسالتك", { exact: true })).toHaveValue(
        "سطر أول\nb",
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        path,
      ).toBeLessThanOrEqual(width);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        scan.violations,
        JSON.stringify(
          scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ),
      ).toEqual([]);
      if (width < 768) {
        await page
          .getByRole("button", { name: "رجوع للمحادثات", exact: true })
          .click();
        await expect(contacts).toBeVisible();
      }
    }
    expect(errors).toEqual([]);
  });
}
