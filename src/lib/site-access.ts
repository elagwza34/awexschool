import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { Stats } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
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

const globalActiveFile = "global.active";

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

let activeLockVerifications = 0;

export async function withLockVerification<T>(verify: () => Promise<T>, maxConcurrent = 4): Promise<T | null> {
  if (activeLockVerifications >= maxConcurrent) return null;
  activeLockVerifications += 1;
  try {
    return await verify();
  } finally {
    activeLockVerifications -= 1;
  }
}

async function hasGlobalActiveState() {
  try {
    await stat(join(storeDirectory(), globalActiveFile));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return false;
  }
}

async function ensureGlobalActiveState() {
  try {
    await writeFile(join(storeDirectory(), globalActiveFile), "active\n", { mode: 0o600, flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
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

async function readGlobalLock() {
  try {
    await stat(storeDirectory());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return undefined;
  }
  const active = await hasGlobalActiveState();
  const lock = await readLock("*");
  if (active) {
    if (!lock) throw Error("Active global lock record is missing");
    return lock;
  }
  return withStoreGuard("global", async () => {
    const currentActive = await hasGlobalActiveState();
    const currentLock = await readLock("*");
    if (!currentLock && currentActive) throw Error("Active global lock record is missing");
    if (currentLock && !currentActive) await ensureGlobalActiveState();
    return currentLock;
  });
}

export async function getRequestLock(path: string, includeGlobal = true) {
  if (path === "*") return includeGlobal ? readGlobalLock() : readLock(path);
  const pathLock = await readLock(path);
  const globalLock = includeGlobal ? await readGlobalLock() : undefined;
  return pathLock ?? globalLock;
}

export async function isLockAttemptBlocked(subject: string, now = Date.now(), maxAttempts = 10) {
  try {
    const current = JSON.parse(await readFile(join(storeDirectory(), `${digest(subject).toString("hex").slice(0, 32)}.rate`), "utf8")) as { expires: number; count: number };
    return Number.isInteger(current.count) && Number.isFinite(current.expires) && current.expires > now && current.count >= maxAttempts;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return false;
  }
}

const storeGuardQueues = new Map<string, Promise<void>>();
function sameStoreGuard(current: Stats, owner: Stats) {
  return current.dev === owner.dev && current.ino === owner.ino && current.mtimeMs === owner.mtimeMs;
}

function isTransientGuardError(error: unknown) {
  const code = (error as NodeJS.ErrnoException).code;
  return process.platform === "win32" && (code === "EBUSY" || code === "EPERM");
}

async function releaseStoreGuard(guard: string, owner: Stats) {
  for (let retry = 0; retry < 100; retry += 1) {
    const current = await stat(guard).catch(() => null);
    if (!current || !sameStoreGuard(current, owner)) return;
    try {
      await rmdir(guard);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      if (!isTransientGuardError(error)) throw error;
      await delay(5);
    }
  }
  throw Error("Unable to release site lock guard");
}

async function withStoreGuard<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const guard = join(storeDirectory(), `${name}.guard`);
  const previous = storeGuardQueues.get(guard) ?? Promise.resolve();
  let release!: () => void;
  const turn = new Promise<void>((resolve) => { release = resolve; });
  storeGuardQueues.set(guard, turn);
  await previous;

  let acquired = false;
  let owner: Stats | undefined;
  try {
    for (let retry = 0; retry < 100; retry += 1) {
      try {
        await mkdir(guard);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          if (isTransientGuardError(error)) {
            await delay(5);
            continue;
          }
          throw error;
        }
        const held = await stat(guard).catch(() => null);
        if (held && Date.now() - held.mtimeMs > 30_000) {
          const current = await stat(guard).catch(() => null);
          if (current && sameStoreGuard(current, held)) {
            try {
              await rm(guard, { recursive: true, force: true });
            } catch (removeError) {
              if (!isTransientGuardError(removeError)) throw removeError;
              await delay(5);
            }
          }
          continue;
        }
        await delay(5);
      }
      try {
        owner = await stat(guard);
        acquired = true;
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT" || isTransientGuardError(error)) {
          await delay(5);
          continue;
        }
        throw error;
      }
    }
    if (!acquired) throw Error("Unable to update site lock state");
    return await operation();
  } finally {
    try {
      if (acquired && owner) await releaseStoreGuard(guard, owner);
    } finally {
      release();
      if (storeGuardQueues.get(guard) === turn) storeGuardQueues.delete(guard);
    }
  }
}

export async function consumeLockAttempt(subject: string, now = Date.now(), maxAttempts = 10, windowMs = 15 * 60 * 1000) {
  const dir = storeDirectory();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const id = digest(subject).toString("hex").slice(0, 32);
  const target = join(dir, `${id}.rate`);
  return withStoreGuard(id, async () => {
    let expires = now + windowMs;
    let count = 1;
    try {
      const current = JSON.parse(await readFile(target, "utf8")) as { expires: number; count: number };
      if (Number.isInteger(current.count) && Number.isFinite(current.expires) && current.expires > now) {
        expires = current.expires;
        count = current.count + 1;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (count > maxAttempts) return false;
    const staging = join(dir, `${id}.${randomBytes(8).toString("hex")}.tmp`);
    try {
      await writeFile(staging, JSON.stringify({ expires, count }), { mode: 0o600, flag: "wx" });
      await rename(staging, target);
      return true;
    } finally {
      await rm(staging, { force: true });
    }
  });
}

export async function refundLockAttempt(subject: string) {
  const dir = storeDirectory();
  const id = digest(subject).toString("hex").slice(0, 32);
  const target = join(dir, `${id}.rate`);
  await withStoreGuard(id, async () => {
    let current: { expires: number; count: number };
    try {
      current = JSON.parse(await readFile(target, "utf8")) as { expires: number; count: number };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    if (!Number.isInteger(current.count) || !Number.isFinite(current.expires) || current.expires <= Date.now()) return;
    if (current.count <= 1) {
      await rm(target, { force: true });
      return;
    }
    const staging = join(dir, `${id}.${randomBytes(8).toString("hex")}.tmp`);
    try {
      await writeFile(staging, JSON.stringify({ expires: current.expires, count: current.count - 1 }), { mode: 0o600, flag: "wx" });
      await rename(staging, target);
    } finally {
      await rm(staging, { force: true });
    }
  });
}

export async function verifyLockAttempt(subject: string, verify: () => boolean | Promise<boolean>): Promise<boolean | null> {
  if (!await consumeLockAttempt(subject)) return null;
  let matched: boolean;
  try {
    matched = await verify();
  } catch (error) {
    await refundLockAttempt(subject);
    throw error;
  }
  if (matched) await refundLockAttempt(subject);
  return matched;
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
  const write = async () => {
    const target = join(dir, `${lockId(scope)}.json`);
    const staging = `${target}.${randomBytes(8).toString("hex")}.tmp`;
    try {
      await writeFile(staging, JSON.stringify(lock), { mode: 0o600, flag: "wx" });
      await rename(staging, target);
    } finally {
      await rm(staging, { force: true });
    }
    if (scope === "*") await ensureGlobalActiveState();
  };
  if (scope === "*") await withStoreGuard("global", write);
  else await write();
}

export async function removeLock(scope: string) {
  if (scope !== "*") {
    await rm(join(storeDirectory(), `${lockId(scope)}.json`), { force: true });
    return;
  }
  try {
    await stat(storeDirectory());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return;
  }
  await withStoreGuard("global", async () => {
    await rm(join(storeDirectory(), globalActiveFile), { force: true });
    await rm(join(storeDirectory(), `${lockId("*")}.json`), { force: true });
  });
}
