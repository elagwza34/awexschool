"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEnrollmentPreview } from "./context";
import type { PreviewAccount } from "./data";
export function AccountEditor({ account }: { account: PreviewAccount }) {
  const { updateAccount } = useEnrollmentPreview();
  const [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          setError("");
        }}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label={`تعديل ${account.name}`}
          >
            تعديل
          </Button>
        </DialogTrigger>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل مستخدم</DialogTitle>
            <DialogDescription>
              تعديل سجل المعاينة فقط. التعطيل يمنع الإسنادات والإرسال التجريبي،
              ولا يغير صلاحيات أو حسابات فعلية.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const result = updateAccount(account.id, {
                name: String(data.get("name")),
                email: String(data.get("email")),
                status: String(data.get("status")) as PreviewAccount["status"],
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setOpen(false);
              setMessage("تم تحديث المستخدم في المعاينة.");
            }}
          >
            <div>
              <label
                htmlFor="account-name"
                className="mb-2 block text-sm font-semibold"
              >
                اسم المستخدم
              </label>
              <input
                id="account-name"
                name="name"
                className="field"
                defaultValue={account.name}
                required
                minLength={2}
                maxLength={160}
              />
            </div>
            <div>
              <label
                htmlFor="account-email"
                className="mb-2 block text-sm font-semibold"
              >
                بريد المستخدم
              </label>
              <input
                id="account-email"
                name="email"
                type="email"
                dir="ltr"
                className="field"
                defaultValue={account.email}
                required
                maxLength={254}
              />
            </div>
            <div>
              <label
                htmlFor="account-status"
                className="mb-2 block text-sm font-semibold"
              >
                حالة المستخدم
              </label>
              <select
                id="account-status"
                name="status"
                className="field"
                defaultValue={account.status}
              >
                <option>نشط</option>
                <option>بانتظار المراجعة</option>
                <option>معطل</option>
              </select>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit">حفظ المستخدم في المعاينة</Button>
          </form>
        </DialogContent>
      </Dialog>
      {message && (
        <p role="status" className="mt-2 text-xs text-primary">
          {message}
        </p>
      )}
    </>
  );
}
