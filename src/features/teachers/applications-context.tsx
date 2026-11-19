"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { TeacherProfileDraft } from "@/features/dashboards/management-types";

type Application = {
  id: string;
  profile: TeacherProfileDraft;
  status: "pending" | "accepted" | "rejected";
};

const ApplicationsContext = createContext<{
  applications: Application[];
  submit: (profile: TeacherProfileDraft) => string | undefined;
  decide: (id: string, status: "accepted" | "rejected") => void;
} | null>(null);

export function TeacherApplicationsProvider({ children }: { children: ReactNode }) {
  const [applications, setApplications] = useState<Application[]>([]);
  return (
    <ApplicationsContext.Provider value={{
      applications,
      submit(profile) {
        if (applications.some((item) => item.profile.email === profile.email && item.status !== "rejected"))
          return "فيه طلب مسجّل بالبريد ده بالفعل.";
        const id = crypto.randomUUID();
        setApplications((previous) => previous.some((item) => item.profile.email === profile.email && item.status !== "rejected")
          ? previous : [{ id, profile, status: "pending" }, ...previous]);
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
