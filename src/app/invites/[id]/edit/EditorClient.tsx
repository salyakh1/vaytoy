"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  BlockKind,
  InviteBlock,
  InviteDoc,
  OverlayAnimation,
  SlideItem,
  StoryItem,
} from "@/lib/inviteTypes";
import { SlidesBlockView } from "@/components/SlidesBlockView";
import { StoryItemImage } from "@/components/StoryItemImage";
import { InviteOverlayLayers } from "@/components/InviteOverlayLayers";
import { DEFAULT_HEARTS_COLOR } from "@/lib/demoInvite";
import {
  createHeartsAnimation,
  createLettersAnimation,
  DEFAULT_LETTERS_COLOR,
  effectiveOverlayAnimations,
  hexOrFallbackForPicker,
} from "@/lib/overlayAnimMerge";
import { MapVenueBlock } from "@/components/MapVenueBlock";
import { INVITE_FONT_OPTIONS, inviteFontClass } from "@/lib/inviteFontFamilies";
import { blockCardBorderClass, blockShowsSectionTitle, mergeBlockStyle } from "@/lib/inviteTypes";
import { buildWeddingIcs, defaultInviteListTitle, formatCountdown } from "@/lib/inviteUtils";
import { UPLOAD_PROXY_MAX_BYTES } from "@/lib/uploadRules";
import {
  inviteBackgroundFallbackStyle,
  inviteBackgroundImageLayerStyle,
  inviteBackgroundScrimStyle,
} from "@/lib/inviteBackgroundStyle";
import {
  editPathForInviteSlug,
  effectiveSlugForStorage,
  inviteSlugValidationMessage,
  normalizeInviteSlug,
  slugHintFromTitle,
} from "@/lib/inviteSlug";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Часто TypeError / NetworkError при блокировке fetch (CORS к S3, обрыв сети). */
function isLikelyFetchBlocked(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  if (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "NetworkError") return true;
  if (e instanceof Error && /failed to fetch|load failed|networkerror/i.test(e.message)) return true;
  return false;
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function blockTitle(kind: BlockKind) {
  switch (kind) {
    case "nav":
      return "Меню навигации";
    case "calendar":
      return "В календарь";
    case "countdown":
      return "Обратный отсчет";
    case "palette":
      return "Палитра";
    case "names":
      return "Имена молодоженов";
    case "rsvp":
      return "Подтверждение";
    case "message":
      return "Сообщение";
    case "text":
      return "Текст приглашения";
    case "gifts":
      return "Деньги в подарок";
    case "survey":
      return "Опрос гостей";
    case "schedule":
      return "Расписание";
    case "video":
      return "Видео";
    case "story":
      return "История";
    case "slides":
      return "Слайдер";
    case "map":
      return "Карта";
    case "wishes":
      return "Пожелания";
    case "wishesForm":
      return "Отправка пожелания";
  }
}

function Toggle({ value }: { value: boolean }) {
  return (
    <span className="inline-flex h-5 w-9 items-center rounded-full bg-white/15 p-[2px]">
      <span
        className={[
          "h-4 w-4 rounded-full bg-white shadow-[0_8px_18px_rgba(0,0,0,0.35)] transition-transform",
          value ? "translate-x-4" : "translate-x-0",
        ].join(" ")}
      />
    </span>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-2 w-full cursor-pointer accent-[var(--accent2)]"
    />
  );
}

export default function EditorClient({
  initial,
  initialPublished,
  initialTitle = "",
}: {
  initial: InviteDoc;
  initialPublished: boolean;
  /** Название в списке приглашений (поле в БД), не путать с техническим slug в URL */
  initialTitle?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [doc, setDoc] = useState<InviteDoc>(initial);
  /** Slug строки в БД и сегмент API; после смены адреса обновляется с ответа сервера */
  const [apiSlug, setApiSlug] = useState(initial.slug);
  const [inviteTitle, setInviteTitle] = useState(initialTitle);
  const [published, setPublished] = useState(initialPublished);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BlockKind>("names");
  const [now, setNow] = useState(() => Date.now());
  const selectedBlock = useMemo(
    () => doc.blocks.find((b) => b.kind === selected) ?? doc.blocks[0],
    [doc.blocks, selected],
  );

  const titlePlaceholder = useMemo(() => defaultInviteListTitle(doc), [doc]);

  /** Текст ссылки для гостей в интерфейсе — только имя, без /i/... */
  const guestLinkLabel = useMemo(() => inviteTitle.trim() || titlePlaceholder, [inviteTitle, titlePlaceholder]);

  const [guestUrlCopied, setGuestUrlCopied] = useState(false);

  async function copyGuestUrl() {
    try {
      const seg = effectiveSlugForStorage(doc.slug, apiSlug);
      const u = `${window.location.origin}/i/${encodeURIComponent(seg)}`;
      await navigator.clipboard.writeText(u);
      setGuestUrlCopied(true);
      window.setTimeout(() => setGuestUrlCopied(false), 2000);
    } catch {
      setGuestUrlCopied(false);
    }
  }

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  function updateBlock<K extends BlockKind>(kind: K, patch: Partial<Extract<InviteBlock, { kind: K }>>) {
    setDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.kind === kind ? ({ ...b, ...patch } as InviteBlock) : b)),
    }));
  }

  function updateBlockStyle(kind: BlockKind, stylePatch: Partial<NonNullable<InviteBlock["style"]>>) {
    setDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.kind === kind ? ({ ...b, style: { ...(b.style ?? {}), ...stylePatch } } as InviteBlock) : b,
      ),
    }));
  }

  /**
   * Включённые блоки идут на странице в порядке включения (первый включили — выше).
   * При выключении блок уезжает в конец списка модулей.
   */
  function toggleBlockEnabled(kind: BlockKind) {
    setDoc((prev) => {
      const idx = prev.blocks.findIndex((b) => b.kind === kind);
      if (idx < 0) return prev;
      const cur = prev.blocks[idx];
      const nextEnabled = !cur.enabled;

      if (!nextEnabled) {
        const blocks = [...prev.blocks];
        const [item] = blocks.splice(idx, 1);
        blocks.push({ ...item, enabled: false } as InviteBlock);
        return { ...prev, blocks };
      }

      const blocks = [...prev.blocks];
      const [item] = blocks.splice(idx, 1);
      const updated = { ...item, enabled: true } as InviteBlock;
      let lastEnabled = -1;
      for (let j = 0; j < blocks.length; j++) {
        if (blocks[j].enabled) lastEnabled = j;
      }
      blocks.splice(lastEnabled + 1, 0, updated);
      return { ...prev, blocks };
    });
  }

  const openLink = useMemo(() => {
    const seg = effectiveSlugForStorage(doc.slug, apiSlug);
    if (published) return `/i/${encodeURIComponent(seg)}`;
    const payload = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(doc)))));
    return `/i/${encodeURIComponent(seg)}?d=${payload}`;
  }, [doc, published, apiSlug]);

  async function persist(nextPublished: boolean) {
    setSaving(true);
    setSaveError(null);
    try {
      const slugNorm = normalizeInviteSlug(doc.slug);
      const slugErr = inviteSlugValidationMessage(slugNorm);
      if (slugErr) {
        setSaveError(slugErr);
        return;
      }
      const docToSend: InviteDoc = { ...doc, slug: slugNorm };

      const res = await fetch(`/api/invites/${encodeURIComponent(apiSlug)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: docToSend, published: nextPublished, title: inviteTitle }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        invitation?: { title?: string; slug?: string };
        error?: string;
      };
      if (!res.ok) {
        setSaveError(j.error ?? "Ошибка сохранения");
        return;
      }
      if (typeof j.invitation?.title === "string") setInviteTitle(j.invitation.title);
      if (typeof j.invitation?.slug === "string") {
        setApiSlug(j.invitation.slug);
        setDoc((p) => ({ ...p, slug: j.invitation!.slug! }));
        const nextPath = editPathForInviteSlug(j.invitation.slug);
        if (pathname !== nextPath) router.replace(nextPath);
      }
      setPublished(nextPublished);
    } catch (e) {
      setSaveError(
        isLikelyFetchBlocked(e)
          ? "Не удалось сохранить: нет ответа от сервера приложения. Проверьте интернет, откройте сайт по HTTPS, при необходимости войдите снова; на Vercel — переменные окружения и логи."
          : e instanceof Error
            ? e.message
            : "Ошибка сохранения",
      );
    } finally {
      setSaving(false);
    }
  }

  const [uploading, setUploading] = useState<string | null>(null);

  function setStoryItems(items: StoryItem[]) {
    updateBlock("story", { items } as any);
  }

  function moveStoryItem(idx: number, dir: -1 | 1) {
    const b = doc.blocks.find((x) => x.kind === "story");
    if (!b || b.kind !== "story") return;
    const j = idx + dir;
    if (j < 0 || j >= b.items.length) return;
    const items = [...b.items];
    [items[idx], items[j]] = [items[j], items[idx]];
    setStoryItems(items);
  }

  function removeStoryItem(idx: number) {
    const b = doc.blocks.find((x) => x.kind === "story");
    if (!b || b.kind !== "story") return;
    setStoryItems(b.items.filter((_, i) => i !== idx));
  }

  function addStoryItem(seed: Partial<StoryItem> & { text?: string }) {
    const b = doc.blocks.find((x) => x.kind === "story");
    if (!b || b.kind !== "story") return;
    const next: StoryItem = {
      title: seed.title,
      text: seed.text ?? "",
      imageUrl: seed.imageUrl,
      imageWidthPct: seed.imageWidthPct ?? 100,
      imageShape: seed.imageShape ?? "square",
    };
    setStoryItems([...b.items, next]);
  }

  function patchStoryItem(idx: number, patch: Partial<StoryItem>) {
    const b = doc.blocks.find((x) => x.kind === "story");
    if (!b || b.kind !== "story") return;
    setStoryItems(b.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function setSlideItems(items: SlideItem[]) {
    updateBlock("slides", { items } as any);
  }

  function patchSlideItem(idx: number, patch: Partial<SlideItem>) {
    const b = doc.blocks.find((x) => x.kind === "slides");
    if (!b || b.kind !== "slides") return;
    setSlideItems(b.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addSlideItem(seed?: Partial<SlideItem>) {
    const b = doc.blocks.find((x) => x.kind === "slides");
    if (!b || b.kind !== "slides") return;
    const next: SlideItem = {
      shape: seed?.shape ?? "square",
      imageUrl: seed?.imageUrl,
      imageWidthPct: seed?.imageWidthPct ?? 100,
    };
    setSlideItems([...b.items, next]);
  }

  function removeSlideItem(idx: number) {
    const b = doc.blocks.find((x) => x.kind === "slides");
    if (!b || b.kind !== "slides") return;
    setSlideItems(b.items.filter((_, i) => i !== idx));
  }

  function moveSlideItem(idx: number, dir: -1 | 1) {
    const b = doc.blocks.find((x) => x.kind === "slides");
    if (!b || b.kind !== "slides") return;
    const j = idx + dir;
    if (j < 0 || j >= b.items.length) return;
    const items = [...b.items];
    [items[idx], items[j]] = [items[j], items[idx]];
    setSlideItems(items);
  }

  async function uploadAsset(prefix: string, file: File, applyUrl: (url: string) => void) {
    setUploading(prefix);
    setSaveError(null);
    const prefixPath = `${effectiveSlugForStorage(doc.slug, apiSlug)}/${prefix}`;

    try {
      /* Файлы до ~4 MB: прокси на сервер → S3 (обходит CORS браузера к Timeweb). Больше — presign + PUT в S3. */
      if (file.size <= UPLOAD_PROXY_MAX_BYTES) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("prefix", prefixPath);
        const res = await fetch("/api/upload", { method: "POST", credentials: "include", body: fd });
        let j: { url?: string; error?: string };
        try {
          j = (await res.json()) as { url?: string; error?: string };
        } catch {
          setSaveError("Сервер вернул некорректный ответ при загрузке.");
          return;
        }
        if (res.ok && j.url) {
          applyUrl(j.url);
          return;
        }
        if (res.status === 413) {
          setSaveError(
            j.error ??
              "Файл слишком большой для загрузки через сервер. Сожмите файл или настройте CORS на бакете S3 для прямой загрузки.",
          );
          return;
        }
        setSaveError(j.error ?? `Ошибка загрузки (${res.status})`);
        return;
      }

      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: prefixPath,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });
      let presignJson: {
        putUrl?: string;
        publicUrl?: string;
        error?: string;
        missingEnv?: string[];
        hint?: string;
      };
      try {
        presignJson = (await presignRes.json()) as typeof presignJson;
      } catch {
        setSaveError("Ответ сервера при запросе загрузки некорректен. Обновите страницу и попробуйте снова.");
        return;
      }
      if (!presignRes.ok) {
        const msg = [presignJson.error ?? "Загрузка не удалась"];
        if (presignJson.missingEnv?.length) {
          msg.push(`Не заданы в окружении сервера: ${presignJson.missingEnv.join(", ")}`);
        }
        if (presignJson.hint) msg.push(presignJson.hint);
        setSaveError(msg.join(" "));
        return;
      }
      if (!presignJson.putUrl || !presignJson.publicUrl) {
        setSaveError("Сервер не вернул ссылку на загрузку");
        return;
      }
      const putRes = await fetch(presignJson.putUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!putRes.ok) {
        setSaveError(`Не удалось отправить файл в хранилище (код ${putRes.status}). Проверьте CORS бакета S3 для этого сайта.`);
        return;
      }
      applyUrl(presignJson.publicUrl);
    } catch (e) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      if (isLikelyFetchBlocked(e)) {
        const overProxy = file.size > UPLOAD_PROXY_MAX_BYTES;
        const videoHint =
          prefix === "video" || (file.type && file.type.startsWith("video/"))
            ? " Видео обычно больше лимита прокси (~4 MB) и грузится напрямую в S3 — без CORS на бакете не взлетит. Либо сожмите ролик до ~4 MB, либо вставьте прямую ссылку на .mp4 в поле URL выше."
            : overProxy
              ? " Файл больше ~4 MB — загрузка только напрямую в S3, нужен CORS на бакете. Либо уменьшите размер файла до ~4 MB."
              : "";
        setSaveError(
          `Файл не дошёл до хранилища S3 (браузер прервал запрос; часто CORS). Timeweb → бакет → CORS: Origin ${origin || "https://vaytoy.vercel.app"}, методы PUT, GET, HEAD, заголовки *.${videoHint}`,
        );
      } else {
        setSaveError(e instanceof Error ? e.message : "Ошибка загрузки файла");
      }
    } finally {
      setUploading(null);
    }
  }

  const globalFontClass = inviteFontClass(doc.global.fontFamily);

  const inviteFrameStyle: React.CSSProperties = {
    color: doc.global.textColor,
    fontSize: `${doc.global.fontSizePx}px`,
  };


  const enabledKinds = useMemo(() => doc.blocks.filter((b) => b.enabled).map((b) => b.kind), [doc.blocks]);

  function sectionId(kind: BlockKind) {
    return `sec-${kind}`;
  }

  function downloadIcs() {
    const ics = buildWeddingIcs(doc);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${effectiveSlugForStorage(doc.slug, apiSlug)}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-dvh w-full">
      <div className="flex min-h-dvh">
        <aside className="w-[60px] shrink-0 border-r border-white/10 bg-black/25 px-2 py-3">
          <div className="flex h-full flex-col items-center justify-between">
            <div className="grid gap-2">
              <a
                className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/80 hover:border-white/20"
                href="/invites"
                title="К списку приглашений"
              >
                <span className="text-xs font-semibold tracking-wide">vt</span>
              </a>

              {[
                { t: "Модули", d: "M4 6h16M4 12h10M4 18h16" },
                { t: "Текст", d: "M6 6h12M10 6v12m-4 0h8" },
                { t: "Фото", d: "M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z M9 11l2.2 2.2L15 9.5 20 14.5" },
                { t: "Музыка", d: "M9 18a2 2 0 1 0 0-4a2 2 0 0 0 0 4Z M13 17V7l7-2v10" },
                { t: "Карта", d: "M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z M12 10.2a1.8 1.8 0 1 0 0-3.6a1.8 1.8 0 0 0 0 3.6Z" },
              ].map((it) => (
                <button
                  key={it.t}
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20 hover:text-white/85"
                  type="button"
                  title={it.t}
                >
                  <Icon d={it.d} />
                </button>
              ))}
            </div>

            <div className="grid gap-2">
              <button
                className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20 hover:text-white/85"
                type="button"
                title="Настройки"
              >
                <Icon d="M12 15.5a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7Z M19.4 15a8 8 0 0 0 .1-2l2-1.4-2-3.4-2.4.7a7.9 7.9 0 0 0-1.7-1l-.3-2.5H11l-.3 2.5a7.9 7.9 0 0 0-1.7 1L6.6 8.2l-2 3.4L6.6 13a8 8 0 0 0 .1 2l-2 1.4 2 3.4 2.4-.7a7.9 7.9 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7.9 7.9 0 0 0 1.7-1l2.4.7 2-3.4-2-1.4Z" />
              </button>
            </div>
          </div>
        </aside>

        <aside className="w-[280px] shrink-0 border-r border-white/10 bg-black/20 p-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-white/75">Модули</div>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-white/40">
              Сначала включите блоки в нужном порядке: как включали — так сверху вниз на приглашении.
            </p>
            <div className="mt-3 grid gap-2">
              {doc.blocks.map((b) => (
                <button
                  key={b.kind}
                  type="button"
                  onClick={() => setSelected(b.kind)}
                  className={[
                    "flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-left",
                    selected === b.kind
                      ? "border-[rgba(168,85,247,0.35)] bg-[rgba(168,85,247,0.10)]"
                      : "border-white/10 bg-white/[0.04] hover:border-white/20",
                  ].join(" ")}
                >
                  <span className="text-xs text-white/85">{blockTitle(b.kind)}</span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <span
                      className="cursor-pointer"
                      onClick={() => toggleBlockEnabled(b.kind)}
                    >
                      <Toggle value={b.enabled} />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/10 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="shrink-0 pt-1.5 text-xs font-medium text-white/65">vaytoy</div>
              <div className="min-w-0 flex-1 grid gap-1">
                <label className="grid gap-0.5">
                  <span className="text-[10px] font-medium text-white/40">Название приглашения</span>
                  <input
                    className="h-9 w-full max-w-sm rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white/90 outline-none placeholder:text-white/30 focus:border-white/25"
                    value={inviteTitle}
                    onChange={(e) => setInviteTitle(e.target.value)}
                    placeholder={titlePlaceholder}
                    autoComplete="off"
                    aria-label="Название приглашения"
                  />
                </label>
                <label className="grid gap-0.5">
                  <span className="text-[10px] font-medium text-white/40">Адрес страницы в ссылке</span>
                  <div className="flex max-w-md flex-wrap items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-0.5 rounded-xl border border-white/10 bg-black/30 px-2 font-mono text-xs text-white/90">
                      <span className="shrink-0 text-white/35">/i/</span>
                      <input
                        className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-white/25 focus:ring-0"
                        value={doc.slug}
                        onChange={(e) => setDoc((p) => ({ ...p, slug: e.target.value }))}
                        onBlur={() => setDoc((p) => ({ ...p, slug: normalizeInviteSlug(p.slug) }))}
                        spellCheck={false}
                        autoComplete="off"
                        placeholder="maga-yakor"
                        aria-label="Сегмент URL приглашения"
                      />
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] font-medium text-white/55 hover:border-white/20 hover:text-white/80"
                      onClick={() =>
                        setDoc((p) => ({
                          ...p,
                          slug: slugHintFromTitle(inviteTitle.trim() || titlePlaceholder),
                        }))
                      }
                    >
                      Из названия
                    </button>
                  </div>
                  <p className="text-[10px] leading-snug text-white/30">
                    Только латиница, цифры и дефис; пробелы и кириллица преобразуются. Сохраните — откроется страница с новым адресом.
                  </p>
                </label>
                <div className="flex min-w-0 flex-wrap items-center gap-2 pt-0.5">
                  <span className="shrink-0 text-[10px] font-medium text-white/40">Ссылка для гостей</span>
                  <a
                    className="min-w-0 truncate text-xs font-semibold text-white/90 underline decoration-white/25 underline-offset-2 hover:text-white hover:decoration-white/45"
                    href={openLink}
                    target="_blank"
                    rel="noreferrer"
                    title={`Публичная страница · полный адрес скопируйте кнопкой справа`}
                  >
                    {guestLinkLabel}
                  </a>
                  <button
                    type="button"
                    className={[
                      "shrink-0 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors",
                      guestUrlCopied
                        ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-100"
                        : "border-white/10 bg-white/[0.06] text-white/70 hover:border-white/20 hover:text-white/90",
                    ].join(" ")}
                    onClick={() => void copyGuestUrl()}
                  >
                    {guestUrlCopied ? "Скопировано" : "Копировать URL"}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {saveError ? (
                <span className="text-xs font-medium text-[rgba(255,106,61,0.95)]">{saveError}</span>
              ) : null}
              {published ? (
                <span className="text-xs font-medium text-emerald-300/90">Опубликовано</span>
              ) : (
                <span className="text-xs text-white/45">Черновик</span>
              )}
              <button
                className="h-9 rounded-2xl bg-[var(--accent)] px-3 text-xs font-semibold text-black hover:opacity-95 active:opacity-90 disabled:opacity-50"
                type="button"
                disabled={saving}
                onClick={() => void persist(published)}
              >
                {saving ? "..." : "Сохранить"}
              </button>
              <button
                className="h-9 rounded-2xl bg-[var(--accent2)] px-3 text-xs font-semibold text-white hover:opacity-95 active:opacity-90 disabled:opacity-50"
                type="button"
                disabled={saving}
                onClick={() => void persist(true)}
              >
                Опубликовать
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <div className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
              <div className="mx-auto flex w-full max-w-[480px] flex-col items-center">
                <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
                  Предпросмотр · iPhone 17 Pro Max
                </p>

                <div className="relative shrink-0 rounded-[3.15rem] bg-gradient-to-b from-[#5a5a5f] via-[#2c2c30] to-[#141416] p-[3px] shadow-[0_50px_100px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/10">
                  <div className="rounded-[3.05rem] bg-[#0a0a0b] p-[9px] ring-1 ring-black/90">
                    <div
                      className={[
                        "invite-editor-device-preview iphone17pm-shell relative flex min-h-0 flex-col overflow-hidden rounded-[2.7rem] bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]",
                        globalFontClass,
                      ].join(" ")}
                      style={inviteFrameStyle}
                    >
                      <div
                        className="pointer-events-none absolute left-1/2 top-[10px] z-30 h-[31px] w-[118px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.11),0_4px_16px_rgba(0,0,0,0.55)]"
                        aria-hidden
                      />
                      {doc.global.backgroundImage?.trim() ? (
                        <>
                          <div className="absolute inset-0 z-0" style={inviteBackgroundImageLayerStyle(doc.global)} />
                          <div
                            className="pointer-events-none absolute inset-0 z-[1]"
                            style={inviteBackgroundScrimStyle(doc.global)}
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 z-0" style={inviteBackgroundFallbackStyle()} />
                      )}
                      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(500px_420px_at_50%_0%,rgba(255,255,255,0.10),transparent_60%)]" />
                      <InviteOverlayLayers animations={effectiveOverlayAnimations(doc)} seed={doc.slug} />

                      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col">
                        <div className="invite-preview-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 pb-2 pt-[46px] [scrollbar-width:thin]">
                          <div className="min-w-0 space-y-3">
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
                        const sectionBase = ["min-w-0 max-w-full", blockCardBorderClass(b), "p-5"].join(" ");

                        if (b.kind === "nav") {
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("nav")}
                              id={sectionId("nav")}
                            >
                              {secTitle ? <div className="text-xs font-semibold text-white/75">Меню</div> : null}
                              <div className={secTitle ? "mt-3 flex flex-wrap gap-2" : "flex flex-wrap gap-2"}>
                                {enabledKinds
                                  .filter((k) => !["nav"].includes(k))
                                  .slice(0, 6)
                                  .map((k) => (
                                    <a
                                      key={k}
                                      href={`#${sectionId(k)}`}
                                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:border-white/20"
                                    >
                                      {blockTitle(k)}
                                    </a>
                                  ))}
                              </div>
                            </section>
                          );
                        }

                        if (b.kind === "calendar") {
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("calendar")}
                              id={sectionId("calendar")}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadIcs();
                                }}
                                className="h-11 w-full rounded-2xl bg-white text-sm font-semibold text-black hover:bg-white/90"
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
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("countdown")}
                              id={sectionId("countdown")}
                            >
                              {secTitle ? (
                                <div className="text-xs font-semibold text-white/75">Обратный отсчет</div>
                              ) : null}
                              <div className={secTitle ? "mt-3 grid grid-cols-4 gap-2" : "grid grid-cols-4 gap-2"}>
                                {[
                                  { v: t.days, l: "дн" },
                                  { v: t.hours, l: "ч" },
                                  { v: t.mins, l: "мин" },
                                  { v: t.secs, l: "с" },
                                ].map((x) => (
                                  <div
                                    key={x.l}
                                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-center"
                                  >
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
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("palette")}
                              id={sectionId("palette")}
                            >
                              {secTitle ? <div className="text-xs font-semibold text-white/75">Палитра</div> : null}
                              <div className={secTitle ? "mt-3 flex items-center gap-2" : "flex items-center gap-2"}>
                                {b.colors.slice(0, 6).map((c, idx) => (
                                  <div
                                    key={idx}
                                    className="h-6 w-6 rounded-full border border-white/15"
                                    style={{ background: c }}
                                  />
                                ))}
                              </div>
                            </section>
                          );
                        }

                        if (b.kind === "names") {
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("names")}
                              id={sectionId("names")}
                            >
                              <div className="text-center text-[20px] font-semibold leading-tight">
                                {b.bride} & {b.groom}
                              </div>
                              <div className="mt-2 text-center text-sm text-white/70">{b.date}</div>
                            </section>
                          );
                        }

                        if (b.kind === "rsvp") {
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("rsvp")}
                              id={sectionId("rsvp")}
                            >
                              {secTitle ? (
                                <div className="text-xs font-semibold text-white/75">Подтверждение</div>
                              ) : null}
                              {"question" in b && b.question ? (
                                <div className={secTitle ? "mt-2 text-xs text-white/60" : "text-xs text-white/60"}>
                                  {b.question}
                                </div>
                              ) : null}
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  className="h-11 rounded-2xl bg-white text-sm font-semibold text-black hover:bg-white/90"
                                >
                                  Да
                                </button>
                                <button
                                  type="button"
                                  className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/85 hover:border-white/20"
                                >
                                  Нет
                                </button>
                              </div>
                            </section>
                          );
                        }

                        if (b.kind === "message") {
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("message")}
                              id={sectionId("message")}
                            >
                              {secTitle ? <div className="text-xs font-semibold text-white/75">Сообщение</div> : null}
                              {"prompt" in b && b.prompt ? (
                                <div className={secTitle ? "mt-2 text-xs text-white/60" : "text-xs text-white/60"}>
                                  {b.prompt}
                                </div>
                              ) : null}
                              <div className="mt-3 grid gap-2">
                                <div className="h-24 rounded-2xl border border-white/10 bg-white/[0.03]" />
                                <button
                                  type="button"
                                  className="h-11 w-full rounded-2xl bg-white text-sm font-semibold text-black hover:bg-white/90"
                                >
                                  Отправить
                                </button>
                              </div>
                            </section>
                          );
                        }

                        if (b.kind === "text") {
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("text")}
                              id={sectionId("text")}
                            >
                              {secTitle && b.title ? (
                                <div className="text-xs font-semibold text-white/80">{b.title}</div>
                              ) : secTitle ? (
                                <div className="text-xs font-semibold text-white/75">Текст приглашения</div>
                              ) : null}
                              <div
                                className={
                                  secTitle && (b.title || b.body)
                                    ? "mt-2 whitespace-pre-wrap text-xs leading-relaxed text-white/65"
                                    : "whitespace-pre-wrap text-xs leading-relaxed text-white/65"
                                }
                              >
                                {b.body || "Текст для гостей…"}
                              </div>
                            </section>
                          );
                        }

                        if (b.kind === "gifts") {
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("gifts")}
                              id={sectionId("gifts")}
                            >
                              {secTitle ? (
                                <div className="text-xs font-semibold text-white/75">{b.title ?? "Подарки"}</div>
                              ) : null}
                              <div className={secTitle ? "mt-2 text-xs text-white/55" : "text-xs text-white/55"}>
                                Реквизиты добавим в настройках
                              </div>
                            </section>
                          );
                        }

                        if (b.kind === "survey") {
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("survey")}
                              id={sectionId("survey")}
                            >
                              {secTitle ? <div className="text-xs font-semibold text-white/75">Опрос</div> : null}
                              <div className={secTitle ? "mt-2 text-xs text-white/55" : "text-xs text-white/55"}>
                                {b.questions.length} вопросов
                              </div>
                            </section>
                          );
                        }

                        if (b.kind === "schedule") {
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("schedule")}
                              id={sectionId("schedule")}
                            >
                              {secTitle ? <div className="text-xs font-semibold text-white/75">Расписание</div> : null}
                              <div className={secTitle ? "mt-2 space-y-2" : "space-y-2"}>
                                {b.items.slice(0, 2).map((it, idx) => (
                                  <div key={idx} className="flex items-start justify-between gap-3 text-xs">
                                    <div className="text-white/65">{it.time}</div>
                                    <div className="min-w-0 flex-1 text-right text-white/80">{it.title}</div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          );
                        }

                        if (b.kind === "video") {
                          const widthPct = clamp(b.sizePct, 50, 100);
                          const wrapRadius = b.shape === "circle" ? "9999px" : `${Math.max(18, st.radiusPx)}px`;
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("video")}
                              id={sectionId("video")}
                            >
                              {secTitle ? <div className="text-xs font-semibold text-white/75">Видео</div> : null}
                              <div
                                className={
                                  secTitle
                                    ? "mt-3 overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] shadow-[0_35px_90px_rgba(0,0,0,0.55)]"
                                    : "overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] shadow-[0_35px_90px_rgba(0,0,0,0.55)]"
                                }
                                style={{
                                  width: `${widthPct}%`,
                                  marginLeft: "auto",
                                  marginRight: "auto",
                                  borderRadius: wrapRadius,
                                  aspectRatio: "1 / 1",
                                }}
                              >
                                {b.videoUrl ? (
                                  <video
                                    src={b.videoUrl}
                                    playsInline
                                    loop
                                    controls
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>
                            </section>
                          );
                        }

                        if (b.kind === "story") {
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("story")}
                              id={sectionId("story")}
                            >
                              {secTitle ? <div className="text-xs font-semibold text-white/75">История</div> : null}
                              <div className={secTitle ? "mt-3 min-w-0 space-y-2" : "min-w-0 space-y-2"}>
                                {b.items.map((it, idx) => (
                                  <div
                                    key={idx}
                                    className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                                  >
                                    {it.imageUrl ? (
                                      <div className="mb-2">
                                        <StoryItemImage
                                          imageUrl={it.imageUrl}
                                          shape={it.imageShape ?? "square"}
                                          widthPct={it.imageWidthPct ?? 100}
                                          variant="preview"
                                        />
                                      </div>
                                    ) : null}
                                    {it.title ? (
                                      <div className="break-words text-xs font-semibold text-white/80">{it.title}</div>
                                    ) : null}
                                    {it.text ? (
                                      <div className="mt-1 break-words text-xs text-white/60">{it.text}</div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </section>
                          );
                        }

                        if (b.kind === "slides") {
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("slides")}
                              id={sectionId("slides")}
                            >
                              {secTitle ? (
                                <div className="text-xs font-semibold text-white/75">Слайдер</div>
                              ) : null}
                              {secTitle ? (
                                <p className="mt-1 text-[10px] text-white/35">
                                  {b.orientation === "vertical" ? "Вертикально" : "Горизонтально"} · листайте
                                </p>
                              ) : null}
                              <div className={secTitle ? "mt-2 min-w-0" : "min-w-0"}>
                                <SlidesBlockView
                                  items={b.items}
                                  orientation={b.orientation}
                                  variant="preview"
                                />
                              </div>
                            </section>
                          );
                        }

                        if (b.kind === "wishes") {
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("wishes")}
                              id={sectionId("wishes")}
                            >
                              {secTitle ? (
                                <div className="text-xs font-semibold text-white/75">{b.title ?? "Пожелания"}</div>
                              ) : null}
                              {secTitle ? (
                                <p className="mt-1 text-[10px] text-white/35">Карусель 7 сек · можно листать вручную</p>
                              ) : null}
                              <div className={secTitle ? "mt-2 flex snap-x snap-mandatory gap-0 overflow-x-auto pb-1 [scrollbar-width:thin]" : "flex snap-x snap-mandatory gap-0 overflow-x-auto pb-1 [scrollbar-width:thin]"}>
                                <div className="w-full min-w-full shrink-0 snap-start px-0.5">
                                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                    <div className="text-xs font-semibold text-white/85">Анна</div>
                                    <div className="mt-1 text-xs text-white/60">Счастья вам и долгих лет вместе!</div>
                                  </div>
                                </div>
                                <div className="w-full min-w-full shrink-0 snap-start px-0.5">
                                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                    <div className="text-xs font-semibold text-white/85">Иван</div>
                                    <div className="mt-1 text-xs text-white/60">Пусть всё будет как мечтаете.</div>
                                  </div>
                                </div>
                              </div>
                            </section>
                          );
                        }

                        if (b.kind === "wishesForm") {
                          return (
                            <section
                              key={`${b.kind}-${blockIdx}`}
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("wishesForm")}
                              id={sectionId("wishesForm")}
                            >
                              {secTitle ? (
                                <div className="text-xs font-semibold text-white/75">{b.title ?? "Оставьте пожелание"}</div>
                              ) : null}
                              <div className="mt-3 h-9 rounded-2xl border border-white/10 bg-white/[0.03] px-2 text-[11px] leading-9 text-white/40">
                                {b.namePlaceholder ?? "Имя"}
                              </div>
                              <div className="mt-2 h-20 rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-[11px] text-white/40">
                                {b.textPlaceholder ?? "Текст пожелания"}
                              </div>
                              <button
                                type="button"
                                className="mt-3 h-11 w-full rounded-2xl bg-white text-sm font-semibold text-black"
                              >
                                Отправить
                              </button>
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
                              className={[
                                sectionBase,
                                selected === b.kind ? "ring-1 ring-[rgba(168,85,247,0.45)]" : "",
                              ].join(" ")}
                              style={cardStyle}
                              onClick={() => setSelected("map")}
                              id={sectionId("map")}
                            >
                              {secTitle && !hasVenueHeader ? (
                                <div className="mb-2 text-xs font-semibold text-white/75">Карта</div>
                              ) : null}
                              <MapVenueBlock block={b} variant="preview" />
                            </section>
                          );
                        }

                        return null;
                      })}

                            <div className="h-4" />
                          </div>
                        </div>
                        <div className="pointer-events-none flex shrink-0 justify-center pb-2 pt-1">
                          <div className="h-[5px] w-[112px] rounded-full bg-white/20" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-center">
                    <a
                      href={openLink}
                      target="_blank"
                      rel="noreferrer"
                      className="h-10 max-w-[min(100%,320px)] truncate rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-center text-xs font-semibold leading-10 text-white/90 hover:border-white/20"
                    >
                      {guestLinkLabel}
                    </a>
                  </div>
                </div>
              </div>

            <aside className="w-[420px] shrink-0 border-l border-white/10 bg-black/20 p-4">
        <div className="grid gap-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-xs font-semibold text-white/85">Глобально</div>

            <div className="mt-3 grid gap-3">
              <label className="grid gap-1">
                <div className="text-[11px] font-medium text-white/55">Шрифт</div>
                <select
                  className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                  value={doc.global.fontFamily}
                  onChange={(e) =>
                    setDoc((p) => ({
                      ...p,
                      global: { ...p.global, fontFamily: e.target.value as InviteDoc["global"]["fontFamily"] },
                    }))
                  }
                >
                  {INVITE_FONT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1">
                <div className="flex items-center justify-between text-[11px] font-medium text-white/55">
                  <span>Размер</span>
                  <span className="text-white/35">{doc.global.fontSizePx}px</span>
                </div>
                <Slider
                  min={14}
                  max={22}
                  step={1}
                  value={doc.global.fontSizePx}
                  onChange={(v) => setDoc((p) => ({ ...p, global: { ...p.global, fontSizePx: v } }))}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-[11px] font-medium text-white/55">Фон (URL или файл)</div>
                <input
                  className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none placeholder:text-white/30 focus:border-white/20"
                  placeholder="https://..."
                  value={doc.global.backgroundImage ?? ""}
                  onChange={(e) =>
                    setDoc((p) => ({ ...p, global: { ...p.global, backgroundImage: e.target.value } }))
                  }
                />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="text-[11px] text-white/60 file:mr-2 file:rounded-xl file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-xs file:text-white/80"
                  disabled={Boolean(uploading)}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAsset("background", f, (url) => setDoc((p) => ({ ...p, global: { ...p.global, backgroundImage: url } })));
                    e.target.value = "";
                  }}
                />
              </label>

              <label
                className={[
                  "grid gap-1",
                  !doc.global.backgroundImage?.trim() ? "pointer-events-none opacity-45" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between text-[11px] font-medium text-white/55">
                  <span>Яркость фона</span>
                  <span className="text-white/35">{Math.round((doc.global.backgroundBrightness ?? 1) * 100)}%</span>
                </div>
                <Slider
                  min={0.35}
                  max={1.35}
                  step={0.05}
                  value={doc.global.backgroundBrightness ?? 1}
                  onChange={(v) =>
                    setDoc((p) => ({ ...p, global: { ...p.global, backgroundBrightness: v } }))
                  }
                />
                {!doc.global.backgroundImage?.trim() ? (
                  <p className="text-[10px] text-white/35">Сначала укажите или загрузите фоновое изображение</p>
                ) : null}
              </label>

              <label className="grid gap-1">
                <div className="flex items-center justify-between text-[11px] font-medium text-white/55">
                  <span>Затемнение фона</span>
                  <span className="text-white/35">{Math.round(doc.global.overlayOpacity * 100)}%</span>
                </div>
                <Slider
                  min={0}
                  max={0.9}
                  step={0.05}
                  value={doc.global.overlayOpacity}
                  onChange={(v) => setDoc((p) => ({ ...p, global: { ...p.global, overlayOpacity: v } }))}
                />
              </label>

              <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40"
                  checked={doc.global.showBlockTitles === true}
                  onChange={(e) =>
                    setDoc((p) => ({
                      ...p,
                      global: { ...p.global, showBlockTitles: e.target.checked },
                    }))
                  }
                />
                <span className="text-[11px] leading-snug text-white/65">
                  Показывать заголовки блоков («Видео», «История»…) на публичной странице
                </span>
              </label>

              <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <div className="text-[11px] font-medium text-white/55">Анимации фона</div>
                <p className="text-[10px] leading-snug text-white/40">
                  Можно добавить несколько слоёв или один. Символы для «букв» задаются строкой — каждая
                  падающая частица выбирается случайно из этих символов.
                </p>
                {effectiveOverlayAnimations(doc).map((anim, idx) => (
                  <div
                    key={anim.id}
                    className="grid gap-2 rounded-xl border border-white/[0.07] bg-black/25 p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium text-white/45">Слой {idx + 1}</span>
                      <button
                        type="button"
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-white/65 hover:border-white/20"
                        onClick={() =>
                          setDoc((p) => ({
                            ...p,
                            global: {
                              ...p.global,
                              overlayAnimations: effectiveOverlayAnimations(p).filter((a) => a.id !== anim.id),
                            },
                          }))
                        }
                      >
                        Удалить
                      </button>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/20 bg-black/40"
                        checked={anim.enabled !== false}
                        onChange={(e) =>
                          setDoc((p) => ({
                            ...p,
                            global: {
                              ...p.global,
                              overlayAnimations: effectiveOverlayAnimations(p).map((a) =>
                                a.id === anim.id ? { ...a, enabled: e.target.checked } : a,
                              ) as OverlayAnimation[],
                            },
                          }))
                        }
                      />
                      <span className="text-[11px] text-white/60">Включить этот слой</span>
                    </label>
                    <label className="grid gap-1">
                      <div className="text-[11px] font-medium text-white/55">Тип</div>
                      <select
                        className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                        value={anim.kind}
                        onChange={(e) => {
                          const kind = e.target.value as "hearts" | "letters";
                          setDoc((p) => ({
                            ...p,
                            global: {
                              ...p.global,
                              overlayAnimations: effectiveOverlayAnimations(p).map((a) => {
                                if (a.id !== anim.id) return a;
                                if (kind === "hearts") {
                                  return createHeartsAnimation({ id: a.id, enabled: a.enabled !== false });
                                }
                                return createLettersAnimation({
                                  id: a.id,
                                  enabled: a.enabled !== false,
                                  text: "LOVE",
                                });
                              }),
                            },
                          }));
                        }}
                      >
                        <option value="hearts">Сердечки</option>
                        <option value="letters">Буквы и символы</option>
                      </select>
                    </label>
                    {anim.kind === "hearts" ? (
                      <label className="grid gap-1">
                        <div className="text-[11px] font-medium text-white/55">Цвет</div>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            className="h-10 w-14 shrink-0 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1"
                            value={hexOrFallbackForPicker(anim.color, DEFAULT_HEARTS_COLOR)}
                            onChange={(e) =>
                              setDoc((p) => ({
                                ...p,
                                global: {
                                  ...p.global,
                                  overlayAnimations: effectiveOverlayAnimations(p).map((a) =>
                                    a.id === anim.id && a.kind === "hearts"
                                      ? { ...a, color: e.target.value }
                                      : a,
                                  ) as OverlayAnimation[],
                                },
                              }))
                            }
                          />
                          <input
                            className="h-10 min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                            value={anim.color ?? DEFAULT_HEARTS_COLOR}
                            onChange={(e) =>
                              setDoc((p) => ({
                                ...p,
                                global: {
                                  ...p.global,
                                  overlayAnimations: effectiveOverlayAnimations(p).map((a) =>
                                    a.id === anim.id && a.kind === "hearts"
                                      ? { ...a, color: e.target.value }
                                      : a,
                                  ) as OverlayAnimation[],
                                },
                              }))
                            }
                            placeholder={DEFAULT_HEARTS_COLOR}
                          />
                        </div>
                      </label>
                    ) : (
                      <>
                        <label className="grid gap-1">
                          <div className="text-[11px] font-medium text-white/55">Строка символов</div>
                          <input
                            className="min-h-10 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[13px] text-white/85 outline-none focus:border-white/20"
                            value={anim.text}
                            onChange={(e) =>
                              setDoc((p) => ({
                                ...p,
                                global: {
                                  ...p.global,
                                  overlayAnimations: effectiveOverlayAnimations(p).map((a) =>
                                    a.id === anim.id && a.kind === "letters"
                                      ? { ...a, text: e.target.value }
                                      : a,
                                  ) as OverlayAnimation[],
                                },
                              }))
                            }
                            placeholder="Например: LOVE или Свадьба 2026"
                          />
                        </label>
                        <label className="grid gap-1">
                          <div className="text-[11px] font-medium text-white/55">Цвет</div>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              className="h-10 w-14 shrink-0 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1"
                            value={hexOrFallbackForPicker(anim.color, "#ffffff")}
                            onChange={(e) =>
                                setDoc((p) => ({
                                  ...p,
                                  global: {
                                    ...p.global,
                                    overlayAnimations: effectiveOverlayAnimations(p).map((a) =>
                                      a.id === anim.id && a.kind === "letters"
                                        ? { ...a, color: e.target.value }
                                        : a,
                                    ) as OverlayAnimation[],
                                  },
                                }))
                              }
                            />
                            <input
                              className="h-10 min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                              value={anim.color ?? DEFAULT_LETTERS_COLOR}
                              onChange={(e) =>
                                setDoc((p) => ({
                                  ...p,
                                  global: {
                                    ...p.global,
                                    overlayAnimations: effectiveOverlayAnimations(p).map((a) =>
                                      a.id === anim.id && a.kind === "letters"
                                        ? { ...a, color: e.target.value }
                                        : a,
                                    ) as OverlayAnimation[],
                                  },
                                }))
                              }
                              placeholder={DEFAULT_LETTERS_COLOR}
                            />
                          </div>
                        </label>
                      </>
                    )}
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-semibold text-white/75 hover:border-white/20"
                    onClick={() =>
                      setDoc((p) => ({
                        ...p,
                        global: {
                          ...p.global,
                          overlayAnimations: [...effectiveOverlayAnimations(p), createHeartsAnimation()],
                        },
                      }))
                    }
                  >
                    + Сердечки
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-semibold text-white/75 hover:border-white/20"
                    onClick={() =>
                      setDoc((p) => ({
                        ...p,
                        global: {
                          ...p.global,
                          overlayAnimations: [...effectiveOverlayAnimations(p), createLettersAnimation()],
                        },
                      }))
                    }
                  >
                    + Буквы
                  </button>
                </div>
              </div>

              <label className="grid gap-1">
                <div className="text-[11px] font-medium text-white/55">Музыка (URL или файл mp3)</div>
                <input
                  className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none placeholder:text-white/30 focus:border-white/20"
                  placeholder="https://..."
                  value={doc.audioUrl ?? ""}
                  onChange={(e) => setDoc((p) => ({ ...p, audioUrl: e.target.value }))}
                />
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp4"
                  className="text-[11px] text-white/60 file:mr-2 file:rounded-xl file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-xs file:text-white/80"
                  disabled={Boolean(uploading)}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAsset("audio", f, (url) => setDoc((p) => ({ ...p, audioUrl: url })));
                    e.target.value = "";
                  }}
                />
              </label>

              <a
                className="inline-flex h-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold text-white/75 hover:border-white/20"
                href={`/api/invites/${encodeURIComponent(apiSlug)}/responses`}
                target="_blank"
                rel="noreferrer"
              >
                Ответы гостей (JSON)
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white/85">{blockTitle(selectedBlock.kind)}</div>
              <button
                type="button"
                onClick={() => toggleBlockEnabled(selectedBlock.kind)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-white/80 hover:border-white/20"
              >
                {selectedBlock.enabled ? "Включено" : "Выключено"}
              </button>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] font-medium text-white/55">Оформление блока</div>
              <label className="mt-2 grid gap-1">
                <span className="text-[11px] text-white/45">Заголовок секции</span>
                <select
                  className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                  value={selectedBlock.showTitle === undefined ? "" : selectedBlock.showTitle ? "yes" : "no"}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateBlock(selectedBlock.kind, {
                      showTitle: v === "" ? undefined : v === "yes",
                    } as any);
                  }}
                >
                  <option value="">Как в «Глобально»</option>
                  <option value="yes">Всегда показать</option>
                  <option value="no">Скрыть</option>
                </select>
              </label>
              <label className="mt-2 flex cursor-pointer items-center justify-between gap-2">
                <span className="text-[11px] text-white/65">Рамка карточки</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-black/40 accent-[var(--accent2)]"
                  checked={selectedBlock.showBorder !== false}
                  onChange={(e) => updateBlock(selectedBlock.kind, { showBorder: e.target.checked } as any)}
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3">
              {selectedBlock.kind === "names" ? (
                <>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Невеста</div>
                    <input
                      className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                      value={(selectedBlock as any).bride}
                      onChange={(e) => updateBlock("names", { bride: e.target.value } as any)}
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Жених</div>
                    <input
                      className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                      value={(selectedBlock as any).groom}
                      onChange={(e) => updateBlock("names", { groom: e.target.value } as any)}
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Дата</div>
                    <input
                      className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                      value={(selectedBlock as any).date}
                      onChange={(e) => updateBlock("names", { date: e.target.value } as any)}
                    />
                  </label>
                </>
              ) : null}

              {selectedBlock.kind === "palette" ? (
                <>
                  <div className="text-[11px] font-medium text-white/55">Цвета</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(selectedBlock as any).colors.map((c: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-2 py-2">
                        <input
                          type="color"
                          value={c}
                          onChange={(e) => {
                            const next = [...(selectedBlock as any).colors];
                            next[idx] = e.target.value;
                            updateBlock("palette", { colors: next } as any);
                          }}
                          className="h-6 w-8 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0"
                        />
                        <input
                          className="min-w-0 flex-1 bg-transparent text-[12px] text-white/80 outline-none"
                          value={c}
                          onChange={(e) => {
                            const next = [...(selectedBlock as any).colors];
                            next[idx] = e.target.value;
                            updateBlock("palette", { colors: next } as any);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="h-10 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white/85 hover:border-white/20"
                    onClick={() => updateBlock("palette", { colors: [...(selectedBlock as any).colors, "#ffffff"] } as any)}
                  >
                    + Цвет
                  </button>
                </>
              ) : null}

              {selectedBlock.kind === "countdown" ? (
                <label className="grid gap-1">
                  <div className="text-[11px] font-medium text-white/55">Дата и время</div>
                  <input
                    type="datetime-local"
                    className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                    value={
                      (selectedBlock as any).targetIso
                        ? new Date((selectedBlock as any).targetIso).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) => {
                      const iso = e.target.value ? new Date(e.target.value).toISOString() : "";
                      updateBlock("countdown", { targetIso: iso } as any);
                    }}
                  />
                </label>
              ) : null}

              {selectedBlock.kind === "rsvp" ? (
                <label className="grid gap-1">
                  <div className="text-[11px] font-medium text-white/55">Вопрос</div>
                  <input
                    className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                    value={(selectedBlock as any).question ?? ""}
                    onChange={(e) => updateBlock("rsvp", { question: e.target.value } as any)}
                  />
                </label>
              ) : null}

              {selectedBlock.kind === "message" ? (
                <label className="grid gap-1">
                  <div className="text-[11px] font-medium text-white/55">Текст</div>
                  <input
                    className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                    value={(selectedBlock as any).prompt ?? ""}
                    onChange={(e) => updateBlock("message", { prompt: e.target.value } as any)}
                  />
                </label>
              ) : null}

              {selectedBlock.kind === "text" ? (
                <>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Заголовок (необязательно)</div>
                    <input
                      className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                      placeholder="Например: Приглашаем вас"
                      value={(selectedBlock as any).title ?? ""}
                      onChange={(e) => updateBlock("text", { title: e.target.value } as any)}
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Текст приглашения для гостей</div>
                    <textarea
                      className="min-h-[140px] resize-y rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-[13px] leading-relaxed text-white/85 outline-none placeholder:text-white/30 focus:border-white/20"
                      placeholder="Напишите тёплые слова: кого приглашаете, дату, дресс-код…"
                      value={(selectedBlock as any).body ?? ""}
                      onChange={(e) => updateBlock("text", { body: e.target.value } as any)}
                    />
                  </label>
                </>
              ) : null}

              {selectedBlock.kind === "gifts" ? (
                <label className="grid gap-1">
                  <div className="text-[11px] font-medium text-white/55">Заголовок</div>
                  <input
                    className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                    value={(selectedBlock as any).title ?? ""}
                    onChange={(e) => updateBlock("gifts", { title: e.target.value } as any)}
                  />
                </label>
              ) : null}

              {selectedBlock.kind === "schedule" ? (
                <>
                  <div className="grid gap-2">
                    {(selectedBlock as any).items.map((it: any, idx: number) => (
                      <div key={idx} className="rounded-2xl border border-white/10 bg-black/20 p-2">
                        <div className="grid grid-cols-[90px_1fr] gap-2">
                          <input
                            className="h-9 rounded-xl border border-white/10 bg-black/25 px-2 text-[12px] text-white/85 outline-none focus:border-white/20"
                            value={it.time}
                            onChange={(e) => {
                              const next = [...(selectedBlock as any).items];
                              next[idx] = { ...next[idx], time: e.target.value };
                              updateBlock("schedule", { items: next } as any);
                            }}
                          />
                          <input
                            className="h-9 rounded-xl border border-white/10 bg-black/25 px-2 text-[12px] text-white/85 outline-none focus:border-white/20"
                            value={it.title}
                            onChange={(e) => {
                              const next = [...(selectedBlock as any).items];
                              next[idx] = { ...next[idx], title: e.target.value };
                              updateBlock("schedule", { items: next } as any);
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="mt-2 h-8 w-full rounded-xl border border-white/10 bg-white/[0.04] text-[11px] font-semibold text-white/80 hover:border-white/20"
                          onClick={() => {
                            const next = [...(selectedBlock as any).items];
                            next.splice(idx, 1);
                            updateBlock("schedule", { items: next } as any);
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="h-10 rounded-2xl bg-[var(--accent2)] text-xs font-semibold text-white hover:opacity-95 active:opacity-90"
                    onClick={() =>
                      updateBlock("schedule", { items: [...(selectedBlock as any).items, { time: "00:00", title: "Событие" }] } as any)
                    }
                  >
                    + Пункт
                  </button>
                </>
              ) : null}

              {selectedBlock.kind === "video" ? (
                <>
                  <div className="grid gap-2">
                    <div className="text-[11px] font-medium text-white/55">Форма</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(["circle", "square"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={[
                            "h-10 rounded-2xl border text-xs font-semibold",
                            (selectedBlock as any).shape === s
                              ? "border-[rgba(168,85,247,0.55)] bg-[rgba(168,85,247,0.12)] text-white"
                              : "border-white/10 bg-white/[0.04] text-white/80 hover:border-white/20",
                          ].join(" ")}
                          onClick={() => updateBlock("video", { shape: s } as any)}
                        >
                          {s === "circle" ? "Круг" : "Квадрат"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="grid gap-1">
                    <div className="flex items-center justify-between text-[11px] font-medium text-white/55">
                      <span>Размер</span>
                      <span className="text-white/35">{(selectedBlock as any).sizePct}%</span>
                    </div>
                    <Slider
                      min={50}
                      max={100}
                      step={5}
                      value={(selectedBlock as any).sizePct}
                      onChange={(v) => updateBlock("video", { sizePct: v } as any)}
                    />
                  </label>

                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Видео (URL или файл mp4)</div>
                    <p className="text-[10px] leading-snug text-white/40">
                      Прямая ссылка на <span className="text-white/55">.mp4</span> / <span className="text-white/55">.webm</span>{" "}
                      — надёжный вариант. Файл с устройства: до ~4 MB загрузится без CORS; больше — нужна настройка CORS на
                      бакете S3 в Timeweb или сожмите видео.
                    </p>
                    <input
                      className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none placeholder:text-white/30 focus:border-white/20"
                      placeholder="https://.../video.mp4"
                      value={(selectedBlock as any).videoUrl ?? ""}
                      onChange={(e) => updateBlock("video", { videoUrl: e.target.value } as any)}
                    />
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      className="text-[11px] text-white/60 file:mr-2 file:rounded-xl file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-xs file:text-white/80"
                      disabled={Boolean(uploading)}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f)
                          void uploadAsset("video", f, (url) => updateBlock("video", { videoUrl: url } as any));
                        e.target.value = "";
                      }}
                    />
                  </label>
                </>
              ) : null}

              {selectedBlock.kind === "story" ? (
                <>
                  <p className="text-[10px] leading-snug text-white/40">
                    Порядок на странице — как в списке: чередуйте фото и текст. Заголовок у абзаца необязателен.
                  </p>
                  {(selectedBlock as Extract<InviteBlock, { kind: "story" }>).items.map((it, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="h-8 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-[11px] font-semibold text-white/75 hover:border-white/20 disabled:opacity-30"
                          disabled={idx === 0}
                          onClick={() => moveStoryItem(idx, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="h-8 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-[11px] font-semibold text-white/75 hover:border-white/20 disabled:opacity-30"
                          disabled={idx === (selectedBlock as Extract<InviteBlock, { kind: "story" }>).items.length - 1}
                          onClick={() => moveStoryItem(idx, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="h-8 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-[11px] font-semibold text-[rgba(255,106,61,0.95)] hover:border-white/20"
                          onClick={() => removeStoryItem(idx)}
                        >
                          Удалить
                        </button>
                      </div>
                      <label className="grid gap-1">
                        <div className="text-[11px] font-medium text-white/55">Подзаголовок (необязательно)</div>
                        <input
                          className="h-9 rounded-xl border border-white/10 bg-black/25 px-2 text-[12px] text-white/85 outline-none focus:border-white/20"
                          value={it.title ?? ""}
                          onChange={(e) => patchStoryItem(idx, { title: e.target.value })}
                          placeholder="Например: Как познакомились"
                        />
                      </label>
                      <label className="mt-2 grid gap-1">
                        <div className="text-[11px] font-medium text-white/55">Текст</div>
                        <textarea
                          className="min-h-[72px] resize-y rounded-xl border border-white/10 bg-black/25 px-2 py-2 text-[12px] text-white/85 outline-none focus:border-white/20"
                          value={it.text}
                          onChange={(e) => patchStoryItem(idx, { text: e.target.value })}
                          placeholder="Текст абзаца (можно оставить пустым, если только фото)"
                        />
                      </label>
                      <label className="mt-2 grid gap-1">
                        <div className="text-[11px] font-medium text-white/55">Картинка (URL или файл)</div>
                        <input
                          className="h-9 rounded-xl border border-white/10 bg-black/25 px-2 text-[12px] text-white/85 outline-none focus:border-white/20"
                          value={it.imageUrl ?? ""}
                          onChange={(e) => patchStoryItem(idx, { imageUrl: e.target.value })}
                          placeholder="https://..."
                        />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="text-[11px] text-white/60 file:mr-2 file:rounded-xl file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-xs file:text-white/80"
                          disabled={Boolean(uploading)}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f)
                              void uploadAsset(`story-${idx}`, f, (url) => patchStoryItem(idx, { imageUrl: url }));
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {it.imageUrl ? (
                        <>
                          <div className="mt-2">
                            <StoryItemImage
                              imageUrl={it.imageUrl}
                              shape={it.imageShape ?? "square"}
                              widthPct={it.imageWidthPct ?? 100}
                              variant="preview"
                            />
                          </div>
                          <div className="mt-3 grid gap-2">
                            <div className="text-[11px] font-medium text-white/55">Форма</div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(["square", "circle", "heart"] as const).map((sh) => (
                                <button
                                  key={sh}
                                  type="button"
                                  className={[
                                    "h-9 rounded-xl border text-[11px] font-semibold",
                                    (it.imageShape ?? "square") === sh
                                      ? "border-[rgba(168,85,247,0.55)] bg-[rgba(168,85,247,0.12)] text-white"
                                      : "border-white/10 bg-white/[0.04] text-white/80 hover:border-white/20",
                                  ].join(" ")}
                                  onClick={() => patchStoryItem(idx, { imageShape: sh })}
                                >
                                  {sh === "square" ? "Квадрат" : sh === "circle" ? "Круг" : "Сердце"}
                                </button>
                              ))}
                            </div>
                            <label className="grid gap-1">
                              <div className="flex items-center justify-between text-[11px] font-medium text-white/55">
                                <span>Размер (ширина)</span>
                                <span className="text-white/35">{it.imageWidthPct ?? 100}%</span>
                              </div>
                              <Slider
                                min={40}
                                max={100}
                                step={5}
                                value={it.imageWidthPct ?? 100}
                                onChange={(v) => patchStoryItem(idx, { imageWidthPct: v })}
                              />
                            </label>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="h-10 flex-1 rounded-2xl border border-white/10 bg-white/[0.06] text-[11px] font-semibold text-white/85 hover:border-white/20"
                      onClick={() => addStoryItem({ title: "", text: "Новый абзац" })}
                    >
                      + Абзац
                    </button>
                    <button
                      type="button"
                      className="h-10 flex-1 rounded-2xl border border-white/10 bg-white/[0.06] text-[11px] font-semibold text-white/85 hover:border-white/20"
                      onClick={() =>
                        addStoryItem({
                          title: "",
                          text: "",
                          imageUrl: "",
                          imageWidthPct: 100,
                          imageShape: "square",
                        })
                      }
                    >
                      + Фото
                    </button>
                  </div>
                </>
              ) : null}

              {selectedBlock.kind === "slides" ? (
                <>
                  <p className="text-[10px] leading-snug text-white/40">
                    Направление прокрутки и форма каждого фото. Горизонтально — свайп влево-вправо, вертикально — вверх-вниз.
                  </p>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Направление слайдера</div>
                    <select
                      className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                      value={(selectedBlock as Extract<InviteBlock, { kind: "slides" }>).orientation}
                      onChange={(e) =>
                        updateBlock("slides", {
                          orientation: e.target.value as "horizontal" | "vertical",
                        } as any)
                      }
                    >
                      <option value="horizontal">Горизонтально</option>
                      <option value="vertical">Вертикально</option>
                    </select>
                  </label>
                  {(selectedBlock as Extract<InviteBlock, { kind: "slides" }>).items.map((it, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="h-8 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-[11px] font-semibold text-white/75 hover:border-white/20 disabled:opacity-30"
                          disabled={idx === 0}
                          onClick={() => moveSlideItem(idx, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="h-8 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-[11px] font-semibold text-white/75 hover:border-white/20 disabled:opacity-30"
                          disabled={
                            idx === (selectedBlock as Extract<InviteBlock, { kind: "slides" }>).items.length - 1
                          }
                          onClick={() => moveSlideItem(idx, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="h-8 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-[11px] font-semibold text-[rgba(255,106,61,0.95)] hover:border-white/20"
                          onClick={() => removeSlideItem(idx)}
                        >
                          Удалить
                        </button>
                      </div>
                      <div className="text-[11px] font-medium text-white/55">Форма фото</div>
                      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                        {(["square", "circle", "heart"] as const).map((sh) => (
                          <button
                            key={sh}
                            type="button"
                            className={[
                              "h-9 rounded-xl border text-[11px] font-semibold",
                              it.shape === sh
                                ? "border-[rgba(168,85,247,0.55)] bg-[rgba(168,85,247,0.12)] text-white"
                                : "border-white/10 bg-white/[0.04] text-white/80 hover:border-white/20",
                            ].join(" ")}
                            onClick={() => patchSlideItem(idx, { shape: sh })}
                          >
                            {sh === "square" ? "Квадрат" : sh === "circle" ? "Круг" : "Сердце"}
                          </button>
                        ))}
                      </div>
                      <label className="mt-3 grid gap-1">
                        <div className="text-[11px] font-medium text-white/55">Картинка (URL или файл)</div>
                        <input
                          className="h-9 rounded-xl border border-white/10 bg-black/25 px-2 text-[12px] text-white/85 outline-none focus:border-white/20"
                          value={it.imageUrl ?? ""}
                          onChange={(e) => patchSlideItem(idx, { imageUrl: e.target.value })}
                          placeholder="https://..."
                        />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="text-[11px] text-white/60 file:mr-2 file:rounded-xl file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-xs file:text-white/80"
                          disabled={Boolean(uploading)}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f)
                              void uploadAsset(`slides-${idx}`, f, (url) => patchSlideItem(idx, { imageUrl: url }));
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {it.imageUrl ? (
                        <div className="mt-3 grid gap-2">
                          <div className="mt-1">
                            <StoryItemImage
                              imageUrl={it.imageUrl}
                              shape={it.shape}
                              widthPct={it.imageWidthPct ?? 100}
                              variant="preview"
                            />
                          </div>
                          <label className="grid gap-1">
                            <div className="flex items-center justify-between text-[11px] font-medium text-white/55">
                              <span>Размер (ширина)</span>
                              <span className="text-white/35">{it.imageWidthPct ?? 100}%</span>
                            </div>
                            <Slider
                              min={40}
                              max={100}
                              step={5}
                              value={it.imageWidthPct ?? 100}
                              onChange={(v) => patchSlideItem(idx, { imageWidthPct: v })}
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="h-10 w-full rounded-2xl border border-white/10 bg-white/[0.06] text-[11px] font-semibold text-white/85 hover:border-white/20"
                    onClick={() => addSlideItem({ shape: "square", imageWidthPct: 100 })}
                  >
                    + Слайд
                  </button>
                </>
              ) : null}

              {selectedBlock.kind === "map" ? (
                <>
                  <p className="text-[10px] leading-snug text-white/40">
                    Слева время и дата, справа название места и текст. Карта — встраивание Google по адресу.
                  </p>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Адрес (для карты)</div>
                    <input
                      className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none placeholder:text-white/30 focus:border-white/20"
                      value={(selectedBlock as any).address ?? ""}
                      onChange={(e) => updateBlock("map", { address: e.target.value } as any)}
                      placeholder="Город, улица, дом"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1">
                      <div className="text-[11px] font-medium text-white/55">Время</div>
                      <input
                        className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                        value={(selectedBlock as any).eventTime ?? ""}
                        onChange={(e) => updateBlock("map", { eventTime: e.target.value } as any)}
                        placeholder="10:00"
                      />
                    </label>
                    <label className="grid gap-1">
                      <div className="text-[11px] font-medium text-white/55">Дата</div>
                      <input
                        className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                        value={(selectedBlock as any).eventDate ?? ""}
                        onChange={(e) => updateBlock("map", { eventDate: e.target.value } as any)}
                        placeholder="26.12.2025"
                      />
                    </label>
                  </div>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Заголовок места</div>
                    <input
                      className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                      value={(selectedBlock as any).venueTitle ?? ""}
                      onChange={(e) => updateBlock("map", { venueTitle: e.target.value } as any)}
                      placeholder="Фуршет"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Подзаголовок</div>
                    <input
                      className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                      value={(selectedBlock as any).venueSubtitle ?? ""}
                      onChange={(e) => updateBlock("map", { venueSubtitle: e.target.value } as any)}
                      placeholder="Банкетный зал"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Описание (курсив на странице)</div>
                    <textarea
                      className="min-h-[80px] resize-y rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[13px] text-white/85 outline-none focus:border-white/20"
                      value={(selectedBlock as any).venueDescription ?? ""}
                      onChange={(e) => updateBlock("map", { venueDescription: e.target.value } as any)}
                      placeholder="Текст про трансфер и место…"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Цвет рамки карты (hex)</div>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        className="h-10 w-14 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1"
                        value={
                          /^#[0-9A-Fa-f]{6}$/.test((selectedBlock as any).mapBorderColor ?? "")
                            ? (selectedBlock as any).mapBorderColor
                            : "#2ec4b6"
                        }
                        onChange={(e) => updateBlock("map", { mapBorderColor: e.target.value } as any)}
                      />
                      <input
                        className="h-10 min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none focus:border-white/20"
                        value={(selectedBlock as any).mapBorderColor ?? "#2ec4b6"}
                        onChange={(e) => updateBlock("map", { mapBorderColor: e.target.value } as any)}
                        placeholder="#2ec4b6"
                      />
                    </div>
                  </label>
                </>
              ) : null}

              {selectedBlock.kind === "wishes" ? (
                <label className="grid gap-1">
                  <div className="text-[11px] font-medium text-white/55">Заголовок</div>
                  <input
                    className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none placeholder:text-white/30 focus:border-white/20"
                    value={(selectedBlock as any).title ?? ""}
                    onChange={(e) => updateBlock("wishes", { title: e.target.value } as any)}
                    placeholder="Пожелания"
                  />
                </label>
              ) : null}

              {selectedBlock.kind === "wishesForm" ? (
                <>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Заголовок</div>
                    <input
                      className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none placeholder:text-white/30 focus:border-white/20"
                      value={(selectedBlock as any).title ?? ""}
                      onChange={(e) => updateBlock("wishesForm", { title: e.target.value } as any)}
                      placeholder="Оставьте пожелание"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Подсказка для имени</div>
                    <input
                      className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none placeholder:text-white/30 focus:border-white/20"
                      value={(selectedBlock as any).namePlaceholder ?? ""}
                      onChange={(e) => updateBlock("wishesForm", { namePlaceholder: e.target.value } as any)}
                      placeholder="Ваше имя"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] font-medium text-white/55">Подсказка для текста</div>
                    <input
                      className="h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] text-white/85 outline-none placeholder:text-white/30 focus:border-white/20"
                      value={(selectedBlock as any).textPlaceholder ?? ""}
                      onChange={(e) => updateBlock("wishesForm", { textPlaceholder: e.target.value } as any)}
                      placeholder="Тёплые слова"
                    />
                  </label>
                </>
              ) : null}

              <div className="h-px bg-white/10" />

              <div className="text-[11px] font-medium text-white/55">Фон блока</div>
              <label className="grid gap-1">
                <div className="flex items-center justify-between text-[11px] font-medium text-white/55">
                  <span>Прозрачность</span>
                  <span className="text-white/35">
                    {Math.round(
                      (selectedBlock.style?.bgOpacity ?? doc.global.blockDefaults.bgOpacity) * 100,
                    )}
                    %
                  </span>
                </div>
                <Slider
                  min={0}
                  max={0.25}
                  step={0.01}
                  value={selectedBlock.style?.bgOpacity ?? doc.global.blockDefaults.bgOpacity}
                  onChange={(v) => updateBlockStyle(selectedBlock.kind, { bgOpacity: v })}
                />
              </label>

              <label className="grid gap-1">
                <div className="flex items-center justify-between text-[11px] font-medium text-white/55">
                  <span>Blur</span>
                  <span className="text-white/35">
                    {Math.round(selectedBlock.style?.blurPx ?? doc.global.blockDefaults.blurPx)}px
                  </span>
                </div>
                <Slider
                  min={0}
                  max={30}
                  step={1}
                  value={selectedBlock.style?.blurPx ?? doc.global.blockDefaults.blurPx}
                  onChange={(v) => updateBlockStyle(selectedBlock.kind, { blurPx: v })}
                />
              </label>

              <label className="grid gap-1">
                <div className="flex items-center justify-between text-[11px] font-medium text-white/55">
                  <span>Скругление</span>
                  <span className="text-white/35">
                    {Math.round(selectedBlock.style?.radiusPx ?? doc.global.blockDefaults.radiusPx)}px
                  </span>
                </div>
                <Slider
                  min={12}
                  max={32}
                  step={1}
                  value={selectedBlock.style?.radiusPx ?? doc.global.blockDefaults.radiusPx}
                  onChange={(v) => updateBlockStyle(selectedBlock.kind, { radiusPx: v })}
                />
              </label>
            </div>
          </div>
        </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

