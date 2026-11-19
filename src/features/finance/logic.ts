import type { SessionPreview } from "@/features/dashboards/management-types";
import { sessionMinutes } from "@/features/sessions/logic";

export interface SessionAccrual {
  sessionId: string;
  teacherId: string;
  title: string;
  date: string;
  amount: number;
  paidAt?: string;
}

const cairoClock = new Intl.DateTimeFormat("en", {
  timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function classHasEnded(
  session: Pick<SessionPreview, "date" | "time" | "duration">,
  now: Date,
) {
  const parts = Object.fromEntries(cairoClock.formatToParts(now).map(({ type, value }) => [type, value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  return session.date < today ||
    (session.date === today &&
      sessionMinutes(`${parts.hour}:${parts.minute}`) >= sessionMinutes(session.time) + session.duration);
}

export function parseSessionRate(value: string) {
  const normalized = value.trim().replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace("٫", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(normalized)) return undefined;
  const [whole, fraction = ""] = normalized.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return amount > 0 ? amount : undefined;
}

export function teacherTotals(
  entries: readonly Pick<SessionAccrual, "teacherId" | "amount" | "paidAt">[],
  teacherId: string,
) {
  const totals = { count: 0, earned: 0, paid: 0, due: 0 };
  for (const entry of entries) {
    if (entry.teacherId !== teacherId) continue;
    totals.count += 1;
    totals.earned += entry.amount;
    if (entry.paidAt) totals.paid += entry.amount;
    else totals.due += entry.amount;
  }
  return totals;
}
