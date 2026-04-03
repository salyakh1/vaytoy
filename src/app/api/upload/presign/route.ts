import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSessionTokenFromCookies, verifyAdminSession } from "@/lib/session";
import { getPresignedPutUrl, isS3Configured, publicUrlForS3Key } from "@/lib/s3Upload";
import { safeUploadFileName, validateUploadFile } from "@/lib/uploadRules";

/**
 * Возвращает presigned PUT URL для загрузки файла напрямую в S3.
 * На Vercel лимит тела запроса к Serverless ~4.5 MB; через этот путь файл не проходит через Vercel.
 */
export async function POST(req: Request) {
  const secret = process.env.AUTH_SECRET;
  const token = await getSessionTokenFromCookies();
  if (!secret || !token || !(await verifyAdminSession(token, secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json({ error: "S3 не настроен" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const prefix = typeof (body as { prefix?: unknown }).prefix === "string" ? (body as { prefix: string }).prefix : "uploads";
  const filename = typeof (body as { filename?: unknown }).filename === "string" ? (body as { filename: string }).filename : "";
  const contentType =
    typeof (body as { contentType?: unknown }).contentType === "string"
      ? (body as { contentType: string }).contentType
      : "application/octet-stream";
  const size = typeof (body as { size?: unknown }).size === "number" ? (body as { size: number }).size : -1;

  if (!filename || size < 0) {
    return NextResponse.json({ error: "Укажите filename и size" }, { status: 400 });
  }

  const v = validateUploadFile({ name: filename, type: contentType, size });
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }

  const id = randomBytes(8).toString("hex");
  const key = `vaytoy/${prefix.replace(/[^a-zA-Z0-9/_-]/g, "")}/${id}-${safeUploadFileName(filename)}`;

  try {
    const putUrl = await getPresignedPutUrl(key, contentType);
    const publicUrl = publicUrlForS3Key(key);
    return NextResponse.json({ putUrl, publicUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Не удалось выдать ссылку на загрузку" }, { status: 500 });
  }
}
