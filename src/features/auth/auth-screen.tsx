import { BookOpen, Check } from "lucide-react";
import { Breadcrumbs } from "@/components/shared";
import { AuthForm } from "./auth-form";

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  return (
    <div className="container-shell py-6 md:py-8">
      <Breadcrumbs
        items={[
          { label: register ? "إنشاء حساب تجريبي" : "تسجيل الدخول التجريبي" },
        ]}
      />
      <div className="mx-auto mb-6 grid max-w-5xl overflow-hidden rounded-3xl border bg-white lg:grid-cols-2">
        <div className="p-4 sm:p-7">
          <p className="eyebrow">خطوة صغيرة لفهم أكبر</p>
          <h1 className="text-3xl font-bold">
            {register ? "كل رحلة لها بداية." : "نكمّل رحلة الفهم؟"}
          </h1>
          <p className="mb-5 mt-3 text-sm text-muted-foreground">
            {register
              ? "اكتشف شكل التسجيل في liveschool."
              : "نموذج بصري لتجربة دخول واضحة وبسيطة."}
          </p>
          <AuthForm mode={mode} />
        </div>
        <aside className="hidden flex-col justify-center bg-[#edf2e8] p-7 lg:flex">
          <span className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-[#cbd8c3] bg-white">
            <BookOpen aria-hidden="true" className="size-9 text-primary" />
          </span>
          <h2 className="text-3xl font-semibold leading-relaxed">
            سؤالك له مكان.
            <br />
            وطريقتك في التعلّم كمان.
          </h2>
          <p className="mb-6 mt-4 leading-7 text-muted-foreground">
            مقررات مرتبة، وشرح قريب منك، ومساحة تكتشف فيها إمكانياتك.
          </p>
          <ul className="space-y-4 text-sm">
            {[
              "منهج مصري، بلغة واضحة",
              "كل مرحلة بخطوات تناسبها",
              "تعلّم يبدأ بالفهم",
            ].map((text) => (
              <li className="flex items-center gap-3" key={text}>
                <Check aria-hidden="true" className="size-4 text-primary" />
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-7 border-t border-[#cedbc8] pt-4 text-xs text-muted-foreground">
            واجهة عرض فقط. لا يوجد اتصال بخدمة حسابات.
          </p>
        </aside>
      </div>
    </div>
  );
}
