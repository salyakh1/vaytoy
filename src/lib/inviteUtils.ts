import type { InviteDoc } from "./inviteTypes";

export function formatCountdown(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return { days, hours, mins, secs };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toIcsUtc(dt: Date) {
  return (
    dt.getUTCFullYear() +
    pad2(dt.getUTCMonth() + 1) +
    pad2(dt.getUTCDate()) +
    "T" +
    pad2(dt.getUTCHours()) +
    pad2(dt.getUTCMinutes()) +
    pad2(dt.getUTCSeconds()) +
    "Z"
  );
}

export function buildWeddingIcs(doc: InviteDoc) {
  const names = doc.blocks.find((b) => b.kind === "names" && b.enabled);
  const countdown = doc.blocks.find((b) => b.kind === "countdown" && b.enabled);
  const map = doc.blocks.find((b) => b.kind === "map" && b.enabled);

  const title =
    names && "bride" in names && "groom" in names ? `Свадьба: ${names.bride} & ${names.groom}` : "Событие";

  const start = countdown && "targetIso" in countdown && countdown.targetIso ? new Date(countdown.targetIso) : null;
  const end = start ? new Date(start.getTime() + 4 * 60 * 60 * 1000) : null;

  const location = map && "address" in map ? map.address : "";
  const uid = `${doc.slug}-${Date.now()}@vaytoy`;
  const dtStamp = toIcsUtc(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//vaytoy//invite//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    start ? `DTSTART:${toIcsUtc(start)}` : "",
    end ? `DTEND:${toIcsUtc(end)}` : "",
    `SUMMARY:${escapeIcsText(title)}`,
    location ? `LOCATION:${escapeIcsText(location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

function escapeIcsText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** Название в списке приглашений по умолчанию (если не задано своё имя в редакторе). */
export function defaultInviteListTitle(doc: InviteDoc): string {
  const names = doc.blocks.find((b) => b.kind === "names");
  if (names && "bride" in names && "groom" in names) {
    return `${names.bride} & ${names.groom}`;
  }
  return doc.slug;
}

