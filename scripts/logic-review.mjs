import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const findings = [];
try {
  await page.goto("http://127.0.0.1:3000/admin/chat");
  const original = await page
    .locator('section[aria-label="شات الإدارة"] header h2')
    .textContent();
  await page.getByLabel("نوع المستخدم", { exact: true }).selectOption("parent");
  const retained = await page
    .locator('section[aria-label="شات الإدارة"] header h2')
    .textContent();
  findings.push({
    id: "chat-filter",
    filter: "parent",
    original,
    selectedAfterFilter: retained,
    unchanged: original === retained,
  });

  await page.goto("http://127.0.0.1:3000/teacher/profile");
  await page.getByLabel("اسم الظهور للطلاب", { exact: true }).fill("   ");
  await page
    .getByRole("button", { name: "حفظ الملف في المعاينة", exact: true })
    .click();
  findings.push({
    id: "blank-teacher-name",
    success: await page.getByRole("status").count(),
    blankName: await page
      .getByLabel("اسم الظهور للطلاب", { exact: true })
      .inputValue(),
  });

  await page.goto("http://127.0.0.1:3000/teacher/sessions");
  for (let i = 1; i <= 4; i++) {
    await page.locator("#session-title").fill(`حصة مراجعة ${i}`);
    await page.locator("#session-date").fill(`2026-11-${19 + i}`);
    await page.locator("#session-time").fill("17:00");
    await page
      .getByRole("button", { name: "إنشاء الحصة التجريبية", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
  }
  const beforeNavigation = await page.locator("main").innerText();
  await page.locator('nav a[href="/teacher/schedule"]').click();
  await page.waitForURL("**/teacher/schedule");
  await page.getByRole("heading", { level: 1 }).waitFor();
  findings.push({
    id: "schedule-truncation",
    beforeNavigation,
    scheduleText: await page.locator("main").innerText(),
    visibleFirst: await page.getByText("حصة مراجعة 1", { exact: true }).count(),
    visibleLatest: await page
      .getByText("حصة مراجعة 4", { exact: true })
      .count(),
  });
} finally {
  await browser.close();
}
await mkdir("docs/ui/qa", { recursive: true });
await writeFile(
  "docs/ui/qa/logic-review.json",
  JSON.stringify(findings, null, 2),
);
console.log(JSON.stringify(findings));
