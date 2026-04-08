import { DEFAULT_HEARTS_COLOR } from "./demoInvite";
import type { InviteDoc, OverlayAnimation } from "./inviteTypes";

/** Цвет букв по умолчанию (если в документе не задан). */
export const DEFAULT_LETTERS_COLOR = "rgba(255,255,255,0.9)";

let overlayAnimSeq = 0;

export function newOverlayAnimId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    overlayAnimSeq += 1;
    return `${crypto.randomUUID()}-${overlayAnimSeq}`;
  }
  overlayAnimSeq += 1;
  // Даже при кликах “в один и тот же ms” гарантируем уникальность ключа.
  return `anim-${Date.now()}-${overlayAnimSeq}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createHeartsAnimation(partial?: Partial<Extract<OverlayAnimation, { kind: "hearts" }>>): OverlayAnimation {
  return {
    id: partial?.id ?? newOverlayAnimId(),
    kind: "hearts",
    enabled: partial?.enabled !== false,
    color: partial?.color ?? DEFAULT_HEARTS_COLOR,
  };
}

export function createLettersAnimation(partial?: Partial<Extract<OverlayAnimation, { kind: "letters" }>>): OverlayAnimation {
  return {
    id: partial?.id ?? newOverlayAnimId(),
    kind: "letters",
    enabled: partial?.enabled !== false,
    text: (partial?.text ?? "LOVE").trim() || "♥",
    color: partial?.color ?? DEFAULT_LETTERS_COLOR,
  };
}

/** Эффективный список для редактора и логики: новый формат или миграция с heartsSnow/heartsColor. */
export function effectiveOverlayAnimations(doc: InviteDoc): OverlayAnimation[] {
  if (doc.global.overlayAnimations !== undefined) {
    return doc.global.overlayAnimations;
  }
  if (doc.global.heartsSnow === false) {
    return [];
  }
  return [
    createHeartsAnimation({
      id: "legacy-hearts",
      color: doc.global.heartsColor ?? DEFAULT_HEARTS_COLOR,
    }),
  ];
}

function normalizeAnim(a: OverlayAnimation): OverlayAnimation {
  if (a.kind === "hearts") {
    return {
      id: a.id || newOverlayAnimId(),
      kind: "hearts",
      enabled: a.enabled !== false,
      color: a.color ?? DEFAULT_HEARTS_COLOR,
    };
  }
  const t = (a.text ?? "").trim() || "♥";
  return {
    id: a.id || newOverlayAnimId(),
    kind: "letters",
    enabled: a.enabled !== false,
    text: t,
    color: a.color ?? DEFAULT_LETTERS_COLOR,
  };
}

/** Нормализованный массив для публичной страницы после merge. */
export function mergeOverlayAnimationsForDoc(doc: InviteDoc): OverlayAnimation[] {
  const raw = effectiveOverlayAnimations(doc);
  if (raw.length === 0) return [];
  return raw.map((a) => normalizeAnim(a));
}

/** Удобно для полей цвета в UI (hex для native color input). */
export function hexOrFallbackForPicker(cssColor: string | undefined, fallback: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(cssColor ?? "") ? (cssColor as string) : fallback;
}
