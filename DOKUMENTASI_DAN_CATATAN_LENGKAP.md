# 📚 Dokumentasi Lengkap & Riwayat Catatan Sistem SOP BPS Kota Surabaya (E-SOPRA)

Dokumen ini dibuat agar semua riwayat perbaikan, panduan build, upload ke Hostinger, akun login, dan troubleshooting tersimpan secara permanen di laptop Anda dan tidak hilang meskipun riwayat chat ter-reset.

---

## 🔑 1. Akun Login & Hak Akses (Credentials)

Password default untuk semua akun: **`Sby123456`**

| No | Role / Hak Akses | Nama Lengkap | Email / Username | Seksi / Tim |
|---|---|---|---|---|
| 1 | **Super Admin** | Super Admin BPS | `admin@bps-surabaya.go.id` | Sistem Informasi |
| 2 | **Admin (Alternatif)** | Muhammad Alvi Kirana Zulfan Nazal | `alvikirana138@bps-surabaya.go.id` | Humas, Pojok Statistik dan PSS |
| 3 | **Kepala Bagian** | Kepala Bagian | `kepala@bps-surabaya.go.id` | Pimpinan |
| 4 | **Ketua Tim (Staff 1)** | Ketua Tim Umum | `tim_umum@bps-surabaya.go.id` | Umum |
| 5 | **Staf (Staff 2)** | Atha | `atha@bps-surabaya.go.id` | IPDS / Tim Terkait |

---

## 🛠️ 2. Riwayat Masalah & Perbaikan yang Sudah Diselesaikan

Berikut rangkuman semua kendala teknis yang berhasil diperbaiki:

1. **Format PDF & Flowchart BPS (Sesuai Standar)**
   - Header PDF dan tabel SOP telah disesuaikan dengan template resmi BPS Kota Surabaya.
   - Flowchart rendering menggunakan format simbol oval (Mulai/Selesai), diamond (Keputusan), kotak (Proses), dan garis penghubung yang rapi.
   - Multi-page flowchart & auto-wrap teks mutu baku sudah aktif.

2. **Error Hostinger (Static Hosting Fallback)**
   - Karena server Hostinger diatur sebagai *Static Hosting* (tanpa Node.js backend aktif), request API sebelumnya menghasilkan HTML 404/200 dan menyebabkan crash `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.
   - Sudah ditambahkan proteksi fallback cerdas di semua halaman (`Index.tsx`, `Header.tsx`, `Sidebar.tsx`, `ActivityList.tsx`, `SOPChart.tsx`, `StatsCards.tsx`, `Management.tsx`, `CreateSOP.tsx`, `EditSOP.tsx`).
   - Jika API backend tidak ada, aplikasi otomatis beralih ke data mock lokal sehingga website tetap dapat dijelajahi, flow demonstrasi berjalan lancar, dan tidak terjadi layar putih/blank/crash.

3. **Error Routing 404 pada Sub-Halaman (`/login`, `/management`, dll)**
   - File `.htaccess` telah ditambahkan ke dalam folder `public/` dan dist build sehingga Apache Hostinger selalu mengarahkan route ke `index.html` (SPA routing).

4. **Sidebar & Profil Kosong**
   - Sebelumnya data user bergantung pada `/auth/me`. Kini otomatis mengambil data sesi aktif dari local storage (`AuthService.getCurrentUser()`) jika API me-return HTML.

5. **Filter Dashboard Default**
   - Filter tahun diubah ke `"all"` (Semua Tahun) agar ke-8 SOP default langsung muncul saat login pertama kali.

---

## 🚀 3. Panduan Build & Deploy ke Hostinger

Jika Anda membuat perubahan kode di kemudian hari, ikuti langkah berikut untuk membuat ZIP dan mengupload ke Hostinger:

### Langkah A — Build & Buat ZIP Baru di Komputer:
1. Buka Terminal di VS Code / PowerShell pada folder root proyek.
2. Build aplikasi & buat ZIP hosting secara otomatis:
   ```bash
   npm run build
   npm run package:hosting
   ```
   *(File ZIP akan otomatis dibuat di `update-sop-hosting.zip` pada root folder)*.

---

### Langkah B — Upload ke Hostinger File Manager:
1. Buka cPanel / File Manager Hostinger.
2. Masuk ke direktori: **`public_html`**.
3. Hapus folder `assets` dan file `index.html` lama (agar tidak tertimpa cache).
4. Upload file **`update-sop-hosting.zip`**.
5. Klik kanan pada file zip $\rightarrow$ pilih **Extract** $\rightarrow$ masukkan tanda titik `.` sebagai tujuan ekstrak $\rightarrow$ Klik **Extract**.
6. Hapus file zip yang baru di-upload tersebut agar hemat ruang.
7. Buka website **https://e-sopra.bpskotasurabaya.com/**.
8. Tekan **`Ctrl + F5`** (Hard Refresh) pada browser agar browser memuat aset JavaScript/CSS terbaru.

---

## 📁 4. Struktur File Penting (Clean Monolith)

- `src/pages/`
  - `Index.tsx` : Dashboard utama statistik dan ringkasan SOP.
  - `Management.tsx` : Tabel kelola SOP, filter, approve, reject, delete.
  - `CreateSOP.tsx` : Form input SOP baru + Flowchart Editor & Export PDF.
  - `EditSOP.tsx` : Form edit SOP + Flowchart Editor.
  - `Login.tsx` : Halaman login terintegrasi role.
- `src/lib/`
  - `pdfGenerator.ts` : Engine pembuat file PDF standar BPS.
  - `mockData.ts` : Bank data SOP dan log aktivitas offline.
  - `auth.ts` : Layanan autentikasi & penyimpanan sesi login.
- `backend/`
  - `server.js` : Entry point server monolith Express.js.
  - `routes/` : REST API endpoints.
  - `models/` : Model data Sequelize/MySQL.
- `public/.htaccess` : Konfigurasi routing server Apache untuk SPA React.

