"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEnrollmentPreview } from "@/features/enrollments/context";
import type { PreviewAccount } from "@/features/enrollments/data";
import { Panel, UsersTable } from "./dashboard-panels";
import { roleDefinitions } from "./management-fixtures";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TeamManagement } from "./team-management";
import { usePermissions } from "./permissions-context";
import type { DashboardRole } from "./types";
import { TeacherProfileForm } from "@/features/teachers/profile-form";

const userTabs = ["student", "parent", "teacher", "admin"].map(
  (id) => roleDefinitions.find((role) => role.id === id)!,
);

export function AdminUsersWorkspace({ actor = "admin" }: { actor?: DashboardRole }) {
  const { can } = usePermissions();
  const { addAccount } = useEnrollmentPreview();
  const [tab, setTab] = useState<PreviewAccount["kind"]>("student");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PreviewAccount["kind"]>("student");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <Panel
      title="إدارة المستخدمين والأدوار"
      subtitle="اختار الدور لعرض مستخدميه والبحث بينهم. البيانات المعروضة تجريبية."
      action={
        can(actor, "users:create") && (
          <Dialog open={open} onOpenChange={(value) => {
            setOpen(value);
            setError("");
            if (value) setKind(tab);
          }}>
            <DialogTrigger asChild><Button>إضافة مستخدم</Button></DialogTrigger>
            <DialogContent dir="rtl" className={kind === "teacher" ? "max-h-[90dvh] overflow-y-auto sm:max-w-3xl" : undefined}>
              <DialogHeader>
                <DialogTitle>إضافة مستخدم</DialogTitle>
                <DialogDescription>هيظهر المستخدم في القائمة بحالة بانتظار المراجعة داخل المعاينة. إرسال الدعوات يتطلب ربط المنصة بالباك إند.</DialogDescription>
              </DialogHeader>
              <label className="grid gap-2 text-sm font-semibold">
                دور المستخدم
                <select className="field" value={kind} onChange={(event) => {
                  setKind(event.target.value as PreviewAccount["kind"]);
                  setError("");
                }}>
                  {userTabs.map((role) => <option key={role.id} value={role.id}>{role.userRole}</option>)}
                </select>
              </label>
              {kind === "teacher" ? (
                <TeacherProfileForm submitLabel="حفظ المدرس" onSave={(profile) => {
                  const result = addAccount({ kind, name: profile.displayName, email: profile.email, teacherProfile: profile }, actor);
                  if (!result.ok) return result.error;
                  setTab("teacher");
                  setOpen(false);
                  setMessage(`تمت إضافة ${profile.displayName} في المعاينة.`);
                }} />
              ) : <form className="grid gap-4" onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const name = String(data.get("name"));
                const result = addAccount({ kind, name, email: String(data.get("email")) }, actor);
                if (!result.ok) { setError(result.error); return; }
                setTab(kind);
                setOpen(false);
                setMessage(`تمت إضافة ${name.trim()} في المعاينة.`);
              }}>
                <label className="grid gap-2 text-sm font-semibold">
                  اسم المستخدم
                  <input className="field" name="name" required minLength={2} maxLength={160} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  بريد المستخدم
                  <input className="field" name="email" type="email" dir="ltr" required maxLength={254} />
                </label>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit">حفظ المستخدم في المعاينة</Button>
              </form>}
            </DialogContent>
          </Dialog>
        )
      }
    >
      <p role="status" className={message ? "mb-3 text-sm text-primary" : "sr-only"}>{message}</p>
      <Tabs value={tab} onValueChange={(value) => setTab(value as PreviewAccount["kind"])} dir="rtl">
        <TabsList className="mb-4 grid w-full grid-cols-4 sm:max-w-xl">
          {userTabs.map((role) => (
            <TabsTrigger
              key={role.id}
              value={role.id}
              className="min-h-11 px-2 text-xs sm:text-sm"
            >
              {role.userRole}
            </TabsTrigger>
          ))}
        </TabsList>
        {userTabs.map((role) => (
          <TabsContent key={role.id} value={role.id}>
            {role.id === "admin" && actor === "admin" && can(actor, "page:team") && (
              <div className="mb-4 rounded-xl border bg-secondary p-4">
                <p className="mb-3 text-sm">
                  أعضاء الإدارة: مدير، دعم فني، وخدمة عملاء.
                </p>
                <Button asChild>
                  <Link href="/admin/team">إدارة أعضاء الفريق</Link>
                </Button>
              </div>
            )}
            <UsersTable role={role.userRole} actor={actor} />
            {role.id === "admin" && actor === "admin" && can(actor, "page:team") && (
              <div className="mt-4">
                <TeamManagement editable />
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Panel>
  );
}
