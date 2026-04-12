import type { InviteBlock, InviteDoc } from "./inviteTypes";
import { createDemoInvite } from "./demoInvite";
import { normalizeBlocksRevealDurationSec, normalizeBlocksRevealMode } from "./blocksRevealAnimation";
import { normalizeInviteFontFamily } from "./inviteFontFamilies";
import {
  normalizeBackgroundVideoBehavior,
  normalizeBackgroundVideoLoopFromSec,
  normalizeBackgroundVideoPauseAtSec,
} from "./inviteBackgroundStyle";
import { mergeOverlayAnimationsForDoc } from "./overlayAnimMerge";

/** Добавляет в документ новые типы блоков из шаблона, если их ещё нет (старые сохранённые приглашения). */
export function mergeInviteWithDefaults(slug: string, doc: InviteDoc): InviteDoc {
  const demo = createDemoInvite(slug);
  const kinds = new Set(doc.blocks.map((b) => b.kind));
  const extra: InviteBlock[] = demo.blocks.filter((b) => !kinds.has(b.kind));
  const loopFromNorm = normalizeBackgroundVideoLoopFromSec(
    doc.global.backgroundVideoLoopFromSec ?? demo.global.backgroundVideoLoopFromSec,
  );
  let backgroundVideoBehavior = normalizeBackgroundVideoBehavior(
    doc.global.backgroundVideoBehavior ?? demo.global.backgroundVideoBehavior,
  );
  if (backgroundVideoBehavior === "introThenLoopTail" && loopFromNorm === undefined) {
    backgroundVideoBehavior = "freezeAtPauses";
  }

  const mergedGlobal = {
    ...doc.global,
    fontFamily: normalizeInviteFontFamily(doc.global.fontFamily),
    showBlockTitles: doc.global.showBlockTitles ?? demo.global.showBlockTitles ?? false,
    blocksRevealDelaySec: doc.global.blocksRevealDelaySec ?? demo.global.blocksRevealDelaySec ?? 0,
    blocksRevealMode: normalizeBlocksRevealMode(doc.global.blocksRevealMode ?? demo.global.blocksRevealMode),
    blocksRevealDurationSec: normalizeBlocksRevealDurationSec(
      doc.global.blocksRevealDurationSec ?? demo.global.blocksRevealDurationSec,
    ),
    backgroundBrightness: doc.global.backgroundBrightness ?? demo.global.backgroundBrightness ?? 1,
    backgroundVideoMuted: doc.global.backgroundVideoMuted ?? true,
    backgroundVideoBehavior,
    backgroundVideoLoopFromSec: loopFromNorm,
    backgroundVideoPauseAtSec: normalizeBackgroundVideoPauseAtSec(doc.global.backgroundVideoPauseAtSec),
    overlayAnimations: mergeOverlayAnimationsForDoc(doc),
  };
  if (extra.length === 0) return { ...doc, global: mergedGlobal };
  return { ...doc, global: mergedGlobal, blocks: [...doc.blocks, ...extra] };
}
