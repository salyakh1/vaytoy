"use client";

import { useMemo } from "react";
import { buildFallParticles } from "@/lib/fallingOverlayParticles";

const COUNT = 44;

export function FloatingHeartsLayer({ seed, color }: { seed: string; color: string }) {
  const particles = useMemo(
    () => buildFallParticles(`hearts:${seed}`, COUNT, () => "♥"),
    [seed],
  );

  return (
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          className="invite-fall-particle absolute will-change-transform"
          style={{
            left: `${p.leftPct}%`,
            top: "-6%",
            fontSize: `${p.sizePx}px`,
            color,
            opacity: p.opacity,
            ["--heart-drift" as string]: `${p.driftPx}px`,
            ["--heart-rot0" as string]: `${p.rotStart}deg`,
            ["--heart-opacity" as string]: String(p.opacity),
            animationDuration: `${p.durationSec}s`,
            animationDelay: `${p.delaySec}s`,
          }}
        >
          {p.glyph}
        </span>
      ))}
    </>
  );
}
