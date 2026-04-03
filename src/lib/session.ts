export const SESSION_COOKIE = "vaytoy_session";

function base64urlFromBytes(bytes: Uint8Array) {
  const bin = String.fromCharCode(...bytes);
  const b64 = Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlFromString(s: string) {
  return base64urlFromBytes(Buffer.from(s, "utf8"));
}

async function hmac(secret: string, data: string) {
  const crypto = await import("node:crypto");
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return base64urlFromBytes(sig);
}

export async function mintAdminSession(secret: string, ttlMs: number) {
  const payload = JSON.stringify({ sub: "admin", exp: Date.now() + ttlMs });
  const payloadB64 = base64urlFromString(payload);
  const sig = await hmac(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

/** Проверка токена сессии (Node). Должна совпадать с логикой mintAdminSession. */
export async function verifyAdminSession(token: string, secret: string): Promise<boolean> {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return false;
  const expected = await hmac(secret, payloadB64);
  if (expected !== sig) return false;
  try {
    const b64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((payloadB64.length + 3) % 4);
    const json = Buffer.from(b64, "base64").toString("utf8");
    const payload = JSON.parse(json) as { exp: number; sub: string };
    return payload.sub === "admin" && typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function getSessionTokenFromCookies(): Promise<string | undefined> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

