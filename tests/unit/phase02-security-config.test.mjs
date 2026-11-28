import assert from "node:assert/strict";
import test from "node:test";

const { default: config } = await import("../../next.config.ts");

test("normal application responses receive a centralized security header policy", async () => {
  assert.equal(typeof config.headers, "function");
  const rules = await config.headers();
  const application = rules.find(({ source }) => source === "/:path*");
  assert.ok(application, "missing application-wide header rule");
  const headers = Object.fromEntries(application.headers.map(({ key, value }) => [key.toLowerCase(), value]));

  assert.match(headers["content-security-policy"], /default-src 'self'/);
  assert.match(headers["content-security-policy"], /object-src 'none'/);
  assert.match(headers["content-security-policy"], /frame-ancestors 'none'/);
  assert.match(headers["content-security-policy"], /base-uri 'self'/);
  assert.equal(headers["x-content-type-options"], "nosniff");
  assert.equal(headers["x-frame-options"], "DENY");
  assert.equal(headers["referrer-policy"], "same-origin");
  assert.match(headers["strict-transport-security"], /max-age=31536000/);
  assert.match(headers["permissions-policy"], /camera=\(\)/);
});

test("proxy request buffering retains one byte beyond the Server Action body limit", () => {
  assert.equal(config.experimental?.proxyClientMaxBodySize, 1024 * 1024 + 1);
});
