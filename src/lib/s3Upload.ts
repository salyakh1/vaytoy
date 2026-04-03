import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function client(): S3Client | null {
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint || !process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY || !process.env.S3_BUCKET) {
    return null;
  }
  return new S3Client({
    region: process.env.S3_REGION || "ru-1",
    endpoint,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: true,
  });
}

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY &&
      process.env.S3_BUCKET &&
      process.env.S3_PUBLIC_BASE_URL,
  );
}

/** Загрузка файла; возвращает публичный URL. */
export async function uploadPublicObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const s3 = client();
  const bucket = process.env.S3_BUCKET;
  const base = process.env.S3_PUBLIC_BASE_URL;
  if (!s3 || !bucket || !base) {
    throw new Error("S3 не настроен (см. .env.example)");
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  const cleanBase = base.replace(/\/$/, "");
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `${cleanBase}/${path}`;
}
