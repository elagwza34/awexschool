import { expect, test } from "@playwright/test";

const restrictedPreviews = [
  "/admin/content", "/admin/curricula", "/admin/enrollments", "/admin/team", "/admin/users",
  "/admin/reports", "/admin/activity",
  "/admin/learn/math-prep-1", "/manager/activity", "/manager/team",
  "/parent/help", "/parent/progress", "/student/help", "/student/library", "/student/progress",
  "/teacher/content", "/teacher/progress",
  "/workspace/support/group-requests",
];

test("all restricted portal previews remain unavailable", async ({ request }) => {
  for (const path of restrictedPreviews) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(307);
    const destination = new URL(response.headers().location!, response.url());
    expect(destination.pathname, path).toBe("/account");
    expect(destination.searchParams.get("message"), path).toBe("section-unavailable");
    expect(destination.searchParams.get("portal"), path).toBe(path.split("/")[1]);
  }
});

test("retired owner routes remain absent", async ({ request }) => {
  for (const path of ["/owner/permissions", "/owner/settings"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test("guests cannot enter any supported live portal namespace", async ({ request }) => {
  for (const path of ["/owner", "/student", "/teacher", "/parent", "/admin", "/manager", "/manager/requests", "/support", "/support/activity", "/support/requests"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(307);
    expect(response.headers().location, path).toBe(`/login?next=${encodeURIComponent(path)}`);
  }
});
