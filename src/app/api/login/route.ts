import { NextResponse } from "next/server";
import { mintAdminSession, SESSION_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | { email?: string; password?: string };

  const password = body?.password ?? "";
  const adminPass = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.AUTH_SECRET ?? "";

  if (!adminPass || !secret) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (password !== adminPass) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = await mintAdminSession(secret, 7 * 24 * 60 * 60 * 1000);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}

