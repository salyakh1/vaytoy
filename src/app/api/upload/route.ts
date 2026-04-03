import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSessionTokenFromCookies, verifyAdminSession } from "@/lib/session";
import { uploadPublicObject, isS3Configured } from "@/lib/s3Upload";
import { safeUploadFileName, validateUploadFile } from "@/lib/uploadRules";

/** Прокси-загрузка через Vercel (лимит тела ~4.5 MB). Для больших файлов используйте POST /api/upload/presign. */
export async function POST(req: Request) {
  const secret = process.env.AUTH_SECRET;
  const token = await getSessionTokenFromCookies();
  if (!secret || !token || !(await verifyAdminSession(token, secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json({ error: "S3 не настроен" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const prefix = (form.get("prefix") as string) || "uploads";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Нет файла" }, { status: 400 });
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
