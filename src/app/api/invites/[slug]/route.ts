import { NextResponse } from "next/server";
import type { InviteDoc } from "@/lib/inviteTypes";
import { prisma } from "@/lib/prisma";
import { getSessionTokenFromCookies, verifyAdminSession } from "@/lib/session";

async function requireAdmin() {
  const secret = process.env.AUTH_SECRET;
  const token = await getSessionTokenFromCookies();
  if (!secret || !token) return false;
  return verifyAdminSession(token, secret);
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { slug } = await ctx.params;
  try {
    const row = await prisma.invitation.findUnique({ where: { slug } });
    if (!row) return NextResponse.json({ invitation: null }, { status: 404 });
    return NextResponse.json({
      invitation: {
        slug: row.slug,
        title: row.title,
        published: row.published,
        data: row.data as InviteDoc,
        updatedAt: row.updatedAt,
      },
    });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { slug } = await ctx.params;
  const body = (await req.json()) as { doc?: InviteDoc; published?: boolean };
  if (!body.doc || typeof body.doc !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const doc = body.doc;
  if (doc.slug !== slug) {
    return NextResponse.json({ error: "slug mismatch" }, { status: 400 });
  }

  const published = Boolean(body.published);
  const names = doc.blocks.find((b) => b.kind === "names");
  const title =
    names && "bride" in names && "groom" in names ? `${names.bride} & ${names.groom}` : slug;

  try {
    const row = await prisma.invitation.upsert({
      where: { slug },
      create: {
        slug,
        data: doc as object,
        published,
        title: title || slug,
      },
      update: {
        data: doc as object,
        published,
        title: title || slug,
      },
    });
    return NextResponse.json({ ok: true, invitation: { slug: row.slug, published: row.published } });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

/** Безвозвратное удаление приглашения и всех ответов гостей по этому slug. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { slug } = await ctx.params;
  if (!slug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  try {
    const existing = await prisma.invitation.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.guestResponse.deleteMany({ where: { invitationSlug: slug } }),
      prisma.invitation.delete({ where: { slug } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
