import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InvitesPage() {
  let rows: { slug: string; title: string; published: boolean; updatedAt: Date }[] = [];
  if (process.env.DATABASE_URL) {
    try {
      rows = await prisma.invitation.findMany({
        orderBy: { updatedAt: "desc" },
        select: { slug: true, title: true, published: true, updatedAt: true },
      });
    } catch {
      rows = [];
    }
  }

  const fallback = Array.from({ length: 6 }, (_, i) => {
    const n = i + 1;
    return {
      slug: `demo-${n}`,
      title: `Приглашение ${n}`,
      published: false,
      updatedAt: new Date(),
    };
  });

  const list = rows.length ? rows : fallback;

  return (
    <main className="min-h-dvh w-full p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium tracking-wide text-white/70">vaytoy</div>
          <div className="flex items-center gap-2">
            <form action="/api/logout" method="post">
              <button
                type="submit"
                className="h-9 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white/80 hover:border-white/20"
              >
                Выйти
              </button>
            </form>
            <span className="h-9 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm leading-9 text-white/55">
              Шаблоны
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((inv) => {
            const editSegment = inv.slug.startsWith("demo-") ? inv.slug.slice("demo-".length) : inv.slug;
            return (
              <Link
                key={inv.slug}
                href={`/invites/${editSegment}/edit`}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-white/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/90">{inv.title}</div>
                    <div className="mt-1 text-xs text-white/40">{inv.slug}</div>
                  </div>
                  <div className="shrink-0 text-xs text-white/40 group-hover:text-white/55">Редактировать</div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className={inv.published ? "text-emerald-300/90" : "text-white/45"}>
                    {inv.published ? "Опубликовано" : "Черновик"}
                  </span>
                  <span className="text-white/30">
                    {inv.updatedAt.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="h-24 rounded-lg bg-gradient-to-b from-white/10 to-white/[0.02]" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
