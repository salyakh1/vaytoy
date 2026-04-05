import { NextResponse } from "next/server";
import type { InviteDoc } from "@/lib/inviteTypes";
import { inviteSlugValidationMessage, normalizeInviteSlug } from "@/lib/inviteSlug";
import { defaultInviteListTitle } from "@/lib/inviteUtils";
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
  const body = (await req.json()) as { doc?: InviteDoc; published?: boolean; title?: string };
  if (!body.doc || typeof body.doc !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const doc = body.doc;
  const paramSlug = slug;
  const desiredSlug = normalizeInviteSlug(doc.slug);
  const slugMsg = inviteSlugValidationMessage(desiredSlug);
  if (slugMsg) {
    return NextResponse.json({ error: slugMsg }, { status: 400 });
  }

  const published = Boolean(body.published);
  const derived = defaultInviteListTitle({ ...doc, slug: desiredSlug });
  const title =
    typeof body.title === "string" && body.title.trim().length > 0 ? body.title.trim() : derived;

  const docToSave: InviteDoc = { ...doc, slug: desiredSlug };

  try {
    const existingParam = await prisma.invitation.findUnique({ where: { slug: paramSlug } });

    if (!existingParam) {
      const taken = await prisma.invitation.findUnique({ where: { slug: desiredSlug } });
      if (taken) {
        return NextResponse.json({ error: "Этот адрес уже занят. Выберите другой." }, { status: 409 });
      }
      const row = await prisma.invitation.create({
        data: {
          slug: desiredSlug,
          data: docToSave as object,
          published,
          title: title || desiredSlug,
        },
      });
      return NextResponse.json({
        ok: true,
        invitation: { slug: row.slug, published: row.published, title: row.title },
      });
    }

    if (paramSlug === desiredSlug) {
      const row = await prisma.invitation.update({
        where: { slug: paramSlug },
        data: {
          data: docToSave as object,
          published,
          title: title || desiredSlug,
        },
      });
      return NextResponse.json({
        ok: true,
        invitation: { slug: row.slug, published: row.published, title: row.title },
      });
    }

    const taken = await prisma.invitation.findUnique({ where: { slug: desiredSlug } });
    if (taken) {
      return NextResponse.json({ error: "Этот адрес уже занят. Выберите другой." }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.guestResponse.updateMany({
        where: { invitationSlug: paramSlug },
        data: { invitationSlug: desiredSlug },
      }),
      prisma.invitation.update({
        where: { slug: paramSlug },
        data: {
          slug: desiredSlug,
          data: docToSave as object,
          published,
          title: title || desiredSlug,
        },
      }),
    ]);

    const row = await prisma.invitation.findUnique({ where: { slug: desiredSlug } });
    if (!row) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    return NextResponse.json({
      ok: true,
      invitation: { slug: row.slug, published: row.published, title: row.title },
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Этот адрес уже занят." }, { status: 409 });
    }
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
