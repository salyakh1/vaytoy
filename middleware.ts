import { NextRequest, NextResponse } from "next/server";

const COOKIE = "vaytoy_session";

function base64url(bytes: ArrayBuffer) {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlToBytes(s: string) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return base64url(sig);
}

async function verifySession(token: string, secret: string) {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return false;
  const expected = await hmac(secret, payloadB64);
  if (expected !== sig) return false;
  try {
    const json = new TextDecoder().decode(base64urlToBytes(payloadB64));
    const payload = JSON.parse(json) as { exp: number; sub: string };
    return typeof payload?.exp === "number" && payload.exp > Date.now() && payload.sub === "admin";
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // allow public pages + login + API auth
  if (pathname.startsWith("/i/")) return NextResponse.next();
  if (pathname === "/login") return NextResponse.next();
  if (pathname.startsWith("/api/login") || pathname.startsWith("/api/logout")) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return NextResponse.next();

  // protect admin area
  if (pathname === "/" || pathname.startsWith("/invites")) {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    const token = req.cookies.get(COOKIE)?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    const ok = await verifySession(token, secret);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/invites/:path*"],
};

