"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PasswordField({ name = "password", label = "كلمة المرور", fresh = false, describedBy }: {
  name?: string; label?: string; fresh?: boolean; describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="grid gap-2 text-sm font-semibold">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input id={id} className="field w-full pl-14" type={visible ? "text" : "password"} name={name} dir="ltr"
          minLength={fresh ? 12 : undefined} maxLength={72} autoComplete={fresh ? "new-password" : "current-password"}
          aria-describedby={describedBy} required />
        <button type="button" aria-controls={id} aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          className="absolute inset-y-0 end-0 grid min-w-11 place-items-center rounded-lg text-primary focus-visible:outline-2 focus-visible:outline-offset-[-3px]"
          onClick={() => setVisible(!visible)}><Icon className="size-5" aria-hidden="true" /></button>
      </div>
    </div>
  );
}

export function AuthSubmit({ children, pending = "جارٍ الإرسال…" }: { children: string; pending?: string }) {
  const status = useFormStatus();
  return <Button type="submit" disabled={status.pending} className="min-h-11 w-full">{status.pending ? pending : children}</Button>;
}
