import { chromium, expect, test } from "@playwright/test";

test("group attachment is shared with members and visible to staff in read-only mode", async ({ page }) => {
  await page.goto("/workspace/teacher/group-chat?group=group-math-prep-1");
  const fileInput = page.getByLabel("إرفاق ملف أو صورة أو صوت");
  await expect(fileInput).toBeEnabled();
  await fileInput.setInputFiles({
    name: "practice.txt", mimeType: "text/plain", buffer: Buffer.from("Practice"),
  });
  await page.getByRole("button", { name: "إرسال في المعاينة" }).click();
  await expect(page.getByRole("log").getByRole("link", { name: "practice.txt" })).toBeVisible();
  await page.getByLabel("تبديل اللوحة").selectOption("support");
  await page.getByRole("link", { name: "مراقبة شات المجموعات" }).click();
  await page.locator('a[href$="group=group-math-prep-1"]').click();
  await expect(page.getByRole("log").getByRole("link", { name: "practice.txt" })).toBeVisible();
  await expect(page.getByRole("button", { name: "إرسال في المعاينة" })).toHaveCount(0);
});

test("a student cannot open an unrelated group by its direct link", async ({ page }) => {
  await page.goto("/workspace/student/group-chat?group=group-languages-english-secondary-3");
  await expect(page.getByRole("status")).toContainText("المجموعة دي مش متاحة");
  await expect(page.getByRole("log")).toHaveCount(0);
});

test("direct administration chat accepts an attachment without a text message", async ({ page }) => {
  await page.goto("/student/admin-chat");
  const fileInput = page.getByLabel("إرفاق ملف أو صورة أو صوت");
  await expect(fileInput).toBeEnabled();
  await fileInput.setInputFiles({
    name: "note.pdf", mimeType: "application/pdf", buffer: Buffer.from("Example attachment"),
  });
  await page.getByRole("button", { name: "إرسال في المعاينة" }).click();
  await expect(page.getByRole("log").getByRole("link", { name: "note.pdf" })).toBeVisible();
  await fileInput.setInputFiles({
    name: "note.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+cS3sAAAAASUVORK5CYII=", "base64"),
  });
  await page.getByRole("button", { name: "إرسال في المعاينة" }).click();
  await expect(page.getByRole("log").getByRole("img", { name: "note.png" })).toBeVisible();
});

test("a voice recording can be made and played from group chat", async ({ baseURL }) => {
  const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
  try {
    const page = await browser.newPage({ baseURL });
    await page.goto("/workspace/student/group-chat?group=group-math-prep-1");
    await page.getByRole("button", { name: "تسجيل صوتي", exact: true }).click();
    await expect(page.getByRole("button", { name: "إيقاف التسجيل" })).toBeVisible();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "إيقاف التسجيل" }).click();
    await expect(page.getByRole("button", { name: "إزالة المرفق" })).toBeVisible();
    await page.getByRole("button", { name: "إرسال في المعاينة" }).click();
    const audio = page.getByRole("log").locator("audio");
    await expect(audio).toBeVisible();
    await audio.evaluate((node: HTMLAudioElement) => node.play());
    await expect.poll(() => audio.evaluate((node: HTMLAudioElement) => node.currentTime)).toBeGreaterThan(0);
  } finally {
    await browser.close();
  }
});
