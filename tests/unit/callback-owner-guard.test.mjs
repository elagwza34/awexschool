import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

globalThis.__callbackEmail = null;
globalThis.__callbackOwnerCalls = 0;
globalThis.__callbackRpcCalls = [];
globalThis.__callbackAutoConfirm = false;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") {
      return {
        url: "data:text/javascript,export class NextResponse { static redirect(url) { return { location: url.href }; } }",
        shortCircuit: true,
      };
    }
    if (specifier === "@/features/auth/owner-bootstrap") {
      return { url: new URL("../../src/features/auth/owner-bootstrap.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "@/features/auth/supabase-server" || specifier === "./supabase-server") {
      return {
        url: `data:text/javascript,
          export function authConfig() { return { url: 'http://127.0.0.1:54321', key: 'test-key' }; }
          export async function sessionClient() {
            return { auth: { async exchangeCodeForSession() {
              return { data: { user: { id: '11111111-1111-4111-8111-111111111111', email: globalThis.__callbackEmail, email_confirmed_at: '2026-11-25T00:00:00Z' } }, error: null };
            } } };
          }
          export function ownerClient() {
            globalThis.__callbackOwnerCalls += 1;
            return { async rpc(name, args) {
              globalThis.__callbackRpcCalls.push([name, args]);
              return { error: null };
            } };
          }
        `,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { GET } = await import("../../src/app/account/callback/route.ts");
const previousOwnerEmail = process.env.LIVESCHOOL_OWNER_EMAIL;
const previousOrigin = process.env.LIVESCHOOL_WEB_ORIGIN;
process.env.LIVESCHOOL_WEB_ORIGIN = "http://localhost:3000";
globalThis.fetch = async () => ({
  ok: true,
  async json() { return { mailer_autoconfirm: globalThis.__callbackAutoConfirm }; },
});

test.after(() => {
  if (previousOwnerEmail === undefined) delete process.env.LIVESCHOOL_OWNER_EMAIL;
  else process.env.LIVESCHOOL_OWNER_EMAIL = previousOwnerEmail;
  if (previousOrigin === undefined) delete process.env.LIVESCHOOL_WEB_ORIGIN;
  else process.env.LIVESCHOOL_WEB_ORIGIN = previousOrigin;
});

test("owner bootstrap does not treat two missing emails as a match", async () => {
  delete process.env.LIVESCHOOL_OWNER_EMAIL;
  globalThis.__callbackEmail = null;
  globalThis.__callbackOwnerCalls = 0;
  globalThis.__callbackRpcCalls = [];

  const response = await GET(new Request("http://localhost:3000/account/callback?code=test"));

  assert.equal(globalThis.__callbackOwnerCalls, 0);
  assert.equal(globalThis.__callbackRpcCalls.length, 0);
  assert.equal(response.location, "http://localhost:3000/account");
});

test("owner bootstrap still assigns the configured matching owner", async () => {
  process.env.LIVESCHOOL_OWNER_EMAIL = " Owner@Example.com ";
  globalThis.__callbackEmail = "owner@example.com";
  globalThis.__callbackOwnerCalls = 0;
  globalThis.__callbackRpcCalls = [];
  globalThis.__callbackAutoConfirm = false;

  const response = await GET(new Request("http://localhost:3000/account/callback?code=test"));

  assert.equal(globalThis.__callbackOwnerCalls, 1);
  assert.deepEqual(globalThis.__callbackRpcCalls, [["assign_owner_role", {
    account_id: "11111111-1111-4111-8111-111111111111",
  }]]);
  assert.equal(response.location, "http://localhost:3000/account");
});
