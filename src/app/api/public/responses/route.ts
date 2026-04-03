import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TYPES = new Set(["rsvp", "message", "survey", "wish"]);

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Сервис недоступен" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as null | {
    slug?: string;
    type?: string;
    payload?: unknown;
  };

  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const type = typeof body?.type === "string" ? body.type.trim() : "";
  const payload = body?.payload;

  if (!slug || !type || !TYPES.has(type) || payload === undefined) {
    return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
  }

  if (type === "wish") {
    const p = payload as { name?: unknown; text?: unknown };
    const name = typeof p.name === "string" ? p.name.trim() : "";
    const text = typeof p.text === "string" ? p.text.trim() : "";
    if (!name || !text || name.length > 120 || text.length > 4000) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }
  }

  try {
    const inv = await prisma.invitation.findUnique({ where: { slug } });
    if (!inv?.published) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    await prisma.guestResponse.create({
      data: {
        invitationSlug: slug,
        type,
        payload: payload as object,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}
