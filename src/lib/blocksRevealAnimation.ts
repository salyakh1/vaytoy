import type { CSSProperties } from "react";
import type { BlocksRevealMode } from "./inviteTypes";

/** Значение по умолчанию для `blocksRevealDurationSec` (секунды). */
export const DEFAULT_BLOCKS_REVEAL_DURATION_SEC = 1.5;

const BLOCKS_REVEAL_DURATION_MIN = 0.25;
const BLOCKS_REVEAL_DURATION_MAX = 8;

export function normalizeBlocksRevealDurationSec(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_BLOCKS_REVEAL_DURATION_SEC;
  return Math.min(BLOCKS_REVEAL_DURATION_MAX, Math.max(BLOCKS_REVEAL_DURATION_MIN, n));
}

export const BLOCKS_REVEAL_OPTIONS: { value: BlocksRevealMode; label: string }[] = [
  { value: "fade", label: "Плавное появление" },
  { value: "slideUp", label: "Снизу вверх" },
  { value: "zoom", label: "Увеличение" },
  { value: "blur", label: "Из размытия" },
  { value: "cascade", label: "Каскад (по очереди)" },
];

export function normalizeBlocksRevealMode(raw: unknown): BlocksRevealMode {
  const allowed: BlocksRevealMode[] = ["fade", "slideUp", "zoom", "blur", "cascade"];
  if (typeof raw === "string" && allowed.includes(raw as BlocksRevealMode)) return raw as BlocksRevealMode;
  return "fade";
}

export function inviteBlockRevealProps(
  mode: BlocksRevealMode,
  blockIndex: number,
  durationSec?: number,
): { className: string; style: CSSProperties } {
  const dur = normalizeBlocksRevealDurationSec(durationSec);
  const base = "invite-block-reveal";
  const cls =
    mode === "cascade" ? `${base} invite-block-reveal--cascade` : `${base} invite-block-reveal--${mode}`;
  const style: CSSProperties = {
    animationDuration: `${dur}s`,
  };
  if (mode === "cascade") {
    style.animationDelay = `${blockIndex * dur * 0.12}s`;
  }
  return { className: cls, style };
}
