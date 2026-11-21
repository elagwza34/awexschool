import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";

export const authLink = "inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4";

export function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <main id="main-content" tabIndex={-1} className="container-shell grid min-h-[85svh] max-w-lg content-center pt-28 pb-12">
    <section className="soft-card p-5 sm:p-8" aria-labelledby="auth-title">
      <span className="mb-4 grid size-11 place-items-center rounded-xl bg-accent text-primary"><BookOpen aria-hidden="true" className="size-5" /></span>
      <h1 id="auth-title" className="text-2xl font-bold sm:text-3xl">{title}</h1>
      {description && <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  </main>;
}

export function EmailField() {
  return <label className="grid gap-2 text-sm font-semibold">البريد الإلكتروني
    <input name="email" className="field" type="email" dir="ltr" autoComplete="email" maxLength={254} required />
  </label>;
}

export function FormMessage({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <p role={error ? "alert" : "status"} className={`mb-4 rounded-lg border p-3 text-sm leading-7 ${error ? "text-destructive" : "bg-accent"}`}>{children}</p>;
}
