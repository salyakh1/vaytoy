"use client";

import type { SlideItem } from "@/lib/inviteTypes";
import { StoryItemImage } from "@/components/StoryItemImage";

type Props = {
  items: SlideItem[];
  orientation: "horizontal" | "vertical";
  variant?: "public" | "preview";
};

export function SlidesBlockView({ items, orientation, variant = "public" }: Props) {
  const isH = orientation === "horizontal";
  if (!items.length) {
    return <div className="text-sm text-white/45">Добавьте слайды в редакторе</div>;
  }

  return (
    <div
      className={
        isH
          ? "-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20"
          : "flex max-h-[min(420px,56vh)] snap-y snap-mandatory flex-col gap-4 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]"
      }
    >
      {items.map((it, idx) => (
        <div
          key={idx}
          className={
            isH
              ? "w-[min(92%,320px)] shrink-0 snap-center sm:w-[88%]"
              : "w-full shrink-0 snap-start"
          }
        >
          {it.imageUrl ? (
            <StoryItemImage
              imageUrl={it.imageUrl}
              shape={it.shape}
              widthPct={100}
              variant={variant}
            />
          ) : (
            <div className="flex min-h-[140px] w-full items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.03] text-center text-xs text-white/40">
              Фото {idx + 1}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
