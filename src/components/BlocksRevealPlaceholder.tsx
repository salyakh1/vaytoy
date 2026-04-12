/** Плейсхолдер, пока блоки приглашения скрыты по таймеру. */
export function BlocksRevealPlaceholder() {
  return (
    <div
      className="flex min-h-[min(40vh,280px)] flex-col items-center justify-center gap-3 px-4 py-10"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white/55"
        aria-hidden
      />
      <p className="text-center text-[11px] font-medium text-white/40">Скоро появится содержимое…</p>
    </div>
  );
}
