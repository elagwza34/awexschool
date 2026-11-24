const catalogId = /^[a-z0-9-]{1,120}$/i;

export function readCoursePublication(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const track = String(form.get("track") ?? "");
  const grade = String(form.get("grade") ?? "").trim();
  const subject = String(form.get("subject") ?? "").trim();
  if (title.length < 3 || title.length > 160 || description.length > 3000 ||
      !["arabic", "languages"].includes(track) || !catalogId.test(grade) || !catalogId.test(subject)) return null;
  return { title, description, track, grade, subject };
}
