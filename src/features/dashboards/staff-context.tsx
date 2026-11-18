"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import {
  staffRequestFixtures,
  requestStatusLabels,
  type StaffMember,
  type StaffRequest,
  type RequestStatus,
} from "./staff-data";
import type { StaffRole } from "./types";
interface StaffPreview {
  members: StaffMember[];
  requests: StaffRequest[];
  activity: string[];
  addMember: (draft: Omit<StaffMember, "id">) => {
    ok: boolean;
    error?: string;
  };
  updateRequest: (role: StaffRole, id: string, status: RequestStatus) => void;
}
const Context = createContext<StaffPreview | null>(null);
export function StaffPreviewProvider({ children }: { children: ReactNode }) {
  const { staffMembers: members, addStaffMember } = useEnrollmentPreview();
  const [requests, setRequests] = useState(staffRequestFixtures);
  const [activity, setActivity] = useState<string[]>([]);
  const addMember: StaffPreview["addMember"] = (draft) => {
    const result = addStaffMember(draft);
    if (result.ok)
      setActivity((previous) => [
        `إضافة عضو للمعاينة: ${draft.name.trim()}`,
        ...previous,
      ]);
    return result;
  };
  const updateRequest: StaffPreview["updateRequest"] = (role, id, status) => {
    const request = requests.find((item) => item.id === id);
    if (
      !request ||
      request.owner !== role ||
      !Object.hasOwn(requestStatusLabels, status) ||
      request.status === status
    )
      return;
    setRequests((previous) =>
      previous.map((item) => (item.id === id ? { ...item, status } : item)),
    );
    setActivity((previous) => [
      `${id}: ${requestStatusLabels[status]}`,
      ...previous,
    ]);
  };
  return (
    <Context.Provider
      value={{ members, requests, activity, addMember, updateRequest }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStaffPreview() {
  const context = useContext(Context);
  if (!context) throw new Error("StaffPreviewProvider is required");
  return context;
}
