import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function changeRole(page: Page, role: string) {
  await page.getByLabel('تبديل اللوحة', { exact: true }).selectOption(role);
  await page.locator(`nav a[href="/${role}/schedule"]`).click();
  await expect(page).toHaveURL(new RegExp(`/${role}/schedule$`));
}
async function create(page: Page, title: string, course = 'math-prep-1') {
  await page.locator('#session-title').fill(title);
  await page.locator('#session-course').selectOption(course);
  await page.locator('#session-date').fill('2026-11-18');
  await page.locator('#session-time').fill(course === 'math-primary-4' ? '17:00' : '16:00');
  await page.getByRole('button', { name: 'إنشاء الحصة التجريبية', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
}
test('calendar scopes teacher, student and parent events, preserves child selection, and admin filters', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/teacher/sessions');
  await create(page, 'حصة يوسف بالكالندر');
  await create(page, 'حصة سلمى بالكالندر', 'math-primary-4');
  await page.locator('nav a[href="/teacher/schedule"]').click();
  await expect(page.getByRole('button', { name: /^حصة يوسف بالكالندر/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^حصة سلمى بالكالندر/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^القراءة وبناء المعنى/ })).toHaveCount(0);
  await changeRole(page, 'student');
  await expect(page.getByRole('button', { name: /^حصة يوسف بالكالندر/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^حصة سلمى بالكالندر/ })).toHaveCount(0);
  await changeRole(page, 'parent');
  await page.getByRole('button', { name: 'سلمى أحمد', exact: true }).click();
  await expect(page.getByRole('button', { name: /^حصة سلمى بالكالندر/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^حصة يوسف بالكالندر/ })).toHaveCount(0);
  await page.getByRole('button', { name: /^حصة سلمى بالكالندر/ }).click();
  await expect(page.getByRole('dialog')).toContainText('لم يسجل');
  await page.keyboard.press('Escape');
  await changeRole(page, 'admin');
  await expect(page.getByRole('button', { name: /^القراءة وبناء المعنى/ })).toBeVisible();
  await page.getByLabel('تصفية المدرس', { exact: true }).selectOption('ahmed-hassan');
  await expect(page.getByRole('button', { name: /^القراءة وبناء المعنى/ })).toHaveCount(0);
  await page.getByLabel('تصفية المجموعة', { exact: true }).selectOption('group-math-primary-4');
  await expect(page.locator('[data-calendar-event]')).toHaveCount(1);
  await page.getByRole('button', { name: /^حصة سلمى بالكالندر/ }).click();
  await expect(page.getByRole('dialog')).toContainText('سلمى أحمد');
  await expect(page.getByRole('dialog')).not.toContainText('يوسف أحمد');
  await page.keyboard.press('Escape');
  await page.getByLabel('حالة الحصة', { exact: true }).selectOption('cancelled');
  await expect(page.locator('[data-calendar-event]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
for (const width of [375, 768, 1440]) test(`all schedule pages render the shared accessible calendar at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  for (const role of ['student', 'teacher', 'parent', 'admin']) {
    await page.goto(`/${role}/schedule`);
    await expect(page.getByRole('heading', { name: 'كالندر الحصص', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'تقويم الحصص الأسبوعي القابل للتمرير', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'يوم', exact: true }).click();
    await expect(page.getByRole('region', { name: 'تقويم حصص اليوم', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /^فكرة جديدة في الرياضيات/ }).click();
    await expect(page.getByRole('dialog')).toContainText('الموعد — القاهرة');
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(scan.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'اليوم التالي', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: '0 حصص' })).toBeVisible();
  }
});
