import type { CSSProperties } from "react";
import type { BackgroundVideoBehavior, GlobalStyle } from "./inviteTypes";

/** Множитель яркости фонового изображения (0.35…1.35). */
export function globalBackgroundBrightness(g: GlobalStyle): number {
  const v = g.backgroundBrightness;
  if (v === undefined || v === null) return 1;
  return Math.min(1.35, Math.max(0.35, v));
}

export function inviteBackgroundImageLayerStyle(g: GlobalStyle): CSSProperties {
  return {
    backgroundImage: `url(${g.backgroundImage})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: `brightness(${globalBackgroundBrightness(g)})`,
  };
}

export function inviteBackgroundScrimStyle(g: GlobalStyle): CSSProperties {
  const o = g.overlayOpacity;
  const o2 = Math.min(1, o + 0.2);
  return {
    background: `linear-gradient(180deg, rgba(0,0,0,${o}), rgba(0,0,0,${o2}))`,
  };
}

export function inviteBackgroundFallbackStyle(): CSSProperties {
  return {
    background:
      "radial-gradient(520px 420px at 50% 0%, rgba(168,85,247,0.14), transparent 60%), radial-gradient(520px 420px at 50% 0%, rgba(255,106,61,0.10), transparent 62%), rgba(255,255,255,0.03)",
  };
}

/** Паузы фонового видео: уникальные секунды по возрастанию. */
export function normalizeBackgroundVideoBehavior(raw: unknown): BackgroundVideoBehavior {
  if (raw === "introThenLoopTail") return "introThenLoopTail";
  return "freezeAtPauses";
}

export function normalizeBackgroundVideoLoopFromSec(raw: unknown): number | undefined {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(86400, n);
}

export function normalizeBackgroundVideoPauseAtSec(raw: unknown): number[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const nums = raw.map((x) => Number(x)).filter((n) => !Number.isNaN(n) && n >= 0);
  if (nums.length === 0) return undefined;
  return [...new Set(nums)].sort((a, b) => a - b);
}

export function hasInviteBackgroundMedia(g: GlobalStyle): boolean {
  return Boolean(g.backgroundVideoUrl?.trim() || g.backgroundImage?.trim());
}
