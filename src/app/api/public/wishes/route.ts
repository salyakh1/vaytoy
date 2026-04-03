import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ wishes: [] }, { status: 503 });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
  }

  try {
    const inv = await prisma.invitation.findUnique({ where: { slug } });
    if (!inv?.published) {
      return NextResponse.json({ wishes: [] });
    }

    const rows = await prisma.guestResponse.findMany({
      where: { invitationSlug: slug, type: "wish" },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const wishes = rows.map((r) => {
      const p = r.payload as { name?: string; text?: string };
      return {
        id: r.id,
        name: typeof p.name === "string" ? p.name : "",
        text: typeof p.text === "string" ? p.text : "",
        createdAt: r.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ wishes });
  } catch {
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
