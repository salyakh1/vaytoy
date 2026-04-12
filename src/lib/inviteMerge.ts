import type { InviteBlock, InviteDoc } from "./inviteTypes";
import { createDemoInvite } from "./demoInvite";
import { normalizeBlocksRevealMode } from "./blocksRevealAnimation";
import { normalizeInviteFontFamily } from "./inviteFontFamilies";
import { mergeOverlayAnimationsForDoc } from "./overlayAnimMerge";

/** Добавляет в документ новые типы блоков из шаблона, если их ещё нет (старые сохранённые приглашения). */
export function mergeInviteWithDefaults(slug: string, doc: InviteDoc): InviteDoc {
  const demo = createDemoInvite(slug);
  const kinds = new Set(doc.blocks.map((b) => b.kind));
  const extra: InviteBlock[] = demo.blocks.filter((b) => !kinds.has(b.kind));
  const mergedGlobal = {
    ...doc.global,
    fontFamily: normalizeInviteFontFamily(doc.global.fontFamily),
    showBlockTitles: doc.global.showBlockTitles ?? demo.global.showBlockTitles ?? false,
    blocksRevealDelaySec: doc.global.blocksRevealDelaySec ?? demo.global.blocksRevealDelaySec ?? 0,
    blocksRevealMode: normalizeBlocksRevealMode(doc.global.blocksRevealMode ?? demo.global.blocksRevealMode),
    backgroundBrightness: doc.global.backgroundBrightness ?? demo.global.backgroundBrightness ?? 1,
    overlayAnimations: mergeOverlayAnimationsForDoc(doc),
  };
  if (extra.length === 0) return { ...doc, global: mergedGlobal };
  return { ...doc, global: mergedGlobal, blocks: [...doc.blocks, ...extra] };
}
