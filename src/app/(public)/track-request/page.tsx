import { TrackRequest } from "@/features/dashboards/track-request";

export const metadata = { title: "متابعة طلب الدعم" };

export default function Page() {
  return <TrackRequest kind="support" />;
}
