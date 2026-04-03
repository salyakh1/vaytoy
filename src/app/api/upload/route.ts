import { NextResponse } from "next/server";
import { getSessionTokenFromCookies, verifyAdminSession } from "@/lib/session";
import { uploadPublicObject, isS3Configured } from "@/lib/s3Upload";
import { randomBytes } from "node:crypto";

const MAX_SIZE = 80 * 1024 * 1024; // 80 MB

const ALLOWED: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "audio/mpeg": [".mp3"],
  "audio/mp4": [".m4a"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
};

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

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

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Файл слишком большой" }, { status: 400 });
  }

  const type = file.type || "application/octet-stream";
  const allowedExts = ALLOWED[type];
  if (!allowedExts) {
    return NextResponse.json({ error: "Тип файла не разрешён" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = safeName(file.name).match(/\.[^.]+$/)?.[0]?.toLowerCase() || "";
  if (ext && !allowedExts.includes(ext)) {
    return NextResponse.json({ error: "Расширение не совпадает с типом" }, { status: 400 });
  }

  const id = randomBytes(8).toString("hex");
  const key = `vaytoy/${prefix.replace(/[^a-zA-Z0-9/_-]/g, "")}/${id}-${safeName(file.name)}`;

  try {
    const url = await uploadPublicObject(key, buf, type);
    return NextResponse.json({ url, key });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка загрузки в S3" }, { status: 500 });
  }
}
