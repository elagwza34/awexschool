export type MutationOutcome = "saved" | "not_found" | "failed";

export function mutationOutcome({ data, error }: { data: unknown; error: unknown }): MutationOutcome {
  if (error) return "failed";
  if (data === null || data === undefined || (Array.isArray(data) && data.length === 0)) return "not_found";
  return "saved";
}
