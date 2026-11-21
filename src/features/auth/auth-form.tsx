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
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("display-name") ?? "").trim();
    const role = String(formData.get("role-preview") ?? "student");

    try {
      if (register) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email,
              account_kind: role === "ولي أمر" ? "parent" : "student",
            },
            emailRedirectTo: `${window.location.origin}/account/callback`,
          },
        });
        if (error) throw error;
        setMessage(
          "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيل الحساب ثم يمكنك تسجيل الدخول."
        );
        event.currentTarget.reset();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage("تم تسجيل الدخول بنجاح. جاري التوجيه...");
        setTimeout(() => {
          router.push("/account?from=login");
        }, 1000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع. يرجى المحاولة لاحقًا.";
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form
        className="space-y-4"
        onSubmit={handleSubmit}
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
              disabled={loading}
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
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">كلمة المرور</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              dir="ltr"
              className="min-h-11 rounded-xl pe-9 text-end"
              autoComplete={register ? "new-password" : "current-password"}
              type={showPassword ? "text" : "password"}
              required
              minLength={register ? 12 : 1}
              maxLength={128}
              aria-describedby="password-hint"
              disabled={loading}
            />
            <button
              type="button"
              disabled={loading}
              aria-label={
                showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
              }
              aria-pressed={showPassword}
              className={`absolute start-1 top-0.5 flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
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
            {register ? "١٢ حرفًا على الأقل" : "أدخل كلمة المرور الخاصة بك"}
          </p>
        </div>
        {register ? (
          <div className="space-y-2">
            <Label htmlFor="role-preview">نوع الحساب</Label>
            <select
              id="role-preview"
              name="role-preview"
              className="field"
              disabled={loading}
            >
              <option value="student">طالب</option>
              <option value="parent">ولي أمر</option>
            </select>
            <p className="text-xs text-muted-foreground">
              سيتم تعيين دورك في النظام بناءً على هذا الاختيار.
            </p>
          </div>
        ) : (
          <button
            type="button"
            disabled={loading}
            className={`flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() =>
              setMessage(
                "إذا نسيت كلمة المرور، يرجى التواصل مع دعم المنصة لإعادة تعيينها."
              )
            }
          >
            نسيت كلمة المرور؟
          </button>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          <LockKeyhole aria-hidden="true" />
          {register ? "إنشاء الحساب" : "تسجيل الدخول"}
          {loading && " ... Loading"}
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
      {message && (
        <Dialog
          open={!!message}
          onOpenChange={(open) => {
            if (!open) setMessage("");
          }}
        >
          <DialogContent dir="rtl">
            <DialogHeader className="text-start">
              <DialogTitle>
                {register ? "إنشاء الحساب" : "تسجيل الدخول"}
              </DialogTitle>
              <DialogDescription className="pt-3 leading-7">
                {message}
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}