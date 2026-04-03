import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionTokenFromCookies, verifyAdminSession } from "@/lib/session";

async function requireAdmin() {
  const secret = process.env.AUTH_SECRET;
  const token = await getSessionTokenFromCookies();
  if (!secret || !token) return false;
  return verifyAdminSession(token, secret);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ invitations: [], dbError: true });
  }

  try {
    const rows = await prisma.invitation.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, slug: true, title: true, published: true, updatedAt: true },
    });
    return NextResponse.json({ invitations: rows });
  } catch {
    return NextResponse.json({ invitations: [], dbError: true });
  }
}
