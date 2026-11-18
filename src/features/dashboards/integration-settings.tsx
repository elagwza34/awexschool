"use client";

import { useRef, useState } from "react";
import { Check, Link2, PlugZap, Save, Video } from "lucide-react";
import { Badge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Panel } from "./dashboard-panels";
import { connectionSteps, providerNames } from "./management-fixtures";
import type { MeetingProvider } from "./management-types";
import { usePortalPreview } from "./preview-context";

function ProviderSettingsForm({ provider }: { provider: MeetingProvider }) {
  const { providers, saveProvider } = usePortalPreview();
  const settings = providers[provider];
  const [draft, setDraft] = useState(settings);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const name = providerNames[provider];
  const toggleDemo = () => {
    if (settings.demoEnabled) {
      saveProvider({ ...settings, demoEnabled: false });
      setDraft((value) => ({ ...value, demoEnabled: false }));
      setMessage("تم إيقاف محاكاة الربط. الحصص السابقة لم تتغير.");
    } else if (formRef.current?.reportValidity()) {
      setOpen(true);
    }
  };
  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Panel
        title={`إعدادات ${name}`}
        subtitle="حساب استضافة افتراضي للتجربة، وليس حسابًا متصلًا"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge className="bg-muted text-muted-foreground">
            الربط الحقيقي: غير متصل
          </Badge>
          <Badge
            className={
              settings.demoEnabled ? "" : "bg-[#fbefdd] text-[#86521f]"
            }
          >
            {settings.demoEnabled
              ? "محاكاة الربط مفعّلة"
              : "محاكاة الربط غير مفعّلة"}
          </Badge>
        </div>
        <form
          ref={formRef}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveProvider({ ...draft, demoEnabled: settings.demoEnabled });
            setMessage(
              "تم حفظ إعدادات المعاينة مؤقتًا. لم يتم ربط حساب خارجي.",
            );
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${provider}-name`}>
                اسم الحساب المستضيف التجريبي
              </Label>
              <Input
                id={`${provider}-name`}
                value={draft.hostName}
                onChange={(e) => {
                  setDraft({ ...draft, hostName: e.target.value });
                  setMessage("");
                }}
                required
                maxLength={100}
                className="min-h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${provider}-email`}>
                بريد المستضيف التجريبي
              </Label>
              <Input
                id={`${provider}-email`}
                type="email"
                dir="ltr"
                autoComplete="off"
                value={draft.hostEmail}
                onChange={(e) => {
                  setDraft({ ...draft, hostEmail: e.target.value });
                  setMessage("");
                }}
                required
                maxLength={160}
                className="min-h-11 rounded-xl"
              />
            </div>
            {provider === "google-meet" && (
              <div className="space-y-2">
                <Label htmlFor="google-calendar-id">
                  التقويم المستخدم في المعاينة
                </Label>
                <Input
                  id="google-calendar-id"
                  dir="ltr"
                  value={draft.calendarId}
                  required
                  maxLength={160}
                  onChange={(e) =>
                    setDraft({ ...draft, calendarId: e.target.value })
                  }
                  className="min-h-11 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  primary نموذج للتقويم الأساسي، ولم يتم اختباره مع Google.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor={`${provider}-duration`}>
                مدة الحصة الافتراضية
              </Label>
              <select
                id={`${provider}-duration`}
                className="field"
                value={draft.defaultDuration}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    defaultDuration: Number(e.target.value),
                  })
                }
              >
                {[30, 45, 60, 90].map((duration) => (
                  <option key={duration} value={duration}>
                    {duration} دقيقة
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${provider}-timezone`}>المنطقة الزمنية</Label>
              <Input
                id={`${provider}-timezone`}
                readOnly
                dir="ltr"
                value="Africa/Cairo"
                className="min-h-11 rounded-xl bg-muted"
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-secondary/40 p-4">
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-primary"
              checked={draft.autoCreate}
              onChange={(e) =>
                setDraft({ ...draft, autoCreate: e.target.checked })
              }
            />
            <span>
              <span className="block text-sm font-bold">
                إنشاء اجتماع تلقائي للحصة في المحاكاة
              </span>
              <span className="mt-1 block text-xs leading-7 text-muted-foreground">
                عند تفعيل المحاكاة وحفظ الإعداد، تعرض الحصة الجديدة معرّف اجتماع
                تجريبيًا. لا يتم إنشاء رابط حقيقي.
              </span>
            </span>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="outline">
              <Save aria-hidden="true" />
              حفظ إعدادات المعاينة
            </Button>
            <Button type="button" onClick={toggleDemo}>
              <PlugZap aria-hidden="true" />
              {settings.demoEnabled
                ? "إيقاف محاكاة الربط"
                : `محاكاة ربط ${name}`}
            </Button>
          </div>
          {message && (
            <p role="status" className="text-sm font-semibold text-primary">
              {message}
            </p>
          )}
        </form>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl">
            <DialogHeader className="text-start">
              <DialogTitle>محاكاة ربط {name}</DialogTitle>
              <DialogDescription className="pt-2 leading-7">
                سيُستخدم حساب الاستضافة الافتراضي في نموذج إنشاء الحصة فقط. هذه
                ليست موافقة ربط حقيقي، ولا تُرسل بيانات إلى المزود.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border bg-secondary p-4 text-sm">
              <p className="font-bold">{draft.hostName}</p>
              <p className="mt-2 break-all text-xs text-muted-foreground">
                <bdi>{draft.hostEmail}</bdi>
              </p>
            </div>
            <Button
              onClick={() => {
                saveProvider({ ...draft, demoEnabled: true });
                setDraft({ ...draft, demoEnabled: true });
                setMessage(
                  `محاكاة ${name} جاهزة. جرّب إنشاء حصة من لوحة المدرس.`,
                );
                setOpen(false);
              }}
            >
              تأكيد محاكاة الربط
            </Button>
          </DialogContent>
        </Dialog>
      </Panel>
      <div className="space-y-4">
        <Panel title="رحلة الربط" subtitle="خطوات توضّح الربط المستقبلي">
          <ol className="space-y-4">
            {connectionSteps[provider].map((step, index) => (
              <li className="flex items-start gap-3" key={step}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="text-xs font-bold leading-7">{step}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {settings.demoEnabled
                      ? "معاينة فقط — لم تُنفذ فعليًا"
                      : "غير منفّذة"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="ما الذي يحدث عند إنشاء الحصة؟">
          <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
            <Link2 aria-hidden="true" />
          </div>
          <ul className="space-y-4 text-xs leading-7 text-muted-foreground">
            {[
              "المدرس يختار مقررًا وموعدًا ومدة الحصة.",
              "يُستخدم مزود الاجتماع الذي يختاره المدرس.",
              "إذا كانت المحاكاة مفعّلة والإنشاء التلقائي مفعّلًا، يظهر معرّف اجتماع تجريبي.",
              "إذا لم تكن مفعّلة، تُحفظ الحصة في المعاينة بدون اجتماع.",
            ].map((text) => (
              <li key={text} className="flex gap-2">
                <Check
                  aria-hidden="true"
                  className="mt-1.5 size-3.5 shrink-0 text-primary"
                />
                {text}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

export function IntegrationSettings() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#d5e2ca] bg-[#f0f3f1] p-4">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Video aria-hidden="true" className="size-5" />
          كل الاجتماعات هنا نماذج توضيحية
        </p>
        <p className="mt-2 text-xs leading-7 text-muted-foreground">
          الإعدادات لا تطلب كلمة مرور أو مفتاحًا سريًا. استخدم بيانات افتراضية
          فقط. تظل حالة الحساب الحقيقي «غير متصل» أثناء المحاكاة.
        </p>
      </div>
      <Tabs defaultValue="google-meet" dir="rtl">
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:w-96">
          <TabsTrigger value="google-meet" className="min-h-11">
            Google Meet
          </TabsTrigger>
          <TabsTrigger value="zoom" className="min-h-11">
            Zoom
          </TabsTrigger>
        </TabsList>
        <TabsContent value="google-meet">
          <ProviderSettingsForm provider="google-meet" />
        </TabsContent>
        <TabsContent value="zoom">
          <ProviderSettingsForm provider="zoom" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
