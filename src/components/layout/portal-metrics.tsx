export function PortalMetrics({ items }: { items: { label: string; value: number | null }[] }) {
  return <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {items.map(({ label, value }) => <div key={label} className="soft-card min-w-0 p-4">
      <dt className="break-words text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-2xl font-bold tabular-nums">{value === null ? "—" : value.toLocaleString("ar-EG")}</dd>
    </div>)}
  </dl>;
}
