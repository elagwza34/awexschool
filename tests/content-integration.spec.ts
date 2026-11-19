import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { courses } from '../src/features/catalog/mock-data';
const title = 'مقرر الرحلة الموحّدة';

test('curriculum filters carry the selected grade, track and subject into a new draft', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/admin');
  await page.getByRole('link', { name: 'إدارة المناهج', exact: true }).click();
  await expect(page).toHaveURL('/admin/curricula');
  await page.getByLabel('المرحلة الدراسية', { exact: true }).selectOption('preparatory');
  await page.getByLabel('تصفية صف المحتوى', { exact: true }).selectOption('preparatory-2');
  await page.getByLabel('تصفية مسار المحتوى', { exact: true }).selectOption('languages');
  await page.getByLabel('مادة المنهج', { exact: true }).selectOption('english');
  const expectedCourses = courses.filter(({ gradeId, track, subjectId }) =>
    gradeId === 'preparatory-2' && track === 'languages' && subjectId === 'english',
  );
  await expect(page.locator('article[data-content-id]')).toHaveCount(expectedCourses.length);
  await expect(page.getByRole('heading', { name: 'Talking About Experiences' })).toBeVisible();

  await page.getByRole('button', { name: 'إنشاء مقرر' }).click();
  const editor = page.getByRole('dialog');
  await expect(editor.getByLabel('صف المقرر', { exact: true })).toHaveValue('preparatory-2');
  await expect(editor.getByLabel('مسار المقرر')).toHaveValue('languages');
  await expect(editor.getByLabel('مدرس المقرر')).toHaveValue('nour-ibrahim');
  await editor.getByLabel('عنوان المقرر').fill('مقرر إنجليزي جديد');
  await editor.getByLabel('وصف المقرر').fill('مسودة لمقرر إضافي في مسار اللغات.');
  await editor.getByRole('button', { name: 'حفظ مسودة المقرر' }).click();
  await expect(page.getByRole('heading', { name: 'مقرر إنجليزي جديد' })).toBeVisible();
  await page.getByLabel('المرحلة الدراسية', { exact: true }).selectOption('primary');
  await expect(page.getByLabel('تصفية صف المحتوى', { exact: true })).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'مقرر إنجليزي جديد' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});
