"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const imageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);
const audioTypes = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/aac", "audio/mpeg", "audio/wav", "audio/x-wav"]);
const maxBytes = 15 * 1024 * 1024;
const subscribeToHydration = () => () => {};
const browserSnapshot = () => true;
const serverSnapshot = () => false;

export function attachmentError(file: File) {
  if (!file.size || file.size > maxBytes) return "اختار ملف حجمه أكبر من صفر وبحد أقصى 15 ميجابايت.";
}

export function ChatAttachment({ file }: { file: File }) {
  const preview = useRef<HTMLImageElement | HTMLAudioElement>(null);
  const download = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const media = preview.current;
    const anchor = download.current;
    if (media) media.src = url;
    if (anchor) anchor.href = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const format = file.type.split(";")[0];
  return (
    <div className="my-2 grid max-w-full gap-2 rounded-lg border border-current/20 p-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- Local object URL for a chat attachment. */}
      {imageTypes.has(format) && <img ref={(element) => { preview.current = element; }} alt={file.name} className="max-h-56 max-w-full rounded object-contain" />}
      {audioTypes.has(format) && <audio ref={(element) => { preview.current = element; }} aria-label={file.name} controls preload="metadata" className="w-full min-w-0 max-w-64" />}
      <a ref={download} download={file.name} className="inline-flex min-h-11 items-center break-all text-sm underline"><bdi>{file.name}</bdi></a>
    </div>
  );
}

export function ChatAttachmentField({ file, onFile, onBusy }: {
  file?: File;
  onFile: (file?: File) => void;
  onBusy: (busy: boolean) => void;
}) {
  const id = useId();
  const ready = useSyncExternalStore(subscribeToHydration, browserSnapshot, serverSnapshot);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const mounted = useRef(false);
  const [error, setError] = useState("");
  const [state, setState] = useState<"idle" | "waiting" | "recording">("idle");
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
      const active = recorder.current;
      if (active && active.state !== "inactive") active.stop();
      active?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function pick(next: File) {
    const failure = attachmentError(next);
    setError(failure ?? "");
    if (!failure) onFile(next);
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("التسجيل مش متاح في المتصفح ده. تقدر ترفق ملف صوتي جاهز.");
      return;
    }
    setState("waiting");
    onBusy(true);
    setError("");
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const active = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      let failed = false;
      const startedAt = performance.now();
      recorder.current = active;
      active.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
      active.onerror = () => { failed = true; };
      active.onstop = () => {
        window.clearTimeout(timer.current);
        active.stream.getTracks().forEach((track) => track.stop());
        recorder.current = null;
        if (!mounted.current) return;
        setState("idle");
        onBusy(false);
        if (performance.now() - startedAt < 350) {
          setError("سجّل صوت لمدة أطول شوية قبل الإيقاف.");
          return;
        }
        if (failed || !chunks.length) {
          setError("تعذّر تسجيل الصوت. جرّب تاني أو ارفق ملف صوتي.");
          return;
        }
        const type = (active.mimeType || chunks[0].type || "audio/webm").split(";")[0];
        const extension = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        pick(new File(chunks, `voice-${Date.now()}.${extension}`, { type }));
      };
      active.start();
      setState("recording");
      timer.current = window.setTimeout(() => { if (active.state === "recording") active.stop(); }, 120000);
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      if (!mounted.current) return;
      setState("idle");
      onBusy(false);
      setError("تعذّر فتح الميكروفون. راجع إذن المتصفح أو ارفق ملف صوتي.");
    }
  }

  return (
    <div className="mt-3 grid gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label htmlFor={id} className="grid min-w-0 max-w-full gap-2 text-xs font-semibold">
          إرفاق ملف أو صورة أو صوت
          <input id={id} type="file" className="field max-w-full py-2" disabled={!ready || state !== "idle"}
            onChange={(event) => {
              const next = event.target.files?.[0];
              event.target.value = "";
              if (next) pick(next);
            }} />
        </label>
        <Button type="button" variant="outline" disabled={!ready || state === "waiting"} onClick={() => {
          if (state === "recording") {
            if (recorder.current?.state === "recording") recorder.current.stop();
          } else void startRecording();
        }}>{state === "recording" ? "إيقاف التسجيل" : "تسجيل صوتي"}</Button>
      </div>
      {state !== "idle" && <p role="status" className="text-xs">{state === "waiting" ? "بانتظار إذن الميكروفون…" : "جاري التسجيل… دقيقتين بحد أقصى."}</p>}
      {file && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <bdi className="break-all">{file.name}</bdi>
          <Button type="button" variant="ghost" disabled={state !== "idle"} onClick={() => { onFile(undefined); setError(""); }}>إزالة المرفق</Button>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
