export type SupabaseEnvironment = {
  url: string;
  key: string;
  secretKey: string | undefined;
};

type Environment = Record<string, string | undefined>;

const approvedTestUrl = "http://127.0.0.1:54321";
const prohibitedTestVariables = [
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PASSWORD",
  "POSTGRES_USER",
  "PGPASSWORD",
];

export class UnsafeTestEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeTestEnvironmentError";
  }
}

function isApprovedTestUrl(value: string) {
  try {
    return new URL(value).href === `${approvedTestUrl}/`;
  } catch {
    return false;
  }
}

export function readSupabaseEnvironment(env: Environment = process.env): SupabaseEnvironment | null {
  const testSignaled = env.NODE_ENV === "test" ||
    env.LIVESCHOOL_ENV === "test" ||
    env.NEXT_PUBLIC_LIVESCHOOL_ENV === "test" ||
    env.LIVESCHOOL_LIVE_TESTS === "1";
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = env.SUPABASE_SECRET_KEY?.trim() ? env.SUPABASE_SECRET_KEY : undefined;

  if (!testSignaled) {
    return url && key ? { url, key, secretKey } : null;
  }

  if (env.LIVESCHOOL_ENV !== "test" && env.NEXT_PUBLIC_LIVESCHOOL_ENV !== "test") {
    throw new UnsafeTestEnvironmentError("Tests require LIVESCHOOL_ENV=test.");
  }
  if (env.LIVESCHOOL_ENV && env.LIVESCHOOL_ENV !== "test") {
    throw new UnsafeTestEnvironmentError("LIVESCHOOL_ENV must be test during test execution.");
  }
  if (env.NEXT_PUBLIC_LIVESCHOOL_ENV && env.NEXT_PUBLIC_LIVESCHOOL_ENV !== "test") {
    throw new UnsafeTestEnvironmentError("NEXT_PUBLIC_LIVESCHOOL_ENV must be test during test execution.");
  }
  if (url && !isApprovedTestUrl(url.trim())) {
    throw new UnsafeTestEnvironmentError("Tests may use only the approved local Supabase endpoint.");
  }
  for (const name of prohibitedTestVariables) {
    if (env[name]?.trim()) {
      throw new UnsafeTestEnvironmentError(`${name} is not allowed in the test environment.`);
    }
  }
  const allowedKey = env.NEXT_PUBLIC_LIVESCHOOL_TEST_ALLOWED_PUBLISHABLE_KEY?.trim();
  const allowedSecretKey = env.LIVESCHOOL_TEST_ALLOWED_SECRET_KEY?.trim();
  if (key && key.trim() !== allowedKey) {
    throw new UnsafeTestEnvironmentError("Test Supabase API keys must be explicitly allowlisted as local keys.");
  }
  if (secretKey && secretKey !== allowedSecretKey) {
    throw new UnsafeTestEnvironmentError("Test Supabase API keys must be explicitly allowlisted as local keys.");
  }
  if (secretKey && env.LIVESCHOOL_TEST_ALLOW_SERVICE_ROLE !== "1") {
    throw new UnsafeTestEnvironmentError("Set LIVESCHOOL_TEST_ALLOW_SERVICE_ROLE=1 to use a local service-role key in tests.");
  }

  return url && key ? { url, key, secretKey } : null;
}
