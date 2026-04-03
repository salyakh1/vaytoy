"use client";

import type { OverlayAnimation } from "@/lib/inviteTypes";
import { FallingLettersLayer } from "@/components/FallingLettersLayer";
import { FloatingHeartsLayer } from "@/components/FloatingHeartsLayer";
import { DEFAULT_HEARTS_COLOR } from "@/lib/demoInvite";
import { DEFAULT_LETTERS_COLOR } from "@/lib/overlayAnimMerge";

export function InviteOverlayLayers({
  animations,
  seed,
}: {
  animations: OverlayAnimation[];
  seed: string;
}) {
  const active = animations.filter((a) => a.enabled !== false);
  if (active.length === 0) return null;

  return (
    <div className="invite-overlay-animations pointer-events-none absolute inset-0 z-[2]">
      {active.map((a) => (
        <div key={a.id} className="absolute inset-0 overflow-hidden">
          {a.kind === "hearts" ? (
            <FloatingHeartsLayer seed={`${seed}-${a.id}`} color={a.color ?? DEFAULT_HEARTS_COLOR} />
          ) : (
            <FallingLettersLayer
              seed={`${seed}-${a.id}`}
              text={a.text}
              color={a.color ?? DEFAULT_LETTERS_COLOR}
            />
          )}
        </div>
      ))}
    </div>
  );
}
