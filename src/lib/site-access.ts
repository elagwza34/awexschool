import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const deriveKey = promisify(scrypt);
export const ownerCookie = "__Host-awex-lock-owner";
export const lockSettingsPath = "/admin/site-locks";
export const siteSessionSeconds = 8 * 60 * 60;

export function isValidAccessCode(code: string) {
  return code.length >= 16 && code.length <= 128;
}

export function getOwnerCode() {
  const code = process.env.SITE_LOCK_ADMIN_CODE ?? "";
  return isValidAccessCode(code) ? code : undefined;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function matchesSiteCode(input: string, code: string) {
  return timingSafeEqual(digest(input), digest(code));
}

function signature(payload: string, code: string) {
  return createHmac("sha256", code).update(`awex-access-v1:${payload}`).digest("hex");
}

export function createSiteSession(code: string, now = Date.now()) {
  const expires = Math.floor(now / 1000) + siteSessionSeconds;
  const payload = `${expires}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${signature(payload, code)}`;
}

export function hasSiteSession(token: string | undefined, code: string, now = Date.now()) {
  if (!token || !/^\d{1,12}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expires, nonce, received] = token.split(".");
  if (Number(expires) <= Math.floor(now / 1000)) return false;
  return timingSafeEqual(
    Buffer.from(received, "hex"),
    Buffer.from(signature(`${expires}.${nonce}`, code), "hex"),
  );
}

export interface SiteLock {
  scope: string;
  salt: string;
  key: string;
}

function storeDirectory() {
  return process.env.SITE_LOCK_STORE_DIR || join(homedir(), ".awexschool-site-locks");
}

function lockId(scope: string) {
  return digest(scope).toString("hex").slice(0, 32);
}

export function lockCookie(scope: string) {
  return `__Host-awex-lock-${lockId(scope)}`;
}

export function normalizeLockPath(path: string) {
  const decoded = decodeURIComponent(path);
  if (!decoded.startsWith("/") || /[?#\\\x00-\x1f]/.test(decoded)) throw Error("Invalid lock path");
  return decoded.replace(/\/{2,}/g, "/").replace(/\/$/, "").toLowerCase() || "/";
}

export function parseLockScope(scope: string) {
  if (scope === "*") return scope;
  try {
    const path = normalizeLockPath(scope.trim());
    return path.length <= 200 && path !== lockSettingsPath &&
      !path.startsWith(lockSettingsPath + "/") && !path.startsWith("/_next/") &&
      !path.split("/").some((segment) => segment === "." || segment === "..")
      ? path : undefined;
  } catch {
    return undefined;
  }
}

async function lockKey(code: string, salt: string) {
  return (await deriveKey(code, salt, 32) as Buffer).toString("hex");
}

export async function matchesLockCode(code: string, lock: SiteLock) {
  if (!isValidAccessCode(code)) return false;
  return matchesSiteCode(await lockKey(code, lock.salt), lock.key);
}

async function readLock(scope: string) {
  const path = join(storeDirectory(), `${lockId(scope)}.json`);
  try {
    const lock = JSON.parse(await readFile(path, "utf8")) as SiteLock;
    if (lock.scope !== scope || !/^[\da-f]{32}$/.test(lock.salt) || !/^[\da-f]{64}$/.test(lock.key)) {
      throw Error("Invalid stored lock");
    }
    return lock;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return undefined;
  }
}

export async function getRequestLock(path: string, includeGlobal = true) {
  const globalLock = includeGlobal ? await readLock("*") : undefined;
  if (globalLock) return globalLock;
  return readLock(path);
}

export async function listLocks() {
  try {
    const entries = await readdir(storeDirectory());
    const locks = await Promise.all(entries.filter((name) => /^[\da-f]{32}\.json$/.test(name)).map(async (name) => {
      const lock = JSON.parse(await readFile(join(storeDirectory(), name), "utf8")) as SiteLock;
      return lock.scope;
    }));
    return locks.sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return [];
  }
}

export async function saveLock(scope: string, code: string) {
  const dir = storeDirectory();
  const salt = randomBytes(16).toString("hex");
  const lock = { scope, salt, key: await lockKey(code, salt) };
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const target = join(dir, `${lockId(scope)}.json`);
  const staging = `${target}.${randomBytes(8).toString("hex")}.tmp`;
  await writeFile(staging, JSON.stringify(lock), { mode: 0o600, flag: "wx" });
  try {
    await rename(staging, target);
  } finally {
    await rm(staging, { force: true });
  }
}

export async function removeLock(scope: string) {
  await rm(join(storeDirectory(), `${lockId(scope)}.json`), { force: true });
}
