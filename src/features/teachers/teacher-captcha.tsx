"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

const source = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    action: string;
    language: string;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
  }) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window { turnstile?: Turnstile }
}

let loader: Promise<Turnstile> | null = null;

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loader) return loader;
  loader = new Promise<Turnstile>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${source}"]`);
    const script = existing ?? document.createElement("script");
    const loaded = () => window.turnstile ? resolve(window.turnstile) : reject(new Error("captcha_unavailable"));
    script.addEventListener("load", loaded, { once: true });
    script.addEventListener("error", () => {
      loader = null;
      reject(new Error("captcha_unavailable"));
    }, { once: true });
    if (!existing) {
      script.src = source;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
  return loader;
}

export function TeacherCaptcha({ siteKey, action }: {
  siteKey: string;
  action: "teacher_apply" | "teacher_track";
}) {
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const widget = useRef<string | null>(null);
  const token = useRef("");
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  const [failed, setFailed] = useState(false);
  const clearToken = useCallback(() => {
    token.current = "";
    if (input.current) input.current.value = "";
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile().then((api) => {
      if (cancelled || !container.current) return;
      widget.current = api.render(container.current, {
        sitekey: siteKey,
        action,
        language: "ar",
        callback: (value) => {
          token.current = value;
          if (input.current) input.current.value = value;
          setFailed(false);
        },
        "expired-callback": clearToken,
        "error-callback": () => {
          clearToken();
          setFailed(true);
        },
      });
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [action, clearToken, siteKey]);

  useEffect(() => {
    const completed = wasPending.current && !pending;
    wasPending.current = pending;
    if (!completed) return;
    if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
    clearToken();
  }, [clearToken, pending]);

  return <div className="grid gap-2">
    <div ref={container} />
    <input ref={input} type="hidden" name="captchaToken" defaultValue="" readOnly />
    {failed && <p role="alert" className="rounded-lg border p-3 text-sm text-destructive">تعذّر التحقق الأمني. حاول مرة تانية.</p>}
  </div>;
}
