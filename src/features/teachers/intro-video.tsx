"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

function durationOf(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const finish = (duration?: number) => {
      clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      URL.revokeObjectURL(url);
      if (duration === undefined) reject(new Error("Unreadable video"));
      else resolve(duration);
    };
    const timer = window.setTimeout(() => finish(), 8000);
    video.preload = "metadata";
    video.onloadedmetadata = () => finish(video.duration);
    video.onerror = () => finish();
    video.src = url;
  });
}

export function IntroVideo({ file }: { file?: File }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!file || !element) return;
    const url = URL.createObjectURL(file);
    element.src = url;
    return () => {
      element.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [file]);
  return file ? <video ref={ref} controls playsInline preload="metadata" aria-label="فيديو شرح المدرس" className="max-h-64 w-full max-w-md rounded-lg bg-black" /> : null;
}

export function IntroVideoField({ file, onChange, onPending }: {
  file?: File;
  onChange: (file?: File) => void;
  onPending: (pending: boolean) => void;
}) {
  const id = useId();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-semibold">فيديو شرح (اختياري)</label>
      <p id={`${id}-hint`} className="text-xs leading-6 text-muted-foreground">اشرح فكرة من مادتك في فيديو مدته لحد دقيقة. MP4 أو WebM، بحد أقصى 25 ميجابايت.</p>
      <input id={id} className="field py-2 text-sm" type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={pending}
        aria-describedby={`${id}-hint`} onChange={async (event) => {
          const input = event.currentTarget;
          const next = input.files?.[0];
          input.value = "";
          if (!next) return;
          setError("");
          if (!/\.(mp4|webm)$/i.test(next.name) || next.size > 25 * 1024 * 1024) {
            setError("اختار فيديو MP4 أو WebM حجمه 25 ميجابايت أو أقل.");
            return;
          }
          setPending(true);
          onPending(true);
          try {
            const duration = await durationOf(next);
            if (!Number.isFinite(duration) || duration <= 0 || duration > 60) {
              setError("مدة الفيديو لازم تكون دقيقة أو أقل.");
            } else onChange(next);
          } catch {
            setError("تعذّر قراءة الفيديو. جرّب ملف MP4 أو WebM تاني.");
          } finally {
            setPending(false);
            onPending(false);
          }
        }} />
      {pending && <p role="status" className="text-sm">جاري التحقق من مدة الفيديو…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {file && <><IntroVideo file={file} /><Button type="button" variant="outline" className="justify-self-start" disabled={pending} onClick={() => { onChange(undefined); setError(""); }}>إزالة الفيديو</Button></>}
    </div>
  );
}
