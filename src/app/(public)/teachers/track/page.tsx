import { TrackRequest } from "@/features/dashboards/track-request";

export const metadata = { title: "متابعة طلب انضمام مدرس" };

export default function Page() {
  return <TrackRequest kind="teacher" />;
}
