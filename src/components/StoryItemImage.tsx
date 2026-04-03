"use client";

import { useMemo, type CSSProperties } from "react";
import type { StoryImageShape } from "@/lib/inviteTypes";

const HEART_MASK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="white" d="M50 88 C15 55 5 40 5 28 C5 16 14 8 26 8 C36 8 44 16 50 24 C56 16 64 8 74 8 C86 8 95 16 95 28 C95 40 85 55 50 88 Z"/></svg>`;

function heartMaskDataUrl() {
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(HEART_MASK_SVG)}")`;
}

type Props = {
  imageUrl: string;
  shape?: StoryImageShape;
  widthPct?: number;
  /** «public» — как на /i/…, «preview» — чуть компактнее в редакторе */
  variant?: "public" | "preview";
  className?: string;
};

export function StoryItemImage({
  imageUrl,
  shape = "square",
  widthPct = 100,
  variant = "public",
  className = "",
}: Props) {
  const w = Math.min(100, Math.max(40, widthPct));
  const heartMask = useMemo(() => heartMaskDataUrl(), []);
  const maxH =
    variant === "preview" ? "max-h-40" : "max-h-[min(320px,70vh)]";

  if (shape === "circle") {
    return (
      <div className={`mx-auto min-w-0 ${className}`} style={{ width: `${w}%` }}>
        <div className="aspect-square w-full overflow-hidden rounded-full border border-white/10">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      </div>
    );
  }

  if (shape === "heart") {
    return (
      <div className={`mx-auto min-w-0 ${className}`} style={{ width: `${w}%` }}>
        <div
          className="aspect-[100/108] w-full"
          style={
            {
              WebkitMaskImage: heartMask,
              maskImage: heartMask,
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
            } satisfies CSSProperties
          }
        >
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      </div>
    );
  }

  return (
    <div className={`mx-auto min-w-0 ${className}`} style={{ width: `${w}%` }}>
      <img
        src={imageUrl}
        alt=""
        className={`w-full rounded-xl object-cover ${maxH}`}
      />
    </div>
  );
}