async function navigate(page: Page, role: string, section: string) {
  const switcher = page.getByLabel('تبديل اللوحة', { exact: true });
  if (await switcher.inputValue() !== role) await switcher.selectOption(role);
  await page.locator(`nav a[href="/${role}/${section}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/${role}/${section}$`));
}
function editorial(page: Page) { return page.locator('article[data-content-id]').filter({ has: page.getByRole('heading', { name: title, exact: true }) }); }
async function draft(page: Page, track?: "arabic" | "languages") {
  await page.goto('/teacher/content');
  await page.getByRole('button', { name: 'إنشاء مقرر', exact: true }).click();
  const dialog = page.getByRole('dialog');
  if (track) {
    await expect(dialog.getByLabel('مسار المقرر', { exact: true })).toHaveValue('arabic');
    await dialog.getByLabel('مسار المقرر', { exact: true }).selectOption(track);
  }
  await dialog.getByLabel('عنوان المقرر', { exact: true }).fill(title);
  await dialog.getByLabel('وصف المقرر', { exact: true }).fill('تعلم الرياضيات من خلال مقرر موحّد بين كل اللوحات.');
  await dialog.getByRole('button', { name: 'إضافة وحدة', exact: true }).click();
  const unit = dialog.locator('form > details').first();
  await unit.locator(':scope > summary').click();
  await unit.getByLabel('عنوان الوحدة', { exact: true }).fill('وحدة الربط');
  await unit.getByRole('button', { name: 'إضافة درس', exact: true }).click();
  const lesson = unit.locator('details').first();
  await lesson.locator('summary').click();
  await lesson.getByLabel('عنوان الدرس', { exact: true }).fill('درس الفهم المشترك');
  await lesson.getByLabel('أهداف الدرس (هدف في كل سطر)', { exact: true }).fill('تطبيق خطوات الحل');
  await lesson.getByLabel('نص الدرس', { exact: true }).fill('هذا هو النص المعتمد الأول للمقرر الجديد.');
  await lesson.getByRole('button', { name: 'إضافة مورد', exact: true }).click();
  await lesson.getByLabel('عنوان المورد', { exact: true }).fill('تدريب مشترك');
  await lesson.getByLabel('مرجع المورد', { exact: true }).fill('shared-practice.pdf');
  await dialog.getByRole('button', { name: 'حفظ مسودة المقرر', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  return (await editorial(page).getAttribute('data-content-id'))!;
}
async function publish(page: Page) {
  await editorial(page).getByRole('button', { name: 'إرسال للمراجعة', exact: true }).click();
  await navigate(page, 'admin', 'content');
  await editorial(page).getByRole('button', { name: 'اعتماد ونشر تجريبي', exact: true }).click();
}
async function enroll(page: Page, id: string) {
  await navigate(page, 'admin', 'enrollments');
  await page.getByRole('button', { name: 'إنشاء مجموعة', exact: true }).click();
  await page.getByLabel('اسم المجموعة', { exact: true }).fill('مجموعة الرحلة');
  await page.getByLabel('مقرر المجموعة', { exact: true }).selectOption(id);
  await page.getByLabel(/يوسف أحمد ·/).check();
  await page.getByRole('button', { name: 'حفظ المجموعة في المعاينة', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
test('published course flows through groups, teacher and learner readers, sessions, calendar, assignments and chat', async ({ page }) => {
  const errors: string[] = [], writes: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (['POST','PUT','PATCH','DELETE'].includes(r.method())) writes.push(r.url()); });
  const id = await draft(page, "languages");
  await editorial(page).getByRole('button', { name: 'معاينة نسخة العمل' }).click();
  await expect(page.getByRole('dialog')).toContainText('المسار: لغات');
  await expect(page.getByRole('dialog')).toContainText('الصف الأول الإعدادي');
  await page.keyboard.press('Escape');
  await navigate(page, 'teacher', 'courses');
  await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  await navigate(page, 'teacher', 'content');
  await publish(page);
  await navigate(page, 'student', 'library');
  await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  await enroll(page, id);
  await navigate(page, 'teacher', 'courses');
  const courseCard = page.locator('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await expect(courseCard).toContainText('1 وحدات');
  await expect(courseCard).toContainText('1 دروس');
  await courseCard.getByRole('link', { name: 'معاينة المقرر', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/teacher/learn/${id}$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  await navigate(page, 'student', 'courses');
  await page.getByRole('link', { name: title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/student/learn/${id}$`));
  await expect(page.getByText('المسار: لغات', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /درس الفهم المشترك/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('درس الفهم المشترك');
  await expect(page.getByText('هذا هو النص المعتمد الأول للمقرر الجديد.', { exact: true })).toBeVisible();
  await expect(page.getByText('shared-practice.pdf', { exact: true })).toBeVisible();
  await navigate(page, 'student', 'library');
  await page.locator(`article[data-published-content="${id}"]`).getByRole('link', { name: 'فتح المقرر', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/student/learn/${id}$`));
  await navigate(page, 'parent', 'courses');
  await page.getByRole('link', { name: /يوسف أحمد/ }).click();
  await page.getByRole('link', { name: title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/parent/learn/${id}\\?student=youssef$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  await navigate(page, 'teacher', 'sessions');
  await page.locator('#session-title').fill('حصة المقرر الجديد');
  await page.locator('#session-course').selectOption(id);
  await page.locator('#session-date').fill('2026-11-18');
  await page.locator('#session-time').fill('16:00');
  await page.getByRole('button', { name: 'إنشاء الحصة التجريبية', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await navigate(page, 'student', 'schedule');
  await page.getByRole('button', { name: /^حصة المقرر الجديد/ }).click();
  await expect(page.getByRole('dialog')).toContainText(title);
  await page.getByRole('link', { name: 'عرض المقرر', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/student/learn/${id}$`));
  await navigate(page, 'teacher', 'assignments');
  await page.getByLabel('عنوان الواجب', { exact: true }).fill('واجب المقرر الجديد');
  await page.getByLabel('مجموعة الواجب', { exact: true }).selectOption({ label: 'مجموعة الرحلة' });
  await page.getByLabel('تعليمات الواجب', { exact: true }).fill('طبّق الدرس المعتمد على المثال.');
  await page.getByLabel('آخر يوم للتسليم', { exact: true }).fill('2099-11-18');
  await page.getByRole('button', { name: 'نشر الواجب التجريبي', exact: true }).click();
  await navigate(page, 'student', 'assignments');
  await expect(page.getByRole('heading', { name: 'واجب المقرر الجديد', exact: true })).toBeVisible();
  await navigate(page, 'student', 'chat');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]); expect(writes).toEqual([]);
});
test('unpublishing blocks new use and readers but preserves groups, sessions and assigned work', async ({ page }) => {
  const id = await draft(page); await publish(page); await enroll(page, id);
  await navigate(page, 'teacher', 'sessions');
  await page.locator('#session-title').fill('حصة تاريخية محفوظة');
  await page.locator('#session-course').selectOption(id);
  await page.locator('#session-date').fill('2026-11-18');
  await page.locator('#session-time').fill('16:00');
  await page.getByRole('button', { name: 'إنشاء الحصة التجريبية', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
  await navigate(page, 'admin', 'content');
  await editorial(page).getByRole('button', { name: 'إيقاف النشر التجريبي', exact: true }).click();
  await page.getByLabel('سبب الإجراء', { exact: true }).fill('مراجعة مؤقتة');
  await page.getByRole('button', { name: 'تأكيد الإجراء', exact: true }).click();
  await navigate(page, 'admin', 'enrollments');
  await expect(page.getByRole('heading', { name: 'مجموعة الرحلة', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'إنشاء مجموعة', exact: true }).click();
  await expect(page.getByLabel('مقرر المجموعة', { exact: true }).locator(`option[value="${id}"]`)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await navigate(page, 'teacher', 'sessions');
  await expect(page.locator(`#session-course option[value="${id}"]`)).toHaveCount(0);
  await navigate(page, 'teacher', 'assignments');
  await expect(page.getByLabel('مجموعة الواجب', { exact: true }).locator('option').filter({ hasText: 'مجموعة الرحلة' })).toHaveCount(0);
  await navigate(page, 'student', 'schedule');
  await page.getByRole('button', { name: /^حصة تاريخية محفوظة/ }).click();
  await expect(page.getByRole('dialog')).toContainText(title);
  await page.getByRole('link', { name: 'عرض المقرر', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'المحتوى غير متاح', exact: true })).toBeVisible();
  await expect(page.getByText('هذا هو النص المعتمد الأول للمقرر الجديد.', { exact: true })).toHaveCount(0);
});
test('unlinked child and student are denied, and draft revisions never replace the published reader', async ({ page }) => {
  const id = await draft(page); await publish(page); await enroll(page, id);
  await navigate(page, 'teacher', 'content');
  await editorial(page).getByRole('button', { name: 'تعديل المحتوى', exact: true }).click();
  await page.getByLabel('مسار المقرر', { exact: true }).selectOption('languages');
  await page.getByLabel('وصف المقرر', { exact: true }).fill('هذا وصف مسودة غير معتمد يجب ألا يظهر للطالب.');
  await page.getByRole('button', { name: 'حفظ مسودة المقرر', exact: true }).click();
  const trackFilter = page.getByLabel('تصفية مسار المحتوى', { exact: true });
  await trackFilter.selectOption('arabic');
  await expect(editorial(page)).toHaveCount(0);
  await trackFilter.selectOption('languages');
  await expect(editorial(page)).toBeVisible();
  await navigate(page, 'student', 'courses');
  await page.getByRole('link', { name: title, exact: true }).click();
  await expect(page.getByText('المسار: عربي', { exact: true })).toBeVisible();
  await expect(page.getByText('هذا وصف مسودة غير معتمد يجب ألا يظهر للطالب.', { exact: true })).toHaveCount(0);
  await navigate(page, 'parent', 'courses');
  await page.getByRole('link', { name: /سلمى أحمد/ }).click();
  await expect(page.getByRole('link', { name: title, exact: true })).toHaveCount(0);
  await page.evaluate(id => window.history.pushState({}, '', `/parent/learn/${id}?student=salma`), id);
  // Navigate with a same-layout Next link so preview state is retained.
  await page.evaluate(id => { const a = document.createElement('a'); a.href = `/parent/learn/${id}?student=salma`; a.id = 'scope-link'; document.body.appendChild(a); }, id);
  await page.locator('#scope-link').evaluate(link => link.removeAttribute('href'));
  await page.getByLabel('تبديل اللوحة', { exact: true }).selectOption('student');
  await page.locator('nav a[href="/student/courses"]').click();
  await page.getByRole('link', { name: title, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
});
for (const width of [375,768,1440]) test(`shared course and lesson reader is accessible and responsive at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/student/learn/math-prep-1');
  await page.getByRole('link', { name: /كيف نفهم الأعداد/ }).count();
  for (const role of ['student', 'teacher', 'parent', 'admin']) {
    await page.goto(`/${role}/learn/math-prep-1${role === 'parent' ? '?student=youssef' : ''}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const lessonLink = page.getByRole('link').filter({ hasText: 'دقيقة' }).first();
    await lessonLink.click();
    await expect(page.getByRole('heading', { name: 'محتوى الدرس', exact: true })).toBeVisible();
    await expect(page).toHaveTitle(/المحتوى التعليمي/);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(scan.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
