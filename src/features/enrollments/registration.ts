import type { LearningGroup } from "./data";

export const groupDays = { sat: "السبت", sun: "الأحد", mon: "الاثنين", tue: "الثلاثاء", wed: "الأربعاء", thu: "الخميس", fri: "الجمعة" };
export const reservationDuration = 10 * 60 * 1000;
export const formatGroupFee = (value: number) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(value / 100);

export interface JoinRequest {
  id: string;
  groupId: string;
  studentId: string;
  fee: number;
  expiresAt: number;
  status: "reserved" | "paid" | "approved" | "rejected";
}

export const holdsSeat = (request: JoinRequest, now: number) =>
  request.status === "paid" || (request.status === "reserved" && request.expiresAt > now);

export function availableSeats(group: LearningGroup, requests: JoinRequest[], now: number) {
  const held = requests.filter((request) => request.groupId === group.id &&
    !group.studentIds.includes(request.studentId) && holdsSeat(request, now)).length;
  return Math.max(0, group.capacity - group.studentIds.length - held);
}
