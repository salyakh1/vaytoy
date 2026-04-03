import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTokenFromCookies, verifyAdminSession } from "@/lib/session";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const secret = process.env.AUTH_SECRET;
  const token = await getSessionTokenFromCookies();
  if (!secret || !token || !(await verifyAdminSession(token, secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ responses: [] }, { status: 503 });
  }

  const { slug } = await ctx.params;

  try {
    const rows = await prisma.guestResponse.findMany({
      where: { invitationSlug: slug },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ responses: rows });
  } catch {
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
