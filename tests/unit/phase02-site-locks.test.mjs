import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fsPromises, { mkdir, mkdtemp, readFile, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  consumeLockAttempt,
  getRequestLock,
  isLockAttemptBlocked,
  refundLockAttempt,
  removeLock,
  saveLock,
  verifyLockAttempt,
  withLockVerification,
} from "../../src/lib/site-access.ts";

const code = "isolated-lock-test-code";

async function withStore(run) {
  const directory = await mkdtemp(join(tmpdir(), "phase02-locks-"));
  const previous = process.env.SITE_LOCK_STORE_DIR;
  process.env.SITE_LOCK_STORE_DIR = directory;
  try {
    return await run(directory);
  } finally {
    if (previous === undefined) delete process.env.SITE_LOCK_STORE_DIR;
    else process.env.SITE_LOCK_STORE_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
}

async function createStaleGlobalGuard(directory) {
  const guard = join(directory, "global.guard");
  await mkdir(guard);
  await Promise.all(Array.from({ length: 4_000 }, (_, index) =>
    writeFile(join(guard, `${index}.tmp`), "stale"),
  ));
  const stale = new Date(Date.now() - 31_000);
  await utimes(guard, stale, stale);
}

test("concurrent stale global guard takeovers remain usable on Windows", { timeout: 30_000 }, async () => {
  await withStore(async (directory) => {
    await createStaleGlobalGuard(directory);

    const results = await Promise.allSettled(Array.from({ length: 64 }, () => getRequestLock("/")));
    const failures = results.filter((result) => result.status === "rejected").map((result) => result.reason);
    const summary = failures.reduce((counts, error) => {
      const key = `${error.code ?? "ERROR"}:${error.syscall ?? "withStoreGuard"}`;
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
    assert.deepEqual(summary, {});
    assert.equal(await getRequestLock("/"), undefined);
    assert.equal((await readdir(directory)).some((name) => name.endsWith(".guard")), false);
  });
});

test("concurrent stale global guard takeovers are safe across processes", { timeout: 30_000 }, async () => {
  await withStore(async (directory) => {
    await createStaleGlobalGuard(directory);
    const moduleUrl = new URL("../../src/lib/site-access.ts", import.meta.url).href;
    const script = `
      import { getRequestLock } from ${JSON.stringify(moduleUrl)};
      process.send("ready");
      process.on("message", async () => {
        try {
          await getRequestLock("/");
          process.send("ok");
        } catch (error) {
          process.send(JSON.stringify({ code: error.code, syscall: error.syscall, message: error.message }));
        } finally {
          process.disconnect();
        }
      });
    `;
    const children = Array.from({ length: 8 }, () => spawn(process.execPath, ["--input-type=module", "-e", script], {
      env: { SITE_LOCK_STORE_DIR: directory, SystemRoot: process.env.SystemRoot },
      stdio: ["ignore", "ignore", "inherit", "ipc"],
    }));
    const runs = children.map((child) => {
      const messages = [];
      const ready = new Promise((resolve, reject) => {
        child.on("message", (message) => {
          messages.push(message);
          if (message === "ready") resolve();
        });
        child.once("error", reject);
        child.once("close", (code) => {
          if (!messages.includes("ready")) reject(new Error(`Store child exited before readiness: ${code}`));
        });
      });
      const done = new Promise((resolve) => child.once("close", () => resolve(messages.at(-1))));
      return { child, ready, done };
    });
    try {
      await Promise.all(runs.map(({ ready }) => ready));
      for (const { child } of runs) child.send("go");
      assert.deepEqual(await Promise.all(runs.map(({ done }) => done)), Array(8).fill("ok"));
      assert.equal((await readdir(directory)).some((name) => name.endsWith(".guard")), false);
    } finally {
      for (const { child } of runs) {
        if (child.exitCode === null && child.signalCode === null) child.kill();
      }
      await Promise.all(runs.map(({ done }) => done));
    }
  });
});

test("a guard owner does not recursively remove a successor guard", async () => {
  await withStore(async (directory) => {
    const subject = "visitor:192.0.2.6:/teachers";
    const id = createHash("sha256").update(subject).digest("hex").slice(0, 32);
    const target = join(directory, `${id}.rate`);
    const guard = join(directory, `${id}.guard`);
    const originalReadFile = fsPromises.readFile;
    let signal;
    let release;
    let blocked = false;
    const entered = new Promise((resolve) => { signal = resolve; });
    const gate = new Promise((resolve) => { release = resolve; });
    fsPromises.readFile = async (path, ...args) => {
      if (path === target && !blocked) {
        blocked = true;
        signal();
        await gate;
      }
      return originalReadFile(path, ...args);
    };
    syncBuiltinESMExports();
    try {
      const pending = consumeLockAttempt(subject);
      await entered;
      await rm(guard, { recursive: true, force: true });
      await mkdir(guard);
      await writeFile(join(guard, "successor"), "owned");
      release();
      assert.equal(await pending, true);
      assert.equal(await readFile(join(guard, "successor"), "utf8"), "owned");
    } finally {
      release();
      fsPromises.readFile = originalReadFile;
      syncBuiltinESMExports();
    }
  });
});

test("an activated global lock fails closed when its lock record is missing", async () => {
  await withStore(async (directory) => {
    await saveLock("*", code);
    const record = (await readdir(directory)).find((name) => name.endsWith(".json"));
    assert.ok(record);
    await rm(join(directory, record));
    await assert.rejects(() => getRequestLock("/"), /active global lock/i);
  });
});

test("a legacy global lock remains enforced and gains durable active state", async () => {
  await withStore(async (directory) => {
    await saveLock("*", code);
    await rm(join(directory, "global.active"), { force: true });
    assert.equal((await getRequestLock("/"))?.scope, "*");
    assert.equal(await readFile(join(directory, "global.active"), "utf8"), "active\n");
  });
});

test("intentional global unlock removes both the lock and its active state", async () => {
  await withStore(async (directory) => {
    await saveLock("*", code);
    assert.equal(await readFile(join(directory, "global.active"), "utf8"), "active\n");
    await removeLock("*");
    assert.equal(await getRequestLock("/"), undefined);
    await assert.rejects(() => readFile(join(directory, "global.active"), "utf8"), { code: "ENOENT" });
  });
});

test("concurrent global reads cannot recreate active state after unlock", async () => {
  await withStore(async (directory) => {
    await saveLock("*", code);
    await Promise.all(Array.from({ length: 20 }, async () => {
      await getRequestLock("/");
      await removeLock("*");
    }));
    await Promise.all(Array.from({ length: 20 }, () => getRequestLock("/")));
    assert.equal(await getRequestLock("/"), undefined);
    await assert.rejects(() => readFile(join(directory, "global.active"), "utf8"), { code: "ENOENT" });
  });
});

test("an explicit path lock does not hide a missing active global lock", async () => {
  await withStore(async (directory) => {
    await saveLock("*", code);
    await saveLock("/teachers", code);
    const pathRecord = `${createHash("sha256").update("/teachers").digest("hex").slice(0, 32)}.json`;
    const record = (await readdir(directory)).find((name) => name.endsWith(".json") && name !== pathRecord);
    assert.ok(record);
    await rm(join(directory, record));
    await assert.rejects(() => getRequestLock("/teachers"), /active global lock/i);
    assert.equal((await getRequestLock("/teachers", false)).scope, "/teachers");
  });
});

test("an explicit path lock remains selectable while a global lock is active", async () => {
  await withStore(async () => {
    await saveLock("*", code);
    await saveLock("/teachers", code);
    assert.equal((await getRequestLock("/teachers")).scope, "/teachers");
    assert.equal((await getRequestLock("/teachers", false)).scope, "/teachers");
    await removeLock("/teachers");
    assert.equal((await getRequestLock("/teachers")).scope, "*");
  });
});

test("lock attempts are throttled per subject and recover after the window", async () => {
  await withStore(async () => {
    const started = Date.UTC(2026, 10, 26, 12);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      assert.equal(await consumeLockAttempt("visitor:192.0.2.1:/teachers", started), true);
    }
    assert.equal(await consumeLockAttempt("visitor:192.0.2.1:/teachers", started), false);
    assert.equal(await isLockAttemptBlocked("visitor:192.0.2.1:/teachers", started), true);
    assert.equal(await isLockAttemptBlocked("visitor:192.0.2.1:/teachers", started + 900_000), false);
    assert.equal(await consumeLockAttempt("visitor:192.0.2.1:/login", started), true);
    assert.equal(await consumeLockAttempt("owner:192.0.2.1", started), true);
    assert.equal(await consumeLockAttempt("visitor:192.0.2.1:/teachers", started + 900_000), true);
  });
});

test("lock verification rejects work above the global concurrency cap", async () => {
  const releases = [];
  const pending = Array.from({ length: 4 }, () => withLockVerification(() =>
    new Promise((resolve) => releases.push(resolve)),
  ));
  assert.equal(await withLockVerification(async () => "unexpected"), null);
  for (const release of releases) release();
  assert.deepEqual(await Promise.all(pending), [undefined, undefined, undefined, undefined]);
  assert.equal(await withLockVerification(async () => "recovered"), "recovered");
});

test("concurrent attempts cannot exceed the persistent limit", async () => {
  await withStore(async () => {
    const subject = "visitor:192.0.2.2:/teachers";
    const results = await Promise.all(Array.from({ length: 20 }, () =>
      consumeLockAttempt(subject),
    ));
    assert.equal(results.filter(Boolean).length, 10);
  });
});

test("successful verification refunds its reserved attempt", async () => {
  await withStore(async () => {
    const subject = "owner:192.0.2.3";
    for (let attempt = 0; attempt < 10; attempt += 1) {
      assert.equal(await consumeLockAttempt(subject), true);
      await refundLockAttempt(subject);
    }
    assert.equal(await isLockAttemptBlocked(subject), false);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      assert.equal(await consumeLockAttempt(subject), true);
    }
    assert.equal(await isLockAttemptBlocked(subject), true);
  });
});

test("refunding a successful attempt preserves other failed attempts", async () => {
  await withStore(async () => {
    const subject = "visitor:192.0.2.4:/teachers";
    assert.equal(await consumeLockAttempt(subject), true);
    assert.equal(await consumeLockAttempt(subject), true);
    await refundLockAttempt(subject);
    for (let attempt = 0; attempt < 9; attempt += 1) {
      assert.equal(await consumeLockAttempt(subject), true);
    }
    assert.equal(await consumeLockAttempt(subject), false);
  });
});

test("verification admission is reserved before concurrent password checks", { timeout: 5_000 }, async () => {
  await withStore(async () => {
    const subject = "owner:192.0.2.5";
    let release;
    let signal;
    let active = 0;
    const gate = new Promise((resolve) => { release = resolve; });
    const ready = new Promise((resolve) => { signal = resolve; });
    const pending = Array.from({ length: 10 }, () => verifyLockAttempt(subject, async () => {
      active += 1;
      if (active === 10) signal();
      await gate;
      return false;
    }));
    await ready;
    assert.equal(active, 10);
    assert.equal(await verifyLockAttempt(subject, async () => true), null);
    release();
    assert.deepEqual(await Promise.all(pending), Array(10).fill(false));
    assert.equal(await isLockAttemptBlocked(subject), true);
  });
});
