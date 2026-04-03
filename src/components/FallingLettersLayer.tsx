"use client";

import { useMemo } from "react";
import { buildFallParticles } from "@/lib/fallingOverlayParticles";

const COUNT = 44;

function glyphsFromText(text: string): string[] {
  const t = text.trim();
  if (!t.length) return ["♥"];
  return Array.from(t);
}

export function FallingLettersLayer({ seed, text, color }: { seed: string; text: string; color: string }) {
  const glyphs = useMemo(() => glyphsFromText(text), [text]);

  const particles = useMemo(() => {
    return buildFallParticles(`letters:${seed}`, COUNT, (rnd) => {
      const g = glyphs[Math.floor(rnd() * glyphs.length)];
      return g ?? "♥";
    });
  }, [seed, glyphs]);

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
