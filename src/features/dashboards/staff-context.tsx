"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import { previewStudentId } from "./chat-data";
import {
  staffRequestFixtures,
  requestStatusLabels,
  requestCategories,
  requestSources,
  type RequestDraft,
  type RequestSource,
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
  submitRequest: (source: RequestSource, draft: RequestDraft) =>
    { ok: true; request: StaffRequest } | { ok: false; error: string };
}
const Context = createContext<StaffPreview | null>(null);
export function StaffPreviewProvider({ children }: { children: ReactNode }) {
  const { staffMembers: members, addStaffMember, accounts } = useEnrollmentPreview();
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
  const submitRequest: StaffPreview["submitRequest"] = (source, draft) => {
    if (!Object.hasOwn(requestCategories, draft.category))
      return { ok: false, error: "اختار نوع الطلب." };
    const account = source === "visitor" ? undefined : accounts.find((item) =>
      item.kind === source && item.entityId === (source === "student" ? previewStudentId : "preview-parent"),
    );
    if (source !== "visitor" && account?.status !== "نشط")
      return { ok: false, error: "الحساب غير نشط. تقدر تستخدم فورم الزائر من الموقع." };
    const name = (account?.name ?? draft.name ?? "").trim();
    const contactEmail = (account?.email ?? draft.email ?? "").trim().toLowerCase();
    const title = draft.title.trim();
    const details = draft.details.trim();
    if (name.length < 2 || name.length > 100 || contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))
      return { ok: false, error: "راجع الاسم والبريد الإلكتروني." };
    if (title.length < 5 || title.length > 120 || details.length < 10 || details.length > 2000)
      return { ok: false, error: "اكتب عنوان من 5 إلى 120 حرف وتفاصيل من 10 إلى 2000 حرف." };
    const owner = requestCategories[draft.category].owner;
    const id = `${owner === "support" ? "TECH" : "CS"}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const request: StaffRequest = {
      id, owner, title, details, sender: `${name} · ${requestSources[source]}`,
      contactEmail, source, category: draft.category, status: "new",
    };
    setRequests((previous) => [request, ...previous]);
    setActivity((previous) => [`${id}: طلب جديد`, ...previous]);
    return { ok: true, request };
  };
  return (
    <Context.Provider
      value={{ members, requests, activity, addMember, updateRequest, submitRequest }}
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
