import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

export const maxDuration = 60;
import { getSessionTokenFromCookies, verifyAdminSession } from "@/lib/session";
import { uploadPublicObject, getMissingS3EnvKeys, isS3Configured, S3_VERCEL_HINT } from "@/lib/s3Upload";
import { safeUploadFileName, UPLOAD_PROXY_MAX_BYTES, validateUploadFile } from "@/lib/uploadRules";

/** Прокси-загрузка через Vercel (лимит тела ~4.5 MB). Для больших файлов — POST /api/upload/presign + PUT в S3 (нужен CORS на бакете). */
export async function POST(req: Request) {
  const secret = process.env.AUTH_SECRET;
  const token = await getSessionTokenFromCookies();
  if (!secret || !token || !(await verifyAdminSession(token, secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      {
        error: "S3 не настроен на сервере",
        missingEnv: getMissingS3EnvKeys(),
        hint: S3_VERCEL_HINT,
      },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const prefix = (form.get("prefix") as string) || "uploads";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Нет файла" }, { status: 400 });
  }

  if (file.size > UPLOAD_PROXY_MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Файл больше ${Math.floor(UPLOAD_PROXY_MAX_BYTES / (1024 * 1024))} MB — используйте прямую загрузку (presign) после настройки CORS на бакете S3.`,
      },
      { status: 413 },
    );
  }

  const v = validateUploadFile({ name: file.name, type: file.type || "application/octet-stream", size: file.size });
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const type = file.type || "application/octet-stream";

  const id = randomBytes(8).toString("hex");
  const key = `vaytoy/${prefix.replace(/[^a-zA-Z0-9/_-]/g, "")}/${id}-${safeUploadFileName(file.name)}`;

  try {
    const url = await uploadPublicObject(key, buf, type);
    return NextResponse.json({ url, key });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка загрузки в S3" }, { status: 500 });
  }
}
