"use client";

import type { MapBlock } from "@/lib/inviteTypes";
import { googleMapsEmbedUrl, mapsWebFallbackUrl, openMapsPreferred } from "@/lib/mapEmbed";

type Props = {
  block: MapBlock;
  /** Тёмная тема приглашения — светлый текст в шапке блока */
  variant: "public" | "preview";
};

const DEFAULT_BORDER = "#2ec4b6";

export function MapVenueBlock({ block, variant }: Props) {
  const {
    address,
    eventTime,
    eventDate,
    venueTitle,
    venueSubtitle,
    venueDescription,
    mapBorderColor,
  } = block;

  const border = mapBorderColor?.trim() || DEFAULT_BORDER;
  const hasHeader = Boolean(
    eventTime || eventDate || venueTitle || venueSubtitle || venueDescription,
  );

  const titleClass =
    variant === "public"
      ? "font-serif text-xl font-semibold leading-tight text-white/95 sm:text-[22px]"
      : "font-serif text-base font-semibold leading-tight text-white/90";

  const subClass =
    variant === "public"
      ? "mt-1 font-serif text-sm text-[#c9a962]"
      : "mt-0.5 font-serif text-xs text-[#c9a962]";

  const descClass =
    variant === "public"
      ? "mt-3 font-serif text-sm italic leading-relaxed text-white/75"
      : "mt-2 font-serif text-[11px] italic leading-snug text-white/65";

  const timeClass =
    variant === "public"
      ? "font-serif text-lg font-medium text-white/90"
      : "font-serif text-sm font-medium text-white/85";

  const dateClass =
    variant === "public"
      ? "mt-1 font-serif text-sm text-white/65"
      : "mt-0.5 font-serif text-[11px] text-white/55";

  return (
    <div className="min-w-0">
      {hasHeader ? (
        <div
          className={
            variant === "public"
              ? "mb-4 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,88px)_1fr] sm:gap-6"
              : "mb-3 grid grid-cols-[minmax(0,56px)_1fr] gap-2"
          }
        >
          <div className="min-w-0 text-left">
            {eventTime ? <div className={timeClass}>{eventTime}</div> : null}
            {eventDate ? <div className={dateClass}>{eventDate}</div> : null}
          </div>
          <div className="min-w-0 text-left">
            {venueTitle ? <div className={titleClass}>{venueTitle}</div> : null}
            {venueSubtitle ? <div className={subClass}>{venueSubtitle}</div> : null}
            {venueDescription ? (
              <p className={descClass}>{venueDescription}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {!hasHeader && address ? (
        <p
          className={
            variant === "public"
              ? "mb-3 text-sm text-white/75"
              : "mb-2 text-[11px] text-white/55"
          }
        >
          {address}
        </p>
      ) : null}

      {address.trim() ? (
        <div
          className="relative overflow-hidden rounded-sm"
          style={{
            borderWidth: 2,
            borderStyle: "solid",
            borderColor: border,
            boxShadow: `0 0 0 1px ${border}33`,
          }}
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          <iframe
            title="Карта"
            src={googleMapsEmbedUrl(address)}
            className={
              variant === "public"
                ? "block h-[min(52vh,320px)] w-full bg-black/20 max-md:pointer-events-none sm:h-[280px] md:pointer-events-auto"
                : "block h-[200px] w-full bg-black/20 max-md:pointer-events-none sm:h-[220px] md:pointer-events-auto"
            }
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            onClick={(e) => e.stopPropagation()}
          />
          {/* На телефоне тап по превью открывает карты по умолчанию (Apple / geo:), без принудительного Google Maps */}
          <button
            type="button"
            className="absolute inset-0 z-10 cursor-pointer border-0 bg-transparent p-0 md:hidden"
            aria-label="Открыть в картах"
            onClick={(e) => {
              e.stopPropagation();
              openMapsPreferred(address);
            }}
          />
        </div>
      ) : (
        <div
          className="flex h-40 items-center justify-center rounded-sm border-2 border-dashed border-white/20 bg-white/[0.03] text-sm text-white/45"
          style={{ borderColor: `${border}66` }}
        >
          Укажите адрес
        </div>
      )}

      {address.trim() ? (
        <a
          className={
            variant === "public"
              ? "mt-3 flex h-11 w-full items-center justify-center rounded-2xl bg-white text-center text-sm font-semibold text-black hover:bg-white/90"
              : "mt-2 flex h-9 w-full items-center justify-center rounded-xl bg-white text-[11px] font-semibold text-black"
          }
          href={mapsWebFallbackUrl(address)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            if (typeof navigator === "undefined") return;
            const ua = navigator.userAgent || "";
            if (/iPhone|iPad|iPod|Android/i.test(ua)) {
              e.preventDefault();
              openMapsPreferred(address);
            }
          }}
        >
          Открыть в картах
        </a>
      ) : null}
    </div>
  );
}
