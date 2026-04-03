# vaytoy

Конструктор приглашений (Next.js + Prisma + PostgreSQL).

## База данных — Timeweb Cloud

В **`.env`** одна переменная **`DATABASE_URL`** — строка из панели Timeweb («Подключение»), с SSL:

```env
DATABASE_URL="postgresql://USER:PASS@HOST:5432/default_db?sslmode=verify-full&sslrootcert=prisma/timeweb-ca.crt"
```

На панели кластера: **публичный IP**, файрвол **входящий TCP 5432**, группа правил **привязана к БД**.

### Локально

```bash
npm install
npm run db:push    # схема в облако
npm run dev
```

Вход в конструктор: **`/login`** (пароль из `ADMIN_PASSWORD`).

### Vercel (сайт в интернете)

В [Vercel](https://vercel.com) → Environment Variables → **`DATABASE_URL`** = та же строка, что в `.env` (Timeweb), плюс `AUTH_SECRET`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, при необходимости `S3_*`.

## Опционально: Postgres только на ПК (Docker)

Если с твоей сети **не открывается** Timeweb (`P1001`), можно поднять локальную БД: установи [Docker Desktop](https://www.docker.com/products/docker-desktop/), затем `npm run db:up` и в `.env` временно:

`DATABASE_URL="postgresql://vaytoy:vaytoy@127.0.0.1:5433/vaytoy"`

Файл **`docker-compose.yml`** уже в проекте. Для продакшена на Vercel всегда используй **облачную** строку Timeweb.

## S3 (медиа)

Заполни `S3_*` и `S3_PUBLIC_BASE_URL` в `.env` / Vercel.
