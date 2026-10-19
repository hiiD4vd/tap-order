# 🚀 PANDUAN DEPLOYMENT KE VPS (TAP-ORDER SAAS)

Panduan ini menjelaskan cara mempublikasikan (deploy) **Tap-Order** ke VPS Linux (Ubuntu 22.04 / 24.04) dengan biaya sangat terjangkau (Rp 50.000 - Rp 80.000/bulan) dan mendapatkan sertifikat SSL HTTPS otomatis gratis seumur hidup.

---

## 1. Pilihan Provider VPS Murah & Kencang
Pilih salah satu penyedia VPS terdekat (lokasi server Jakarta/Singapura):
- **DomaiNesia / IDCloudHost / Biznet Gio** (Server Indonesia, latency 5-15ms)
- **Hetzner Cloud** (Spek tinggi, termurah di dunia, ~€4/bln)
- **DigitalOcean / Vultr / Linode** (US$ 4 - 6/bulan)

**Spesifikasi Minimum:**
- 1 vCPU
- 1 GB RAM (Disarankan buat Swap 1 GB - 2 GB)
- 20 GB NVMe SSD Disk
- OS: Ubuntu 22.04 LTS atau Ubuntu 24.04 LTS

---

## 2. Persiapan Server VPS Baru

### Step 2.1 — Login SSH ke VPS
```bash
ssh root@<IP_VPS_ANDA>
```

### Step 2.2 — Update Sistem & Pasang Docker
```bash
# Update repository
apt update && apt upgrade -y

# Pasang Docker & Docker Compose Plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verifikasi instalasi
docker --version
docker compose version
```

### Step 2.3 — Tambah Swap Memory 2GB (Penting untuk kestabilan)
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 3. Konfigurasi DNS Domain

Arahkan domain Anda (misal di Cloudflare, Namecheap, atau Niagahoster) ke IP VPS:

| Tipe | Nama Record | Target / Value | TTL | Proxy Status |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (root) | `<IP_VPS_ANDA>` | Auto | DNS Only (Gray Cloud) jika pakai Caddy |
| **A** | `*` (wildcard) | `<IP_VPS_ANDA>` | Auto | DNS Only |

---

## 4. Unggah File Proyek ke Server

Dari laptop/komputer lokal Anda, salin folder proyek ke VPS:

```bash
# Opsi A: Menggunakan Git (Direkomendasikan)
# Di VPS:
mkdir -p /opt/tap-order && cd /opt/tap-order
git clone <URL_REPO_GITHUB_ANDA> .

# Opsi B: Menggunakan SCP/Rsync langsung dari laptop
scp -r "D:\daud\projek bisnis\Bismillah\*" root@<IP_VPS_ANDA>:/opt/tap-order/
```

---

## 5. Konfigurasi Domain di Caddyfile

Buka file `Caddyfile` di `/opt/tap-order/Caddyfile`:

```bash
nano /opt/tap-order/Caddyfile
```

Ubah menjadi nama domain Anda:
```caddy
taporder.id, www.taporder.id {
    reverse_proxy tap-order:3000
}
```
*(Caddy secara otomatis akan meminta dan memperbarui sertifikat HTTPS Let's Encrypt tanpa Anda perlu repot install certbot)*

---

## 6. Jalankan Server dengan Docker Compose

```bash
cd /opt/tap-order

# Build image dan jalankan di background
docker compose up -d --build
```

Cek status container:
```bash
docker compose ps
docker compose logs -f tap-order
```

Selesai! Buka `https://taporder.id` di browser Anda. Aplikasi sudah aktif, aman dengan HTTPS, dan siap digunakan tamu & kasir kafe secara live.

---

## 7. Opsi Alternatif: Deploy Langsung Menggunakan PM2 (Non-Docker)

Jika Anda ingin menjalankan langsung di Node.js host tanpa Docker:

```bash
# 1. Pasang Node.js 20 & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

# 2. Build aplikasi
cd /opt/tap-order
npm install
npx prisma db push
npm run build

# 3. Jalankan dengan PM2
pm2 start npm --name "tap-order" -- start -- -p 3000
pm2 save
pm2 startup
```

---

## 8. Backup Otomatis Database SQLite Harian

Buat cron job sederhana untuk mencadangkan database setiap jam 03:00 pagi:

```bash
# Buka crontab
crontab -e

# Tambahkan baris ini di baris paling bawah:
0 3 * * * cp /opt/tap-order/data/prod.db /opt/tap-order/data/backup_$(date +\%F).db
```

Semua data transaksi, omset, dan kartu NFC tersimpan aman dan siap melayani ribuan pesanan harian.
