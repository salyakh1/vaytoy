import { useEffect, useState } from "react";
import type { InviteDoc } from "./inviteTypes";

const MAX_SEC = 120;

export function effectiveBlocksRevealDelaySec(global: InviteDoc["global"]): number {
  const d = global.blocksRevealDelaySec;
  if (d === undefined || d === null || Number.isNaN(Number(d))) return 0;
  return Math.min(MAX_SEC, Math.max(0, Math.round(Number(d))));
}

/**
 * @param respectDelay — в редакторе можно передать false, чтобы блоки были видны сразу при вёрстке.
 */
export function useBlocksRevealed(doc: InviteDoc, respectDelay = true): boolean {
  const delaySec = respectDelay ? effectiveBlocksRevealDelaySec(doc.global) : 0;
  const [revealed, setRevealed] = useState(() => delaySec <= 0);

  useEffect(() => {
    const d = respectDelay ? effectiveBlocksRevealDelaySec(doc.global) : 0;
    if (d <= 0) {
      setRevealed(true);
      return;
    }
    setRevealed(false);
    const t = window.setTimeout(() => setRevealed(true), d * 1000);
    return () => window.clearTimeout(t);
  }, [doc.slug, doc.global.blocksRevealDelaySec, respectDelay]);

  return revealed;
}
