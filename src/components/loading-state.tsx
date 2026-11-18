export default function LoadingState() {
  return (
    <div
      className="container-shell py-8"
      role="status"
      aria-label="جارٍ تحميل المحتوى"
    >
      <span className="sr-only">جارٍ تحميل المحتوى</span>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="h-6 w-36 rounded bg-muted" />
        <div className="h-12 w-2/3 rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl border bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
