"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { referenceContent } from "./reference-content";
import "./reference-home.css";

declare global {
  interface Window {
    mountSchoolHome?: (element: HTMLElement) => () => void;
  }
}

const markup = { __html: referenceContent };

export function ReferenceHome() {
  const root = useRef<HTMLDivElement>(null);
  const [motionReady, setMotionReady] = useState(false);

  useEffect(() => {
    if (motionReady && root.current) {
      return window.mountSchoolHome?.(root.current);
    }
  }, [motionReady]);

  return (
    <>
      <div
        className="reference-home"
        ref={root}
        dangerouslySetInnerHTML={markup}
      />
      <Script
        src="/school-home/motion.js"
        onReady={() => setMotionReady(true)}
      />
    </>
  );
}
