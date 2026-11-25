export type DataErrorKind = "configuration" | "permission" | "network" | "database";

export type DataResult<T> =
  | { state: "ready"; data: T }
  | { state: "error"; kind: DataErrorKind };

export function dataReady<T>(data: T): DataResult<T> {
  return { state: "ready", data };
}

export function classifyDataError(error: unknown): DataErrorKind {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
  if (code === "42501") return "permission";
  if (error instanceof TypeError) return "network";
  const record = typeof error === "object" && error !== null ? error : null;
  const message = error instanceof Error || typeof error === "string" ? String(error)
    : record && "message" in record ? String(record.message) : "";
  return /fetch|network|connection|offline/i.test(message) ? "network" : "database";
}

export function dataFailure(error: unknown): DataResult<never> {
  return { state: "error", kind: classifyDataError(error) };
}

export function configurationFailure(): DataResult<never> {
  return { state: "error", kind: "configuration" };
}
