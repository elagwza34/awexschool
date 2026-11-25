import "server-only";

import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";

const defaultVerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const challengeLifetimeMs = 10 * 60 * 1000;

type Environment = Record<string, string | undefined>;
type CaptchaConfig = { secret: string; siteKey: string; verifyUrl: string; hostnames: string[] };
type CaptchaAction = "teacher_apply" | "teacher_track";

export function readTeacherCaptchaConfig(env: Environment = process.env): CaptchaConfig | null {
  const secret = env.TEACHER_INTAKE_CAPTCHA_SECRET?.trim();
  const siteKey = env.NEXT_PUBLIC_TEACHER_INTAKE_CAPTCHA_SITE_KEY?.trim();
  if (!secret || !siteKey) return null;
  const verifyUrl = env.TEACHER_INTAKE_CAPTCHA_VERIFY_URL?.trim() || defaultVerifyUrl;
  try {
    const parsed = new URL(verifyUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
  } catch {
    return null;
  }
  const hostnames = (env.TEACHER_INTAKE_CAPTCHA_HOSTNAMES ?? "")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return { secret, siteKey, verifyUrl, hostnames };
}

export function readTeacherCaptchaPublicConfig(env: Environment = process.env): string | null {
  return readTeacherCaptchaConfig(env)?.siteKey ?? null;
}

function normalizedIp(value: string): string | null {
  if (isIP(value) === 4) return value;
  if (isIP(value) !== 6) return null;
  try {
    return new URL(`http://[${value}]/`).hostname.slice(1, -1).toLowerCase();
  } catch {
    return null;
  }
}

function matchesSecret(supplied: string | null, expected: string): boolean {
  if (!supplied) return false;
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function readTrustedRequestIp(env: Environment = process.env): Promise<string | null> {
  const proxySecret = env.LIVESCHOOL_TRUSTED_PROXY_SECRET?.trim();
  const trustedProxies = new Set((env.TEACHER_INTAKE_TRUSTED_PROXY_IPS ?? "")
    .split(",").map((value) => normalizedIp(value.trim())).filter((value): value is string => value !== null));
  if (!proxySecret || !trustedProxies.size) return null;

  try {
    const requestHeaders = await headers();
    if (!matchesSecret(requestHeaders.get("x-liveschool-proxy-secret"), proxySecret)) return null;
    const forwarded = requestHeaders.get("x-forwarded-for")?.split(",").map((value) => value.trim()) ?? [];
    if (!forwarded.length || forwarded.length > 30) return null;
    const addresses = forwarded.map(normalizedIp);
    if (addresses.some((value) => value === null)) return null;

    let clientIndex = addresses.length - 1;
    while (clientIndex >= 0 && trustedProxies.has(addresses[clientIndex]!)) clientIndex -= 1;
    if (clientIndex < 0 || clientIndex === addresses.length - 1) return null;
    return addresses[clientIndex];
  } catch {
    return null;
  }
}

export async function verifyTeacherCaptcha(token: unknown, action: CaptchaAction): Promise<boolean> {
  const config = readTeacherCaptchaConfig();
  if (!config || typeof token !== "string") return false;
  const responseToken = token.trim();
  if (responseToken.length < 20 || responseToken.length > 4096 || /^(?:true|false)$/i.test(responseToken)) return false;

  try {
    const ip = await readTrustedRequestIp();
    const body = new URLSearchParams({ secret: config.secret, response: responseToken });
    if (ip) body.set("remoteip", ip);
    const response = await fetch(config.verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("success" in result) || result.success !== true) return false;
    if (!("action" in result) || result.action !== action) return false;
    if (config.hostnames.length) {
      if (!("hostname" in result) || typeof result.hostname !== "string" || !config.hostnames.includes(result.hostname.toLowerCase())) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function buildTeacherIntakeChallenge(input: {
  purpose: "submit" | "track";
  actorId: string | null;
  applicationId: string | null;
  email: string | null;
  ip: string | null;
  now?: Date;
}) {
  const config = readTeacherCaptchaConfig();
  if (!config) throw new Error("teacher_captcha_unconfigured");
  if (!["submit", "track"].includes(input.purpose)) throw new Error("teacher_intake_challenge_invalid");
  if (input.actorId != null && !uuid.test(input.actorId)) throw new Error("teacher_intake_challenge_invalid");
  if (input.applicationId != null && !uuid.test(input.applicationId)) throw new Error("teacher_intake_challenge_invalid");
  if (input.purpose === "submit" && (!input.actorId || input.applicationId || input.email)) {
    throw new Error("teacher_intake_challenge_invalid");
  }
  if (input.purpose === "track" && (!input.applicationId || !input.email?.trim())) {
    throw new Error("teacher_intake_challenge_invalid");
  }

  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("teacher_intake_challenge_invalid");
  const ip = input.ip ? normalizedIp(input.ip) ?? "unknown" : "unknown";
  return {
    id: randomUUID(),
    purpose: input.purpose,
    actor_id: input.actorId ?? null,
    ip_hash: createHmac("sha256", config.secret).update(`teacher-intake-ip:${ip}`).digest("hex"),
    application_id: input.applicationId ?? null,
    email_hash: input.email ? createHash("sha256").update(input.email.trim().toLowerCase()).digest("hex") : null,
    expires_at: new Date(now.getTime() + challengeLifetimeMs),
  };
}
