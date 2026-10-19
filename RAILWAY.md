# Deploy ke Railway

Konfigurasi di repo sudah siap: `railway.json`, `Dockerfile`, `.dockerignore`, `pnpm-lock.yaml`.

## Ringkasan arsitektur di Railway

```
[Service: web]  ──DATABASE_URL──>  [Service: Postgres]
   Next.js                            postgres:16
   port $PORT (otomatis)
   healthcheck /api/health
```

## Langkah 1 — Push kode ke GitHub

Railway deploy dari repo. Project ini belum punya git.

```bash
cd "D:/daud/projek bisnis/Bismillah"
git init
git add .
git commit -m "feat: PostgreSQL + Railway deploy config"
```

Pastikan `.env` TIDAK ikut ter-commit (sudah ada di `.gitignore`).

Buat repo kosong di GitHub, lalu:

```bash
git remote add origin https://github.com/<user>/<repo>.git
git branch -M main
git push -u origin main
```

## Langkah 2 — Buat project Railway

1. Buka https://railway.app/new
2. **Deploy from GitHub repo** → pilih repo tadi
3. Railway otomatis baca `railway.json` dan memakai Nixpacks

## Langkah 3 — Tambah database PostgreSQL

1. Dalam project yang sama: **+ New** → **Database** → **Add PostgreSQL**
2. Railway membuat service `Postgres` dengan volume persisten

## Langkah 4 — Sambungkan database ke service web

Di service **web** → tab **Variables** → **+ New Variable** → **Add Reference**:

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

Jangan copy-paste connection string manual. Reference otomatis ikut kalau password DB berubah.

## Langkah 5 — Set SESSION_SECRET

Di service **web** → **Variables** → **+ New Variable**:

```
SESSION_SECRET = <48 byte acak>
```

Generate:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

App **menolak start** kalau `SESSION_SECRET` kosong atau < 32 karakter. Itu disengaja.

## Langkah 6 — Generate domain publik

Service **web** → **Settings** → **Networking** → **Generate Domain**.

Catat URL-nya, misal `tap-order-production.up.railway.app`.

QR meja memakai `window.location.origin`, jadi QR otomatis menunjuk domain Railway tanpa perlu env tambahan.

## Langkah 7 — Deploy

Klik **Deploy**, atau push ke `main`. Urutan yang dijalankan Railway:

1. `pnpm install --frozen-lockfile`
2. `pnpm prisma generate`
3. `pnpm build`
4. `pnpm prisma migrate deploy`  ← preDeployCommand
5. `pnpm start` (Next.js baca `$PORT`)

Healthcheck `/api/health` harus balas `200` dalam 100 detik, kalau tidak deploy dianggap gagal dan diulang maksimal 5x.

## Langkah 8 — Verifikasi setelah deploy

```bash
curl https://<domain-railway>/api/health
# {"ok":true,"database":"up","latencyMs":12,...}
```

Lalu buka `https://<domain>/register` dan daftarkan outlet pertama.

## Yang TIDAK boleh dilakukan di produksi

**Jangan jalankan `pnpm db:seed`.** Script itu `deleteMany` seluruh tabel. Sudah ada guard: menolak jalan kalau `NODE_ENV=production` tanpa `FORCE_SEED=1`.

**Jangan jalankan `prisma db push`.** Selalu `prisma migrate deploy` supaya schema versioned.

## Kalau mau pakai Dockerfile, bukan Nixpacks

`railway.json` sekarang memaksa `"builder": "NIXPACKS"`. Untuk memakai Dockerfile:

```json
"build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" }
```

Dockerfile sudah pakai pnpm + `prisma migrate deploy` saat start.

## Batasan yang perlu diketahui

| Hal | Status |
|---|---|
| Replica | **1**. Rate limit masih in-memory; >1 replica butuh Redis/Upstash |
| Backup otomatis | Belum ada. Railway punya backup harian di plan berbayar; atau jadwalkan `pnpm db:backup` |
| Migrasi data lokal | Data di PostgreSQL lokal TIDAK ikut otomatis. Lihat bagian di bawah |

## Pindahkan data lokal ke Railway (kalau perlu)

```bash
# 1. Ambil URL publik Postgres Railway (Settings → Networking → TCP Proxy)
export RAILWAY_DB="postgresql://postgres:<pass>@<host>:<port>/railway"

# 2. Dump dari lokal
pg_dump "postgresql://taporder:<pass>@localhost:5433/taporder" --no-owner --no-acl -f dump.sql

# 3. Restore ke Railway
psql "$RAILWAY_DB" -f dump.sql
```

Restore dilakukan **setelah** `prisma migrate deploy` sudah membuat tabel di Railway. Kalau dump berisi `CREATE TABLE`, pakai `--data-only` supaya tidak bentrok.

## Biaya

Railway bukan free tier permanen. Perkiraan minimum: web service kecil + Postgres kecil ≈ **$5/bulan** (trial $5 credit sekali). Cek https://railway.app/pricing untuk angka terkini.
