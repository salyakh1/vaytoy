"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Inv = {
  slug: string;
  title: string;
  published: boolean;
  updatedAt: string;
};

const btnBase =
  "flex w-full items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors active:scale-[0.99]";

export function InviteCard({ inv, editPath, publicPath }: { inv: Inv; editPath: string; publicPath: string }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!deleteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setDeleteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteOpen, busy]);

  const label = inv.title.trim() || inv.slug;
  const updated = new Date(inv.updatedAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });

  async function copyLink() {
    const full = `${window.location.origin}${publicPath}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(inv.slug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? `Ошибка ${res.status}`);
        return;
      }
      setDeleteOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось связаться с сервером");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li>
      <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white/90">{label}</div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            <span className={inv.published ? "text-emerald-300/90" : "text-amber-200/80"}>
              {inv.published ? "Опубликовано" : "Черновик"}
            </span>
            <span className="text-white/35">{updated}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-2 border-t border-white/[0.06] pt-4">
          <Link
            href={editPath}
            className={`${btnBase} border-[var(--accent2)]/40 bg-[var(--accent2)]/25 text-white hover:bg-[var(--accent2)]/35`}
          >
            Редактировать
          </Link>

          {inv.published ? (
            <>
              <Link
                href={publicPath}
                target="_blank"
                rel="noreferrer"
                className={`${btnBase} border-white/15 bg-white/[0.07] text-white/90 hover:border-white/25 hover:bg-white/[0.1]`}
              >
                Открыть как гость
              </Link>
              <button
                type="button"
                onClick={() => void copyLink()}
                className={`${btnBase} border-white/12 bg-white/[0.05] text-white/85 hover:border-white/22 ${
                  copied ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100" : ""
                }`}
              >
                {copied ? "Скопировано" : "Копировать ссылку"}
              </button>
            </>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-center text-xs text-white/45">
              Ссылка для гостей появится после публикации в редакторе
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setErr(null);
              setDeleteOpen(true);
            }}
            className={`${btnBase} border-red-500/30 bg-red-500/[0.1] text-red-100/95 hover:border-red-400/45 hover:bg-red-500/[0.16]`}
          >
            Удалить приглашение
          </button>
        </div>

        <div className="mt-3 h-16 rounded-xl bg-gradient-to-b from-white/[0.07] to-white/[0.02]" aria-hidden />
      </div>

      {deleteOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-invite-title"
          onClick={() => !busy && setDeleteOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/12 bg-[#12131a] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-invite-title" className="text-base font-semibold text-white">
              Удалить «{label}»?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Данные приглашения и ответы гостей будут удалены без восстановления. Файлы в хранилище S3 останутся — при
              необходимости удалите их вручную в панели бакета.
            </p>
            {err ? <p className="mt-3 text-sm text-red-300/95">{err}</p> : null}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteOpen(false)}
                className="rounded-xl border border-white/12 bg-white/[0.06] py-2.5 text-sm font-semibold text-white/85 hover:bg-white/[0.1] disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmDelete()}
                className="rounded-xl border border-red-500/40 bg-red-500/25 py-2.5 text-sm font-semibold text-red-50 hover:bg-red-500/35 disabled:opacity-50"
              >
                {busy ? "Удаление…" : "Удалить навсегда"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}
