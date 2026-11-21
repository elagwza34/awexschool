"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { TeacherProfileDraft } from "@/features/dashboards/management-types";

type Application = {
  id: string;
  profile: TeacherProfileDraft;
  status: "pending" | "accepted" | "rejected";
};
export const applicationStatuses = { pending: "قيد المراجعة", accepted: "مقبول", rejected: "مرفوض" } as const;

const ApplicationsContext = createContext<{
  applications: Application[];
  submit: (profile: TeacherProfileDraft) => { id: string } | { error: string };
  decide: (id: string, status: "accepted" | "rejected") => void;
} | null>(null);

export function TeacherApplicationsProvider({ children }: { children: ReactNode }) {
  const [applications, setApplications] = useState<Application[]>([]);
  return (
    <ApplicationsContext.Provider value={{
      applications,
      submit(profile) {
        if (applications.some((item) => item.profile.email === profile.email && item.status !== "rejected"))
          return { error: "فيه طلب مسجّل بالبريد ده بالفعل." };
        const id = `TCH-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;
        setApplications((previous) => previous.some((item) => item.profile.email === profile.email && item.status !== "rejected")
          ? previous : [{ id, profile, status: "pending" }, ...previous]);
        return { id };
      },
      decide(id, status) {
        setApplications((previous) => previous.map((item) =>
          item.id === id && item.status === "pending" ? { ...item, status } : item,
        ));
      },
    }}>
      {children}
    </ApplicationsContext.Provider>
  );
}

export function useTeacherApplications() {
  const context = useContext(ApplicationsContext);
  if (!context) throw new Error("TeacherApplicationsProvider is required");
  return context;
}
