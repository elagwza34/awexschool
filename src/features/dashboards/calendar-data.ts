import type { MeetingProvider } from "./management-types";

export interface CalendarLesson {
  teacherId?: string;
  groupId?: string;
  groupName?: string;
  studentIds?: string[];
  description?: string;
  status?: "scheduled" | "cancelled";
  cancellationReason?: string;
  id: string;
  title: string;
  courseId: string;
  teacherName: string;
  date: string;
  time: string;
  duration: number;
  provider: MeetingProvider;
  source: "fixture" | "session-preview";
  meetingReference?: string;
}

// The demonstration starts on the supplied client date; these are not live classes.
export const calendarReferenceDate = "2026-11-15";
export const calendarLessons: CalendarLesson[] = [
  {
    id: "calendar-math",
    title: "فكرة جديدة في الرياضيات",
    courseId: "math-prep-1",
    teacherName: "أ. أحمد حسن",
    date: "2026-11-15",
    time: "16:30",
    duration: 45,
    provider: "google-meet",
    source: "fixture",
  },
  {
    id: "calendar-arabic",
    title: "القراءة وبناء المعنى",
    courseId: "arabic-prep-1",
    teacherName: "أ. مريم عادل",
    date: "2026-11-17",
    time: "18:00",
    duration: 60,
    provider: "zoom",
    source: "fixture",
  },
  {
    id: "calendar-science",
    title: "مراجعة المادة من حولنا",
    courseId: "science-prep-1",
    teacherName: "أ. عمر سالم",
    date: "2026-11-19",
    time: "17:00",
    duration: 45,
    provider: "google-meet",
    source: "fixture",
  },
];

export function shiftCalendarDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function calendarWeekStart(date: string) {
  return shiftCalendarDate(
    date,
    -((new Date(`${date}T12:00:00Z`).getUTCDay() + 1) % 7),
  );
}
export function calendarMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
export function calendarTime(minutes: number) {
  return new Intl.DateTimeFormat("ar-EG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 0, 1, 0, minutes)));
}
export function calendarDateLabel(
  date: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" },
) {
  return new Intl.DateTimeFormat("ar-EG", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

// Assign visual lanes for intersecting events, including minimum touch-target height.
export function calendarEventLanes(events: CalendarLesson[]) {
  const sorted = [...events].sort(
    (a, b) => calendarMinutes(a.time) - calendarMinutes(b.time),
  );
  const groups: CalendarLesson[][] = [];
  let end = -1;
  for (const event of sorted) {
    const start = calendarMinutes(event.time);
    const visualEnd = start + Math.max(event.duration, 40);
    if (start >= end) {
      groups.push([event]);
      end = visualEnd;
    } else {
      groups[groups.length - 1].push(event);
      end = Math.max(end, visualEnd);
    }
  }
  return groups.flatMap((group) => {
    const laneEnds: number[] = [];
    const positions = group.map((event) => {
      const start = calendarMinutes(event.time);
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = start + Math.max(event.duration, 40);
      return { event, lane };
    });
    return positions.map((position) => ({
      ...position,
      lanes: laneEnds.length,
    }));
  });
}
