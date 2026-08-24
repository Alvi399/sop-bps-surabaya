# 🌐 Panduan Hosting E-SOPRA di Hostinger (Tanpa Fitur Node.js)

Panduan ini khusus untuk paket **Hostinger Shared Hosting biasa (Single / Premium Web Hosting)** yang **TIDAK memiliki fitur/terminal Node.js**. Hostinger jenis ini hanya mendukung **HTML, JS, PHP, dan MySQL Database**.

---

## 📌 Pilihan Solusi Terbaik & Paling Mudah

### 💡 SOLUSI A: Metode Hybrid (Paling Direkomendasikan & 100% Gratis)
- **Frontend React (`dist/`)**: Di-upload ke **Hostinger `public_html`** (Domain utama Anda aktif di sini).
- **Backend Node.js Express**: Di-deploy **Gratis di Render.com** (atau Railway.app).
- **Database MySQL**: Menggunakan **MySQL Database Hostinger** bawaan.

> **Keuntungan Solusi A**:
> 1. Tetap bisa pakai paket Hostinger murah tanpa upgrade.
> 2. Domain & Tampilan Web tetap 100% tampil di alamat web Hostinger Anda (misal `sop-bps-surabaya.com`).
> 3. Backend Node.js & PDF Generator tetap berjalan cepat dan stabil.

---

## 🚀 Langkah-Langkah Solusi A (Hostinger Frontend + Render Backend)

### LAKUKAN HANYA SEKALI:

#### 1. Upload Backend ke Render.com (Gratis)
1. Buat akun gratis di [Render.com](https://render.com).
2. Klik **New +** ➔ Pilih **Web Service**.
3. Hubungkan ke Repository GitHub proyek ini (atau upload folder `backend`).
4. Isi data berikut:
   - **Name**: `sop-bps-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node backend/server.js`
5. Tambahkan **Environment Variables** di Render:
   - `PORT`: `8000`
   - `DB_HOST`: IP Database Hostinger (atau `sqlXXX.hostinger.com`)
   - `DB_USER`: `u123456789_user`
   - `DB_PASS`: `password_db_anda`
   - `DB_NAME`: `u123456789_dbname`
   - `JWT_SECRET`: `super-secret-key-sop-bps`
6. Klik **Create Web Service**. Anda akan mendapatkan URL Backend (contoh: `https://sop-bps-backend.onrender.com`).

---

#### 2. Buat Database & Izinkan Remote MySQL di Hostinger
1. Login ke **hPanel Hostinger** ➔ **MySQL Databases**.
2. Buat database & user MySQL baru.
3. Masuk ke menu **Remote MySQL** di Hostinger:
   - Masukkan IP `%` (Artinya mengizinkan koneksi dari Render/Backend).
   - Klik **Create**.

---

#### 3. Hubungkan Frontend ke URL Backend Render
1. Di komputer Anda, buka file `src/lib/api.ts` (atau `vite.config.ts`).
2. Ganti URL API ke URL Render Anda:
   ```ts
   const API_URL = "https://sop-bps-backend.onrender.com/api";
   ```
3. Build Frontend React:
   ```bash
   npm run build
   ```

---

#### 4. Upload Hasil Build (`dist/`) ke Hostinger `public_html`
1. Buka **File Manager** di **hPanel Hostinger**.
2. Masuk ke folder `public_html`.
3. Upload seluruh file dari dalam folder **`dist/`** lokal Anda (`index.html`, folder `assets/`, dll).
4. Buat file **`.htaccess`** di dalam `public_html` Hostinger agar routing SPA (Single Page Application) React berjalan lancar tanpa error 404:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 🎯 SELESAI!
Kini website E-SOPRA Anda sudah **Online 100%** di domain Hostinger Anda dengan database MySQL yang tersimpan aman di Hostinger!

---

## ❓ FAQ & Troubleshooting
- **Apakah .htaccess wajib?**  
  *Ya! File `.htaccess` wajib dibuat di Hostinger agar saat halaman direfresh (misal di `/management` atau `/edit/123`), web tidak menampilkan `404 Not Found`.*
- **Bagaimana cara mengubah alamat backend jika ganti domain?**  
  *Cukup ganti variabel `VITE_API_URL` saat `npm run build` dan upload ulang folder `dist/` ke Hostinger.*
