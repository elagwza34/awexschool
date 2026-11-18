export type CatalogSearchParams = Record<string, string | string[] | undefined>;

const firstValue = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

// Browser query parameters can repeat. Bound and normalize them before rendering.
export function parseCatalogQuery(params: CatalogSearchParams) {
  return {
    q: firstValue(params.q).slice(0, 120),
    grade: firstValue(params.grade).slice(0, 80),
    subject: firstValue(params.subject).slice(0, 80),
  };
}
