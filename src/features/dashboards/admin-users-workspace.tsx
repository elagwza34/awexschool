"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoDialog } from "@/components/demo-dialog";
import { Panel, UsersTable } from "./dashboard-panels";
import { roleDefinitions } from "./management-fixtures";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TeamManagement } from "./team-management";

const userTabs = ["student", "parent", "teacher", "admin"].map(
  (id) => roleDefinitions.find((role) => role.id === id)!,
);

export function AdminUsersWorkspace() {
  return (
    <Panel
      title="إدارة المستخدمين والأدوار"
      subtitle="اختار الدور لعرض مستخدميه والبحث بينهم. البيانات المعروضة تجريبية."
      action={
        <DemoDialog
          label="معاينة إضافة مستخدم"
          title="نموذج إضافة مستخدم"
          description="واجهة الإدارة تجريبية فقط. لا يتم إنشاء مستخدم أو منحه دورًا أو إرسال دعوة."
        />
      }
    >
      <Tabs defaultValue="student" dir="rtl">
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
            {role.id === "admin" && (
              <div className="mb-4 rounded-xl border bg-secondary p-4">
                <p className="mb-3 text-sm">
                  أعضاء الإدارة: مدير، دعم فني، وخدمة عملاء.
                </p>
                <Button asChild>
                  <Link href="/admin/team">إدارة أعضاء الفريق</Link>
                </Button>
              </div>
            )}
            <UsersTable role={role.userRole} />
            {role.id === "admin" && (
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
