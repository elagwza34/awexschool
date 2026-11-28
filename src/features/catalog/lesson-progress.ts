export function progressPercentage(completed: number, total: number) {
  return total ? Math.round(completed * 100 / total) : null;
}

export function summarizeLessonProgress(lessonIds: readonly string[], completedIds: ReadonlySet<string>) {
  const completed = lessonIds.filter((id) => completedIds.has(id)).length;
  const total = lessonIds.length;
  return { completed, total, percent: progressPercentage(completed, total) };
}
