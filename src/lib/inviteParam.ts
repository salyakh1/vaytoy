import type { InviteDoc } from "@/lib/inviteTypes";

/** Декодирование `?d=` из URL (как в редакторе). */
export function decodeInviteDocParam(d: string): InviteDoc | null {
  try {
    const json = decodeURIComponent(escape(atob(d)));
    return JSON.parse(json) as InviteDoc;
  } catch {
    return null;
  }
}
