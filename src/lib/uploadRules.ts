export const UPLOAD_MAX_SIZE = 80 * 1024 * 1024; // 80 MB

/** Прокси через Vercel/Next (POST /api/upload): без CORS в браузере; лимит тела на Vercel ~4.5 MB. */
export const UPLOAD_PROXY_MAX_BYTES = 4 * 1024 * 1024;

export const UPLOAD_ALLOWED: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "audio/mpeg": [".mp3"],
  "audio/mp4": [".m4a"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
};

export function safeUploadFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

export function validateUploadFile(file: { name: string; type: string; size: number }): { ok: true } | { ok: false; error: string } {
  if (file.size > UPLOAD_MAX_SIZE) {
    return { ok: false, error: "Файл слишком большой" };
  }
  const type = file.type || "application/octet-stream";
  const allowedExts = UPLOAD_ALLOWED[type];
  if (!allowedExts) {
    return { ok: false, error: "Тип файла не разрешён" };
  }
  const ext = safeUploadFileName(file.name).match(/\.[^.]+$/)?.[0]?.toLowerCase() || "";
  if (ext && !allowedExts.includes(ext)) {
    return { ok: false, error: "Расширение не совпадает с типом" };
  }
  return { ok: true };
}
