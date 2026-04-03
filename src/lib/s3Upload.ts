import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Обязательные ключи (S3_REGION по умолчанию ru-1). */
export const S3_REQUIRED_ENV_KEYS = [
  "S3_ENDPOINT",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "S3_BUCKET",
  "S3_PUBLIC_BASE_URL",
] as const;

export const S3_VERCEL_HINT =
  "Vercel → Project → Settings → Environment Variables: добавьте все S3_* для Production и Preview, затем Redeploy. Локальный .env на Vercel не подхватывается.";

function envTrim(key: string): string | undefined {
  const v = process.env[key];
  if (v === undefined) return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

/** Какие переменные пустые или только пробелы (удобно для диагностики на проде). */
export function getMissingS3EnvKeys(): string[] {
  const missing: string[] = [];
  for (const k of S3_REQUIRED_ENV_KEYS) {
    if (!envTrim(k)) missing.push(k);
  }
  return missing;
}

export function isS3Configured(): boolean {
  return getMissingS3EnvKeys().length === 0;
}

function client(): S3Client | null {
  const endpoint = envTrim("S3_ENDPOINT");
  if (!endpoint || !envTrim("S3_ACCESS_KEY") || !envTrim("S3_SECRET_KEY") || !envTrim("S3_BUCKET")) {
    return null;
  }
  return new S3Client({
    region: envTrim("S3_REGION") || "ru-1",
    endpoint,
    credentials: {
      accessKeyId: envTrim("S3_ACCESS_KEY")!,
      secretAccessKey: envTrim("S3_SECRET_KEY")!,
    },
    forcePathStyle: true,
  });
}

/** Загрузка файла; возвращает публичный URL. */
export async function uploadPublicObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const s3 = client();
  const bucket = envTrim("S3_BUCKET");
  const base = envTrim("S3_PUBLIC_BASE_URL");
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

/** Прямая загрузка из браузера (обходит лимит тела запроса на Vercel ~4.5 MB). */
export async function getPresignedPutUrl(key: string, contentType: string, expiresSec = 900): Promise<string> {
  const s3 = client();
  const bucket = envTrim("S3_BUCKET");
  if (!s3 || !bucket) {
    throw new Error("S3 не настроен (см. .env.example)");
  }
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: expiresSec });
}

export function publicUrlForS3Key(key: string): string {
  const base = envTrim("S3_PUBLIC_BASE_URL");
  if (!base) {
    throw new Error("S3_PUBLIC_BASE_URL не задан");
  }
  const cleanBase = base.replace(/\/$/, "");
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `${cleanBase}/${path}`;
}
