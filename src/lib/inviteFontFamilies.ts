import type { FontFamily } from "./inviteTypes";

/** 10 романтических вариантов для приглашения (Google Fonts). */
export const INVITE_FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: "playfair", label: "Playfair Display — классика" },
  { value: "cormorant", label: "Cormorant Garamond — изящный" },
  { value: "greatVibes", label: "Great Vibes — каллиграфия" },
  { value: "parisienne", label: "Parisienne — французский акцент" },
  { value: "dancing", label: "Dancing Script — рукописный" },
  { value: "libreBaskerville", label: "Libre Baskerville — книжный" },
  { value: "lora", label: "Lora — мягкий романтичный" },
  { value: "cinzel", label: "Cinzel — торжественный" },
  { value: "spectral", label: "Spectral — современная антиква" },
  { value: "marckScript", label: "Marck Script — лёгкая роспись" },
];

const ALL_IDS = new Set(INVITE_FONT_OPTIONS.map((o) => o.value));

/** Старые сохранения до появления веб-шрифтов. */
const LEGACY_MAP: Record<string, FontFamily> = {
  ui: "lora",
  inter: "lora",
  serif: "libreBaskerville",
  georgia: "libreBaskerville",
  playfair: "playfair",
  cormorant: "cormorant",
};

export function normalizeInviteFontFamily(raw: unknown): FontFamily {
  const s = typeof raw === "string" ? raw : "";
  if (ALL_IDS.has(s as FontFamily)) return s as FontFamily;
  if (LEGACY_MAP[s]) return LEGACY_MAP[s];
  return "lora";
}

export function inviteFontClass(font: FontFamily): string {
  return `invite-font-${font}`;
}
