"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Panel } from "./dashboard-panels";
import { staffRoles } from "./staff-data";
import { useStaffPreview } from "./staff-context";
import type { StaffRole } from "./types";

export function TeamManagement({ editable = false }: { editable?: boolean }) {
  const { members, addMember } = useStaffPreview();
  const [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const visible = members.filter(
    (member) =>
      (role === "all" || member.role === role) &&
      `${member.name} ${member.email}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <Panel
      title="فريق الإدارة"
      subtitle="أعضاء تجريبيون. الأدوار هنا واجهات مقترحة، ولا تمنح صلاحيات فعلية."
      action={
        editable ? (
          <Dialog
            open={open}
            onOpenChange={(value) => {
              setOpen(value);
              setError("");
            }}
          >
            <DialogTrigger asChild>
              <Button>إضافة عضو للإدارة</Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة عضو للإدارة</DialogTitle>
                <DialogDescription>
                  إضافة مؤقتة للمعاينة فقط؛ بدون إنشاء حساب أو إرسال دعوة.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const result = addMember({
                    name: String(form.get("name") ?? ""),
                    email: String(form.get("email") ?? ""),
                    role: String(form.get("role")) as StaffRole,
                  });
                  if (!result.ok) {
                    setError(result.error!);
                    return;
                  }
                  setOpen(false);
                  setStatus("تمت إضافة العضو في المعاينة فقط.");
                }}
              >
                <div>
                  <label
                    htmlFor="team-name"
                    className="mb-2 block text-sm font-bold"
                  >
                    اسم العضو
                  </label>
                  <input
                    id="team-name"
                    name="name"
                    className="field"
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </div>
                <div>
                  <label
                    htmlFor="team-email"
                    className="mb-2 block text-sm font-bold"
                  >
                    البريد الإلكتروني للعضو
                  </label>
                  <input
                    id="team-email"
                    name="email"
                    type="email"
                    dir="ltr"
                    className="field"
                    required
                    maxLength={254}
                  />
                </div>
                <div>
                  <label
                    htmlFor="team-role"
                    className="mb-2 block text-sm font-bold"
                  >
                    دور العضو
                  </label>
                  <select id="team-role" name="role" className="field" required>
                    {staffRoles.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit">إضافة في المعاينة</Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : undefined
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="team-search" className="mb-2 block text-sm font-bold">
            البحث في الفريق
          </label>
          <input
            id="team-search"
            type="search"
            className="field"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="team-filter" className="mb-2 block text-sm font-bold">
            تصفية دور الفريق
          </label>
          <select
            id="team-filter"
            className="field"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="all">الكل</option>
            {staffRoles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {status && (
        <p role="status" className="mb-4 text-sm text-primary">
          {status}
        </p>
      )}
      <div className="divide-y rounded-lg border bg-white">
        {visible.map((member) => (
          <article
            key={member.id}
            className="grid gap-x-4 gap-y-1 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_7rem_auto] sm:items-center"
          >
            <h3 className="font-bold">{member.name}</h3>
            <p className="break-all text-sm text-muted-foreground">
              <bdi>{member.email}</bdi>
            </p>
            <p className="text-sm font-semibold">
              {staffRoles.find((item) => item.id === member.role)!.label}
            </p>
            <Link
              href={`/${member.role}`}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
            >
              معاينة لوحة الدور
            </Link>
          </article>
        ))}
      </div>
      {!visible.length && (
        <p role="status" className="py-6 text-center text-sm">
          لا يوجد أعضاء مطابقون.
        </p>
      )}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {staffRoles.map((item) => (
          <div key={item.id} className="rounded-xl bg-secondary p-4">
            <h3 className="font-bold">{item.label}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
