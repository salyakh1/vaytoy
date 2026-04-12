"use client";

import { useCallback, useEffect, useRef } from "react";
import type { GlobalStyle } from "@/lib/inviteTypes";
import { globalBackgroundBrightness } from "@/lib/inviteBackgroundStyle";

type Props = {
  global: GlobalStyle;
  /** `fixed` — весь экран; `absolute` — превью в редакторе */
  position?: "fixed" | "absolute";
};

const EPS = 0.1;

export function InviteBackgroundVideo({ global, position = "fixed" }: Props) {
  const url = global.backgroundVideoUrl?.trim();
  const muted = global.backgroundVideoMuted !== false;
  const behavior = global.backgroundVideoBehavior ?? "freezeAtPauses";
  const loopFromSec = global.backgroundVideoLoopFromSec;
  const useIntroLoop =
    behavior === "introThenLoopTail" &&
    typeof loopFromSec === "number" &&
    Number.isFinite(loopFromSec) &&
    loopFromSec > 0;

  const pauseAt = [...(global.backgroundVideoPauseAtSec ?? [])]
    .map((n) => Number(n))
    .filter((n) => !Number.isNaN(n) && n >= 0);
  pauseAt.sort((a, b) => a - b);
  const uniq = [...new Set(pauseAt)];

  const videoRef = useRef<HTMLVideoElement>(null);
  const frozenRef = useRef(false);
  const introPhaseRef = useRef(true);

  const posClass = position === "fixed" ? "fixed inset-0 z-0" : "absolute inset-0 z-0";

  const tryFreezeAtPause = useCallback(() => {
    const el = videoRef.current;
    if (!el || frozenRef.current || uniq.length === 0) return;
    const t = el.currentTime;
    for (const p of uniq) {
      if (t >= p - 0.04) {
        el.currentTime = p;
        el.pause();
        frozenRef.current = true;
        return;
      }
    }
  }, [uniq]);

  useEffect(() => {
    frozenRef.current = false;
    introPhaseRef.current = true;
    const el = videoRef.current;
    if (!el || !url) return;
    el.currentTime = 0;
    void el.play().catch(() => {});
  }, [url, useIntroLoop, loopFromSec, uniq.length]);

  useEffect(() => {
    if (!useIntroLoop || !url) return;
    const el = videoRef.current;
    if (!el) return;
    const L = loopFromSec!;

    const tickIntroTail = () => {
      const dur = el.duration;
      if (!Number.isFinite(dur) || dur <= EPS) return;
      const loopStart = Math.min(L, dur - EPS);
      const t = el.currentTime;
      const introIsWholeFile = loopStart + EPS >= dur;

      if (introIsWholeFile) {
        if (introPhaseRef.current) {
          if (t >= dur - EPS) {
            introPhaseRef.current = false;
            el.currentTime = 0;
            void el.play().catch(() => {});
          }
        } else if (t >= dur - EPS) {
          el.currentTime = 0;
          void el.play().catch(() => {});
        }
        return;
      }

      if (introPhaseRef.current) {
        if (t >= loopStart - EPS) {
          el.currentTime = loopStart;
          introPhaseRef.current = false;
          void el.play().catch(() => {});
        }
      } else if (t >= dur - EPS) {
        el.currentTime = loopStart;
        void el.play().catch(() => {});
      }
    };

    const onEnded = () => {
      const dur = el.duration;
      if (!Number.isFinite(dur) || dur <= EPS) return;
      const loopStart = Math.min(L, dur - EPS);
      const introIsWholeFile = loopStart + EPS >= dur;

      if (introPhaseRef.current) {
        if (introIsWholeFile) {
          introPhaseRef.current = false;
          el.currentTime = 0;
          void el.play().catch(() => {});
        }
        return;
      }
      el.currentTime = introIsWholeFile ? 0 : loopStart;
      void el.play().catch(() => {});
    };

    el.addEventListener("timeupdate", tickIntroTail);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", tickIntroTail);
      el.removeEventListener("ended", onEnded);
    };
  }, [url, useIntroLoop, loopFromSec]);

  useEffect(() => {
    if (useIntroLoop || !url) return;
    const el = videoRef.current;
    if (!el) return;

    const onTimeUpdate = () => {
      if (frozenRef.current) return;
      tryFreezeAtPause();
    };

    const onEnded = () => {
      if (frozenRef.current || uniq.length === 0) return;
      const dur = el.duration;
      if (!Number.isFinite(dur) || dur <= 0) return;
      const minP = Math.min(...uniq);
      if (minP > dur) {
        el.currentTime = Math.max(0, dur - 0.05);
        el.pause();
        frozenRef.current = true;
      }
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
    };
  }, [url, tryFreezeAtPause, uniq, useIntroLoop]);

  if (!url) return null;

  const brightness = globalBackgroundBrightness(global);
  const nativeLoop = !useIntroLoop && uniq.length === 0;

  return (
    <div
      className={`pointer-events-none ${posClass} overflow-hidden bg-black`}
      style={{ filter: `brightness(${brightness})` }}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        src={url}
        playsInline
        muted={muted}
        loop={nativeLoop}
        autoPlay
        preload="auto"
      />
    </div>
  );
}
