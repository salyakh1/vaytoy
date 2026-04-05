/** Сегмент URL для /i/[slug] и /invites/[slug]/edit — латиница, цифры, дефис. */

const RESERVED = new Set([
  "api",
  "login",
  "logout",
  "invites",
  "i",
  "_next",
  "favicon",
  "public",
  "static",
]);

/** Простая транслитерация кириллицы → латиница для slug. */
const CYR_TO_LAT: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function transliterateChar(ch: string): string {
  const lower = ch.toLowerCase();
  const t = CYR_TO_LAT[lower];
  if (t !== undefined) return t;
  return ch;
}

/** Приводит строку к допустимому сегменту URL. */
export function normalizeInviteSlug(raw: string): string {
  let s = raw.trim().toLowerCase();
  let out = "";
  for (const ch of s) {
    if (/[a-z0-9-]/.test(ch)) {
      out += ch;
      continue;
    }
    if (/[а-яё]/i.test(ch)) {
      out += transliterateChar(ch);
      continue;
    }
    if (/\s|_/.test(ch) || ch === "&" || ch === "." || ch === ",") {
      out += "-";
    }
  }
  out = out.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return out;
}

export function isValidInviteSlug(s: string): boolean {
  if (s.length < 2 || s.length > 64) return false;
  if (RESERVED.has(s)) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

/** Для префикса S3 / черновых ссылок: предпочитаем валидный slug из поля, иначе текущий ключ в БД. */
export function effectiveSlugForStorage(draftSlug: string, apiSlug: string): string {
  const n = normalizeInviteSlug(draftSlug);
  return isValidInviteSlug(n) ? n : apiSlug;
}

export function inviteSlugValidationMessage(s: string): string | null {
  if (s.length < 2 || s.length > 64) {
    return "Адрес в ссылке: от 2 до 64 символов.";
  }
  if (RESERVED.has(s)) {
    return "Этот адрес зарезервирован, выберите другой.";
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) {
    return "Только латиница, цифры и дефис (например: maga-yakor).";
  }
  return null;
}

/** Путь редактора: demo-1 → /invites/1/edit, иначе /invites/{slug}/edit */
export function editPathForInviteSlug(slug: string): string {
  const m = /^demo-(\d+)$/.exec(slug);
  if (m) return `/invites/${m[1]}/edit`;
  return `/invites/${encodeURIComponent(slug)}/edit`;
}

/** Черновик slug из названия приглашения. */
export function slugHintFromTitle(title: string): string {
  return normalizeInviteSlug(title);
}
