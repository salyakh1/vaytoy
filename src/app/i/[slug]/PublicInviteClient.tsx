"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BlockKind, InviteDoc } from "@/lib/inviteTypes";
import { blockCardBorderClass, blockShowsSectionTitle, mergeBlockStyle } from "@/lib/inviteTypes";
import { buildWeddingIcs, formatCountdown } from "@/lib/inviteUtils";
import { publicBlockLabel } from "@/lib/blockLabels";
import { StoryItemImage } from "@/components/StoryItemImage";
import { MapVenueBlock } from "@/components/MapVenueBlock";
import { InviteOverlayLayers } from "@/components/InviteOverlayLayers";

function safeParseDoc(raw: string | null): InviteDoc | null {
  if (!raw) return null;
  try {
    const json = decodeURIComponent(escape(atob(raw)));
    return JSON.parse(json) as InviteDoc;
  } catch {
    return null;
  }
}

const WISHES_AUTO_MS = 7000;

function WishesCarousel({ wishes }: { wishes: { id: string; name: string; text: string }[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const ignoreScrollRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wishesIds = wishes.map((w) => w.id).join(",");

  const restartAuto = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (wishes.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % wishes.length);
    }, WISHES_AUTO_MS);
  }, [wishes.length]);

  useEffect(() => {
    restartAuto();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [restartAuto, wishesIds]);

  useEffect(() => {
    if (active >= wishes.length) setActive(0);
  }, [wishes.length, active]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || wishes.length === 0) return;
    ignoreScrollRef.current = true;
    const w = el.clientWidth;
    el.scrollTo({ left: active * w, behavior: "smooth" });
    const t = window.setTimeout(() => {
      ignoreScrollRef.current = false;
    }, 650);
    return () => window.clearTimeout(t);
  }, [active, wishes.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    let debounce: number | undefined;
    const onScroll = () => {
      if (debounce !== undefined) clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        if (ignoreScrollRef.current) return;
        const w = el.clientWidth;
        if (w < 1) return;
        const page = Math.round(el.scrollLeft / w);
        const next = Math.min(Math.max(0, page), wishes.length - 1);
        setActive((prev) => (next !== prev ? next : prev));
        restartAuto();
      }, 180);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (debounce !== undefined) clearTimeout(debounce);
    };
  }, [wishes.length, restartAuto]);

  if (wishes.length === 0) {
    return <div className="text-sm text-white/45">Пока нет пожеланий</div>;
  }

  return (
    <div className="relative -mx-1">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20"
      >
        {wishes.map((w) => (
          <div
            key={w.id}
            className="w-full min-w-full shrink-0 snap-start px-1"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-sm font-semibold text-white/90">{w.name}</div>
              <div className="mt-2 max-h-40 overflow-y-auto text-sm text-white/75 whitespace-pre-wrap [scrollbar-width:thin]">
                {w.text}
              </div>
            </div>
          </div>
        ))}
      </div>
      {wishes.length > 1 ? (
        <div className="mt-2 flex justify-center gap-1.5">
          {wishes.map((w, i) => (
            <button
              key={w.id}
              type="button"
              aria-label={`Пожелание ${i + 1}`}
              className={[
                "h-1.5 rounded-full transition-all",
                i === active ? "w-5 bg-white/70" : "w-1.5 bg-white/25 hover:bg-white/40",
              ].join(" ")}
              onClick={() => {
                setActive(i);
                restartAuto();
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function fontClass(font: InviteDoc["global"]["fontFamily"]) {
  switch (font) {
    case "serif":
    case "georgia":
    case "playfair":
    case "cormorant":
      return "font-serif";
    case "inter":
      return "font-sans";
    case "ui":
    default:
      return "font-sans";
  }
}

export default function PublicInviteClient({ fallback }: { fallback: InviteDoc }) {
  const [doc, setDoc] = useState<InviteDoc>(fallback);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestToast, setGuestToast] = useState<string | null>(null);
  const [msgText, setMsgText] = useState("");
  const [surveyPick, setSurveyPick] = useState<Record<number, number>>({});
  const [wishes, setWishes] = useState<{ id: string; name: string; text: string }[]>([]);
  const [wishesRefresh, setWishesRefresh] = useState(0);
  const [wishName, setWishName] = useState("");
  const [wishText, setWishText] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const d = url.searchParams.get("d");
    const parsed = safeParseDoc(d);
    if (parsed) setDoc(parsed);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/public/wishes?slug=${encodeURIComponent(doc.slug)}`);
        if (!r.ok) return;
        const j = (await r.json()) as { wishes?: { id: string; name: string; text: string }[] };
        if (!cancelled) setWishes(j.wishes ?? []);
      } catch {
        if (!cancelled) setWishes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc.slug, wishesRefresh]);

  const globalFontClass = fontClass(doc.global.fontFamily);

  const inviteFrameStyle: React.CSSProperties = useMemo(
    () => ({
      color: doc.global.textColor,
      fontSize: `${doc.global.fontSizePx}px`,
    }),
    [doc.global.fontSizePx, doc.global.textColor],
  );

  const inviteBgStyle: React.CSSProperties = useMemo(() => {
    if (doc.global.backgroundImage) {
      return {
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,${doc.global.overlayOpacity}), rgba(0,0,0,${
          doc.global.overlayOpacity + 0.2
        })), url(${doc.global.backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return {
      background:
        "radial-gradient(520px 420px at 50% 0%, rgba(168,85,247,0.14), transparent 60%), radial-gradient(520px 420px at 50% 0%, rgba(255,106,61,0.10), transparent 62%), rgba(255,255,255,0.03)",
    };
  }, [doc.global.backgroundImage, doc.global.overlayOpacity]);

  async function toggleMusic() {
    if (!doc.audioUrl) return;
    if (!audioRef.current) audioRef.current = new Audio(doc.audioUrl);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.85;

    try {
      if (!playing) {
        await audioRef.current.play();
        setPlaying(true);
      } else {
        audioRef.current.pause();
        setPlaying(false);
      }
    } catch {
      setPlaying(false);
    }
  }

  function mapsLink(address: string) {
    const q = encodeURIComponent(address);
    return `https://maps.google.com/?q=${q}`;
  }

  function sectionId(kind: string) {
    return `sec-${kind}`;
  }

  async function submitGuest(type: "rsvp" | "message" | "survey" | "wish", payload: unknown) {
    setGuestBusy(true);
    setGuestToast(null);
    try {
      const res = await fetch("/api/public/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: doc.slug, type, payload }),
      });
      if (!res.ok) {
        setGuestToast("Не удалось отправить");
        return;
      }
      setGuestToast("Спасибо!");
      if (type === "wish") {
        setWishName("");
        setWishText("");
        setWishesRefresh((x) => x + 1);
      }
      setTimeout(() => setGuestToast(null), 4000);
    } catch {
      setGuestToast("Ошибка сети");
    } finally {
      setGuestBusy(false);
    }
  }

  function downloadIcs() {
    const ics = buildWeddingIcs(doc);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.slug}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="relative min-h-dvh w-full px-3 py-6">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_50%_-10%,rgba(255,255,255,0.16),transparent_58%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.20),rgba(0,0,0,0.78))]" />
      </div>

      {guestToast ? (
        <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-2xl border border-white/15 bg-black/80 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur">
          {guestToast}
        </div>
      ) : null}

      {doc.audioUrl ? (
        <button
          onClick={toggleMusic}
          type="button"
          className={[
            "fixed right-3 top-3 z-20 h-11 rounded-2xl border border-white/10 px-4 text-xs font-semibold shadow-[0_35px_90px_rgba(0,0,0,0.55)] backdrop-blur",
            playing ? "bg-[rgba(168,85,247,0.18)] text-white" : "bg-white/[0.06] text-white/85 hover:border-white/20",
          ].join(" ")}
        >
          {playing ? "Музыка: вкл" : "Музыка: выкл"}
        </button>
      ) : null}

      <div className="mx-auto w-full max-w-[420px]">
        <div
          className={["relative overflow-hidden rounded-[28px] border border-white/10", globalFontClass].join(" ")}
          style={inviteFrameStyle}
        >
          <div className="absolute inset-0 z-0" style={inviteBgStyle} />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(520px_420px_at_50%_0%,rgba(255,255,255,0.10),transparent_60%)]" />
          <InviteOverlayLayers animations={doc.global.overlayAnimations ?? []} seed={doc.slug} />

          <div className="relative z-10 min-w-0 space-y-3 p-3">
            {doc.blocks
              .filter((b) => b.enabled)
              .map((b, blockIdx) => {
                const st = mergeBlockStyle(doc.global.blockDefaults, b.style);
                const cardStyle: React.CSSProperties = {
                  borderRadius: `${st.radiusPx}px`,
                  backgroundColor: `rgba(255,255,255,${st.bgOpacity})`,
                  backdropFilter: `blur(${st.blurPx}px)`,
                  minWidth: 0,
                  maxWidth: "100%",
                };
                const secTitle = blockShowsSectionTitle(b, doc.global.showBlockTitles === true);
                const sectionClass = ["min-w-0 max-w-full", blockCardBorderClass(b), "p-5"].join(" ");

                if (b.kind === "nav") {
                  const enabled = doc.blocks.filter((x) => x.enabled).map((x) => x.kind);
                  return (
                    <section key={`${b.kind}-${blockIdx}`} className={sectionClass} style={cardStyle} id={sectionId(b.kind)}>
                      {secTitle ? <div className="text-sm font-semibold text-white/85">Меню</div> : null}
                      <div className={secTitle ? "mt-3 flex flex-wrap gap-2" : "flex flex-wrap gap-2"}>
                        {enabled
                          .filter((k) => k !== "nav")
                          .map((k) => (
                            <a
                              key={k}
                              href={`#${sectionId(k)}`}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/85 hover:border-white/20"
                            >
                              {publicBlockLabel(k as BlockKind)}
                            </a>
                          ))}
                      </div>
                    </section>
                  );
                }

                if (b.kind === "calendar") {
                  return (
                    <section key={`${b.kind}-${blockIdx}`} className={sectionClass} style={cardStyle} id={sectionId(b.kind)}>
                      <button
                        type="button"
                        onClick={downloadIcs}
                        className="h-11 w-full rounded-2xl bg-white text-center text-sm font-semibold leading-[44px] text-black hover:bg-white/90"
                      >
                        Добавить в календарь
                      </button>
                    </section>
                  );
                }

                if (b.kind === "countdown") {
                  const target = b.targetIso ? new Date(b.targetIso).getTime() : null;
                  const msLeft = target ? target - now : 0;
                  const t = formatCountdown(msLeft);
                  return (
                    <section key={`${b.kind}-${blockIdx}`} className={sectionClass} style={cardStyle} id={sectionId(b.kind)}>
                      {secTitle ? <div className="text-sm font-semibold text-white/85">Обратный отсчет</div> : null}
                      <div className={secTitle ? "mt-3 grid grid-cols-4 gap-2" : "grid grid-cols-4 gap-2"}>
                        {[
                          { v: t.days, l: "дн" },
                          { v: t.hours, l: "ч" },
                          { v: t.mins, l: "мин" },
                          { v: t.secs, l: "с" },
                        ].map((x) => (
                          <div key={x.l} className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-center">
                            <div className="text-sm font-semibold text-white/90">{x.v}</div>
                            <div className="text-[10px] font-semibold text-white/45">{x.l}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (b.kind === "palette") {
                  return (
                    <section key={`${b.kind}-${blockIdx}`} className={sectionClass} style={cardStyle} id={sectionId(b.kind)}>
                      {secTitle ? <div className="text-sm font-semibold text-white/85">Палитра</div> : null}
                      <div className={secTitle ? "mt-3 flex flex-wrap items-center gap-2" : "flex flex-wrap items-center gap-2"}>
                        {b.colors.map((c, idx) => (
                          <div key={idx} className="h-7 w-7 rounded-full border border-white/15" style={{ background: c }} />
                        ))}
                      </div>
                    </section>
                  );
                }

                if (b.kind === "names") {
                  return (
                    <section key={`${b.kind}-${blockIdx}`} className={sectionClass} style={cardStyle} id={sectionId(b.kind)}>
                      <div className="text-center text-[22px] font-semibold leading-tight">
                        {b.bride} & {b.groom}
                      </div>
                      <div className="mt-2 text-center text-sm text-white/70">{b.date}</div>
                    </section>
                  );
                }

                if (b.kind === "rsvp") {
                  return (
                    <section key={`${b.kind}-${blockIdx}`} className={sectionClass} style={cardStyle} id={sectionId(b.kind)}>
                      {secTitle ? <div className="text-sm font-semibold text-white/85">Подтверждение</div> : null}
                      {"question" in b && b.question ? (
                        <div className={secTitle ? "mt-2 text-sm text-white/70" : "mt-0 text-sm text-white/70"}>{b.question}</div>
                      ) : null}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          className="h-11 rounded-2xl bg-white text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
                          type="button"
                          disabled={guestBusy}
                          onClick={() => void submitGuest("rsvp", { answer: "yes", question: b.question ?? null })}
                        >
                          Да
                        </button>
                        <button
                          className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/85 hover:border-white/20 disabled:opacity-50"
                          type="button"
                          disabled={guestBusy}
                          onClick={() => void submitGuest("rsvp", { answer: "no", question: b.question ?? null })}
                        >
                          Нет
                        </button>
                      </div>
                    </section>
                  );
                }

                if (b.kind === "message") {
                  return (
                    <section key={`${b.kind}-${blockIdx}`} className={sectionClass} style={cardStyle} id={sectionId(b.kind)}>
                      {secTitle ? <div className="text-sm font-semibold text-white/85">Сообщение</div> : null}
                      {"prompt" in b && b.prompt ? (
                        <div className={secTitle ? "mt-2 text-sm text-white/70" : "text-sm text-white/70"}>{b.prompt}</div>
                      ) : null}
                      <textarea
                        className="mt-3 h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-white/20"
                        placeholder="..."
                        value={msgText}
                        onChange={(e) => setMsgText(e.target.value)}
                      />
                      <button
                        className="mt-3 h-11 w-full rounded-2xl bg-white text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
                        type="button"
                        disabled={guestBusy || !msgText.trim()}
                        onClick={() => void submitGuest("message", { text: msgText.trim(), prompt: b.prompt ?? null })}
                      >
                        Отправить
                      </button>
                    </section>
                  );
                }

                if (b.kind === "gifts") {
                  return (
                    <section key={`${b.kind}-${blockIdx}`} className={sectionClass} style={cardStyle} id={sectionId(b.kind)}>
                      {secTitle ? (
                        <div className="text-sm font-semibold text-white/85">{b.title ?? "Деньги в подарок"}</div>
                      ) : null}
                      <div className={secTitle ? "mt-2 text-sm text-white/70" : "text-sm text-white/70"}>Реквизиты добавим позже</div>
                    </section>
                  );
                }

                if (b.kind === "survey") {
                  return (
                    <section key={`${b.kind}-${blockIdx}`} className={sectionClass} style={cardStyle} id={sectionId(b.kind)}>
                      {secTitle ? <div className="text-sm font-semibold text-white/85">Опрос гостей</div> : null}
                      <div className={secTitle ? "mt-3 space-y-3" : "space-y-3"}>
                        {b.questions.map((q, qi) => (
                          <div key={qi} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-sm font-semibold text-white/85">{q.title}</div>
                            <div className="mt-2 grid gap-2">
                              {q.options.map((o, oi) => (
                                <label key={oi} className="flex cursor-pointer items-center gap-2 text-sm text-white/75">
                                  <input
                                    type="radio"
                                    name={`survey-${b.kind}-${qi}`}
                                    checked={surveyPick[qi] === oi}
                                    onChange={() => setSurveyPick((p) => ({ ...p, [qi]: oi }))}
                                  />
                                  <span>{o.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                        <button
                          className="h-11 w-full rounded-2xl bg-white text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
                          type="button"
                          disabled={guestBusy || b.questions.some((_, qi) => surveyPick[qi] === undefined)}
                          onClick={() =>
                            void submitGuest("survey", {
                              answers: b.questions.map((q, qi) => ({
                                title: q.title,
                                choice: q.options[surveyPick[qi]!]?.label ?? null,
                              })),
                            })
                          }
                        >
                          Отправить
                        </button>
                      </div>
                    </section>
                  );
                }

                if (b.kind === "schedule") {
                  return (
                    <section key={`${b.kind}-${blockIdx}`} className={sectionClass} style={cardStyle} id={sectionId(b.kind)}>
                      {secTitle ? <div className="text-sm font-semibold text-white/85">Расписание</div> : null}
                      <div className={secTitle ? "mt-3 space-y-2" : "space-y-2"}>
                        {b.items.map((it, idx) => (
                          <div key={idx} className="grid grid-cols-[84px_1fr] gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-sm font-semibold text-white/75">{it.time}</div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white/85">{it.title}</div>
                              {it.text ? <div className="mt-1 text-sm text-white/65">{it.text}</div> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (b.kind === "video") {
                  const wrapRadius = b.shape === "circle" ? "9999px" : `${Math.max(18, st.radiusPx)}px`;
                  return (
                    <section key={`${b.kind}-${blockIdx}`} className={sectionClass} style={cardStyle} id={sectionId(b.kind)}>
                      {secTitle ? <div className="text-sm font-semibold text-white/85">Видео</div> : null}
                      <div
                        className={
                          secTitle
                            ? "mt-3 overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] shadow-[0_35px_90px_rgba(0,0,0,0.55)]"
                            : "overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] shadow-[0_35px_90px_rgba(0,0,0,0.55)]"
                        }
                        style={{
                          width: `${Math.min(100, Math.max(50, b.sizePct))}%`,
                          marginLeft: "auto",
                          marginRight: "auto",
                          borderRadius: wrapRadius,
                          aspectRatio: "1 / 1",
                        }}
                      >
                        {b.videoUrl ? (
                          <video src={b.videoUrl} muted playsInline loop autoPlay className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                    </section>
                  );
                }

                if (b.kind === "story") {
                  return (
                    <section
                      key={`${b.kind}-${blockIdx}`}
                      className={sectionClass}
                      style={cardStyle}
                      id={sectionId(b.kind)}
                    >
                      {secTitle ? <div className="text-sm font-semibold text-white/85">История</div> : null}
                      <div className={secTitle ? "mt-3 min-w-0 space-y-3" : "min-w-0 space-y-3"}>
                        {b.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                          >
                            {it.imageUrl ? (
                              <div className="mb-2 min-w-0">
                                <StoryItemImage
                                  imageUrl={it.imageUrl}
                                  shape={it.imageShape ?? "square"}
                                  widthPct={it.imageWidthPct ?? 100}
                                  variant="public"
                                />
                              </div>
                            ) : null}
                            {it.title ? (
                              <div className="break-words text-sm font-semibold text-white/85">{it.title}</div>
                            ) : null}
                            {it.text ? (
                              <div className="mt-1 break-words text-sm text-white/70">{it.text}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }

                if (b.kind === "map") {
                  const hasVenueHeader =
                    b.eventTime ||
                    b.eventDate ||
                    b.venueTitle ||
                    b.venueSubtitle ||
                    b.venueDescription;
                  return (
                    <section
                      key={`${b.kind}-${blockIdx}`}
                      className={sectionClass}
                      style={cardStyle}
                      id={sectionId(b.kind)}
                    >
                      {secTitle && !hasVenueHeader ? (
                        <div className="mb-3 text-sm font-semibold text-white/85">Карта</div>
                      ) : null}
                      <MapVenueBlock block={b} mapsLink={mapsLink} variant="public" />
                    </section>
                  );
                }

                if (b.kind === "wishes") {
                  return (
                    <section key={`${b.kind}-${blockIdx}`} className={sectionClass} style={cardStyle} id={sectionId(b.kind)}>
                      {secTitle ? (
                        <div className="text-sm font-semibold text-white/85">{b.title ?? "Пожелания"}</div>
                      ) : null}
                      <div className={secTitle ? "mt-3" : ""}>
                        <WishesCarousel wishes={wishes} />
                      </div>
                    </section>
                  );
                }

                if (b.kind === "wishesForm") {
                  return (
                    <section key={`${b.kind}-${blockIdx}`} className={sectionClass} style={cardStyle} id={sectionId(b.kind)}>
                      {secTitle ? (
                        <div className="text-sm font-semibold text-white/85">{b.title ?? "Оставьте пожелание"}</div>
                      ) : null}
                      <input
                        className="mt-3 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-white/20"
                        placeholder={b.namePlaceholder ?? "Ваше имя"}
                        value={wishName}
                        onChange={(e) => setWishName(e.target.value)}
                        autoComplete="name"
                      />
                      <textarea
                        className="mt-2 h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/85 outline-none placeholder:text-white/35 focus:border-white/20"
                        placeholder={b.textPlaceholder ?? "Ваше пожелание"}
                        value={wishText}
                        onChange={(e) => setWishText(e.target.value)}
                      />
                      <button
                        className="mt-3 h-11 w-full rounded-2xl bg-white text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
                        type="button"
                        disabled={guestBusy || !wishName.trim() || !wishText.trim()}
                        onClick={() => void submitGuest("wish", { name: wishName.trim(), text: wishText.trim() })}
                      >
                        Отправить
                      </button>
                    </section>
                  );
                }

                return null;
              })}

            <div className="h-4" />
          </div>
        </div>
      </div>
    </main>
  );
}

