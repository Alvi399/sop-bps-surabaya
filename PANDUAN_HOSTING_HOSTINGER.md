# 🌐 Panduan Hosting E-SOPRA di Hostinger (Tanpa Fitur Node.js)

Panduan ini khusus untuk paket **Hostinger Shared Hosting biasa (Single / Premium Web Hosting)** yang **TIDAK memiliki fitur/terminal Node.js**. Hostinger jenis ini hanya mendukung **HTML, JS, PHP, dan MySQL Database**.

---

## 📌 Alternatif Platform Hosting Backend Node.js (Pilihan Selain Render.com)

Jika Anda tidak ingin menggunakan Render.com, berikut adalah alternatif platform cloud **Gratis & Terbaik** untuk menaruh Backend Node.js Express:

| Platform | Biaya | Kelebihan | Kemudahan |
|---|---|---|---|
| **1. Vercel** | 🟢 100% Gratis | Sangat Cepat, Serverless, Uptime 99.9% | ⭐⭐⭐⭐⭐ (Sangat Mudah) |
| **2. Koyeb** | 🟢 Free Tier Selamanya | Tanpa Cold-Start (Selalu Aktif), Cepat | ⭐⭐⭐⭐⭐ (Sangat Mudah) |
| **3. Railway.app** | 🟢 Gratis Credit / Bulan | 1-Click Deploy dari GitHub | ⭐⭐⭐⭐ (Mudah) |
| **4. Fly.io** | 🟢 Free Tier | Performa tinggi | ⭐⭐⭐ (Perlu CLI) |
| **5. Upgrade Hostinger VPS** | 🟡 ~$4/bulan | 100% Serba Hostinger (Node.js + MySQL + Nginx) | ⭐⭐⭐ (Semua dalam 1 tempat) |

---

## 🚀 Panduan Detail Pilihan Alternatif

### 🔷 Pilihan 1: Vercel (Paling Populer & Cepat)
1. Buat akun gratis di [Vercel.com](https://vercel.com).
2. Install Vercel CLI atau hubungkan akun GitHub Anda.
3. Import repository / folder `backend`.
4. Tambahkan Environment Variables di Dashboard Vercel:
   - `DB_HOST`: Host/IP Database Hostinger
   - `DB_USER`: Username Database Hostinger
   - `DB_PASS`: Password Database Hostinger
   - `DB_NAME`: Nama Database Hostinger
   - `JWT_SECRET`: Secret Key JWT
5. Klik **Deploy**. Vercel akan langsung memberikan URL API backend (misal: `https://sop-bps-backend.vercel.app/api`).

---

### 🔷 Pilihan 2: Koyeb (Tanpa Delay / Cold Start)
1. Buat akun gratis di [Koyeb.com](https://koyeb.com).
2. Klik **Create App** ➔ Pilih **GitHub** (atau Docker).
3. Hubungkan repository backend Node.js Anda.
4. Set Port: `8000`.
5. Masukkan Environment Variables MySQL Hostinger.
6. Klik **Deploy**. URL Backend siap digunakan (misal: `https://sop-bps-backend.koyeb.app/api`).

---

### 🔷 Pilihan 3: Railway.app (Simpel & Responsif)
1. Buat akun gratis di [Railway.app](https://railway.app).
2. Klik **New Project** ➔ **Deploy from GitHub repo**.
3. Tambahkan Environment Variables Database Hostinger di tab **Variables**.
4. Di tab **Settings** ➔ **Networking**, klik **Generate Domain**.
5. Gunakan URL yang dihasilkan (misal: `https://sop-bps-backend.up.railway.app/api`).

---

## 🏬 Pilihan 4: Upgrade ke Hostinger Node.js / VPS (100% Pakai Hostinger)

Jika Anda ingin **semuanya 100% berada di Hostinger** tanpa bantuan pihak ketiga (Render/Vercel/Koyeb):

1. Masuk ke **hPanel Hostinger**.
2. Upgrade paket dari Web Hosting biasa ke **Hostinger KVM VPS** atau **Business Web Hosting dengan Node.js**.
3. Di paket VPS / Node.js Hostinger, Anda bisa memasang Node.js Express & MySQL secara terintegrasi 100% di satu tempat.

---

## 📌 Kesimpulan Langkah Frontend di Hostinger

Manapun platform backend yang Anda pilih (Vercel, Koyeb, Railway, Render, atau Hostinger VPS):

1. **Frontend React (`dist/`)** tetap di-upload ke Hostinger `public_html`.
2. URL Backend di file `src/lib/api.ts` (atau `vite.config.ts`) cukup diarahkan ke URL Backend yang Anda pilih.
3. Website Anda aktif 100% di domain Hostinger!
