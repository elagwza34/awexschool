"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DemoNotice } from "@/components/shared";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <>
      <DemoNotice className="mb-4" />
      <p className="mb-4 text-sm font-semibold text-muted-foreground">
        للتجربة فقط. استخدم بيانات وهمية، ولا تدخل معلوماتك الحقيقية.
      </p>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          event.currentTarget.reset();
          setMessage(
            register
              ? "اكتملت معاينة نموذج التسجيل. لم يتم إنشاء حساب أو حفظ أي بيانات."
              : "اكتملت معاينة نموذج الدخول. لم يتم تسجيل الدخول أو إرسال أي بيانات.",
          );
        }}
      >
        {register && (
          <div className="space-y-2">
            <Label htmlFor="display-name">الاسم في النموذج</Label>
            <Input
              id="display-name"
              name="display-name"
              autoComplete="off"
              placeholder="مثال: طالب liveschool"
              required
              minLength={2}
              maxLength={80}
              className="min-h-11 rounded-xl"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            name="email"
            dir="ltr"
            className="min-h-11 rounded-xl text-end"
            autoComplete="off"
            type="email"
            required
            placeholder="student@example.com"
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">كلمة المرور التجريبية</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              dir="ltr"
              className="min-h-11 rounded-xl pe-9 text-end"
              autoComplete={register ? "new-password" : "off"}
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              maxLength={128}
              aria-describedby="password-hint"
            />
            <button
              type="button"
              aria-label={
                showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
              }
              aria-pressed={showPassword}
              className="absolute start-1 top-0.5 flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
          <p id="password-hint" className="text-xs text-muted-foreground">
            ٨ أحرف على الأقل للتجربة. لن تُحفظ كلمة المرور.
          </p>
        </div>
        {register ? (
          <div className="space-y-2">
            <Label htmlFor="role-preview">أستكشف الواجهة بصفتي</Label>
            <select id="role-preview" name="role-preview" className="field">
              <option>طالب</option>
              <option>ولي أمر</option>
              <option>مدرس</option>
            </select>
            <p className="text-xs text-muted-foreground">
              اختيار بصري فقط، لا يمنح أي صلاحيات.
            </p>
          </div>
        ) : (
          <button
            type="button"
            className="flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4"
            onClick={() =>
              setMessage(
                "استعادة الحساب غير مفعلة في هذه النسخة. لم يتم إرسال بريد إلكتروني.",
              )
            }
          >
            نسيت كلمة المرور؟
          </button>
        )}
        <Button type="submit" size="lg" className="w-full">
          <LockKeyhole aria-hidden="true" />
          {register ? "معاينة إنشاء الحساب" : "معاينة تسجيل الدخول"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {register ? "لديك حساب؟" : "أول مرة هنا؟"}{" "}
        <Link
          className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4"
          href={register ? "/login" : "/register"}
        >
          {register ? "شاهد نموذج الدخول" : "شاهد نموذج التسجيل"}
        </Link>
      </p>
      <Dialog
        open={!!message}
        onOpenChange={(open) => {
          if (!open) setMessage("");
        }}
      >
        <DialogContent dir="rtl">
          <DialogHeader className="text-start">
            <DialogTitle>معاينة بدون حساب فعلي</DialogTitle>
            <DialogDescription className="pt-3 leading-7">
              {message}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
