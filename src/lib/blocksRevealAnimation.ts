import type { CSSProperties } from "react";
import type { BlocksRevealMode } from "./inviteTypes";

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
): { className: string; style: CSSProperties } {
  const base = "invite-block-reveal";
  const cls =
    mode === "cascade" ? `${base} invite-block-reveal--cascade` : `${base} invite-block-reveal--${mode}`;
  const style: CSSProperties =
    mode === "cascade" ? { animationDelay: `${blockIndex * 0.09}s` } : {};
  return { className: cls, style };
}
