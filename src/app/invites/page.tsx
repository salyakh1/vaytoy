import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { InviteCard } from "./InviteCard";

export const dynamic = "force-dynamic";

type Row = { slug: string; title: string; published: boolean; updatedAt: Date };

type Props = {
  searchParams: Promise<{ status?: string }>;
};

function editHref(slug: string) {
  const editSegment = slug.startsWith("demo-") ? slug.slice("demo-".length) : slug;
  return `/invites/${editSegment}/edit`;
}

function tabClass(active: boolean) {
  return [
    "inline-flex min-h-[40px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
    active ? "bg-white/[0.14] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" : "text-white/50 hover:bg-white/[0.08] hover:text-white/85",
  ].join(" ");
}

export default async function InvitesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = sp.status === "published" || sp.status === "draft" ? sp.status : "all";

  let rows: Row[] = [];
  let dbError = false;

  if (process.env.DATABASE_URL) {
    try {
      rows = await prisma.invitation.findMany({
        orderBy: { updatedAt: "desc" },
        select: { slug: true, title: true, published: true, updatedAt: true },
      });
    } catch {
      dbError = true;
      rows = [];
    }
  }

  const filtered: Row[] =
    status === "published" ? rows.filter((r) => r.published) : status === "draft" ? rows.filter((r) => !r.published) : rows;

  const countPub = rows.filter((r) => r.published).length;
  const countDraft = rows.filter((r) => !r.published).length;

  return (
    <main className="min-h-dvh w-full p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Приглашения</h1>
            <p className="mt-1 text-sm text-white/45">Фильтры, редактирование, ссылка для гостей и удаление — всё кнопками</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/invites/1/edit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-black hover:opacity-95 active:opacity-90"
            >
              Новое приглашение
            </Link>
            <form action="/api/logout" method="post">
              <button
                type="submit"
                className="h-11 rounded-xl border border-white/12 bg-white/[0.05] px-4 text-sm font-medium text-white/85 hover:border-white/22 hover:bg-white/[0.08]"
              >
                Выйти
              </button>
            </form>
          </div>
        </header>

        {!process.env.DATABASE_URL ? (
          <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-sm text-amber-100/90">
            Нет <code className="rounded bg-black/30 px-1">DATABASE_URL</code> — список приглашений с сервера недоступен. Укажите
            переменную в <code className="rounded bg-black/30 px-1">.env</code> или на хостинге (Vercel).
          </div>
        ) : dbError ? (
          <div className="mt-8 rounded-2xl border border-red-500/25 bg-red-500/[0.07] p-4 text-sm text-red-100/90">
            Не удалось подключиться к базе. Проверьте <code className="rounded bg-black/30 px-1">DATABASE_URL</code> и доступ с
            сервера.
          </div>
        ) : null}

        {process.env.DATABASE_URL && !dbError ? (
          <>
            <nav className="mt-6 flex flex-wrap gap-2" aria-label="Фильтр приглашений">
              <Link href="/invites" className={tabClass(status === "all")}>
                Все · {rows.length}
              </Link>
              <Link href="/invites?status=published" className={tabClass(status === "published")}>
                Опубликованные · {countPub}
              </Link>
              <Link href="/invites?status=draft" className={tabClass(status === "draft")}>
                Черновики · {countDraft}
              </Link>
            </nav>

            {rows.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
                <p className="text-sm font-medium text-white/75">Пока нет сохранённых приглашений</p>
                <p className="mt-2 text-sm text-white/45">Нажмите «Новое приглашение» выше или откройте редактор и сохраните.</p>
                <Link
                  href="/invites/1/edit"
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-6 text-sm font-semibold text-black hover:opacity-95"
                >
                  Создать первое приглашение
                </Link>
              </div>
            ) : filtered.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
                В этой категории пока пусто. Переключите вкладку выше.
              </div>
            ) : (
              <ul className="mt-6 grid list-none gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((inv) => {
                  const publicPath = `/i/${encodeURIComponent(inv.slug)}`;
                  return (
                    <InviteCard
                      key={inv.slug}
                      inv={{
                        slug: inv.slug,
                        title: inv.title,
                        published: inv.published,
                        updatedAt: inv.updatedAt.toISOString(),
                      }}
                      editPath={editHref(inv.slug)}
                      publicPath={publicPath}
                    />
                  );
                })}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
