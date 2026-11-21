"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { defaultPermission, type Permission } from "./permissions";
import type { DashboardRole } from "./types";

type Overrides = Partial<Record<DashboardRole, Partial<Record<Permission, boolean>>>>;
const storageKey = "liveschool.preview.role-permissions";
const changeEvent = "liveschool:preview-permissions";

function subscribe(callback: () => void) {
  window.addEventListener(changeEvent, callback);
  return () => window.removeEventListener(changeEvent, callback);
}

function getSnapshot() {
  return sessionStorage.getItem(storageKey) ?? "{}";
}

function getServerSnapshot() {
  return "{}";
}

function readOverrides(snapshot: string): Overrides {
  try {
    const parsed = JSON.parse(snapshot);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Overrides) {
  if (Object.keys(overrides).length) sessionStorage.setItem(storageKey, JSON.stringify(overrides));
  else sessionStorage.removeItem(storageKey);
  window.dispatchEvent(new Event(changeEvent));
}

const PermissionContext = createContext<{
  can: (role: DashboardRole, permission: Permission) => boolean;
  setPermission: (role: DashboardRole, permission: Permission, allowed: boolean) => void;
  resetRole: (role: DashboardRole) => void;
} | null>(null);

export function PermissionPreviewProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const overrides = readOverrides(snapshot);
  // تنظيف بيانات الجلسة المخزنة من التعديلات السابقة (تبديل اللوحة)
  if (typeof window !== "undefined") {
    try {
      const parsed = JSON.parse(snapshot);
      if (parsed && typeof parsed === "object") {
        const hasDashboardRoleOverride = Object.values(parsed as Record<string, Record<string, boolean>>).some(
          (perms) => Object.keys(perms).some((p) => p.startsWith("page:dashboard")),
        );
        if (hasDashboardRoleOverride) sessionStorage.removeItem(storageKey);
      }
    } catch {}
  }

  return (
    <PermissionContext.Provider value={{
      can: (role, permission) => {
        const override = overrides[role]?.[permission];
        return typeof override === "boolean" ? override : defaultPermission(role, permission);
      },
      setPermission: (role, permission, allowed) => {
        const current = readOverrides(getSnapshot());
        writeOverrides({ ...current, [role]: { ...current[role], [permission]: allowed } });
      },
      resetRole: (role) => {
        const current = readOverrides(getSnapshot());
        delete current[role];
        writeOverrides(current);
      },
    }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) throw new Error("PermissionPreviewProvider is required");
  return context;
}
