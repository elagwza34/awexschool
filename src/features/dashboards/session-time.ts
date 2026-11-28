const cairo = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function cairoSessionInput(date: Date) {
  return cairo.format(date).replace(" ", "T");
}

export function parseCairoSessionStart(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const utc = Date.parse(value + ":00Z");
  if (!Number.isFinite(utc)) return null;
  const candidates = [2, 3].map((offset) => new Date(utc - offset * 3600000))
    .filter((date) => cairoSessionInput(date) === value);
  return candidates.length === 1 ? candidates[0].toISOString() : null;
}
