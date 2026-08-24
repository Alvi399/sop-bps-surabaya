# 📋 CATATAN TEKNIS & PANDUAN KELANJUTAN
> **Proyek**: Sistem Manajemen SOP — BPS Kota Surabaya  
> **Terakhir diperbarui**: 2026-08-24  
> **Arsitektur**: True Monolith (Frontend React + Backend Express dalam satu root)

---

## 🏗️ Arsitektur Proyek

```
sop-bps-surabaya/
├── backend/                  ← Express.js API Server
│   ├── config/
│   │   └── database.js       ← Koneksi Sequelize (MySQL)
│   ├── middleware/
│   │   └── auth.js           ← JWT Auth & RBAC Middleware
│   ├── models/
│   │   ├── index.js          ← Entry point + relasi antar model
│   │   ├── User.js           ← Model user
│   │   ├── SOPDocument.js    ← Model SOP
│   │   ├── SOPRevision.js    ← Model revisi SOP
│   │   └── ActivityLog.js    ← Model log aktivitas
│   ├── routes/
│   │   ├── auth.js           ← POST /api/auth/login, register, GET /api/auth/me
│   │   ├── sops.js           ← CRUD + approve/reject/request-revision SOP
│   │   ├── revisions.js      ← CRUD revisi
│   │   ├── users.js          ← CRUD user + avatar
│   │   └── activities.js     ← GET activity log
│   ├── uploads/              ← File SOP yang diupload
│   └── server.js             ← Entry point Express
├── src/                      ← React + TypeScript Frontend (Vite)
│   ├── pages/
│   │   ├── Index.tsx         ← Dashboard
│   │   ├── Management.tsx    ← Manajemen SOP (CRUD, approve, reject)
│   │   ├── Revision.tsx      ← Halaman revisi
│   │   ├── Login.tsx
│   │   └── UserManagement.tsx ← Manajemen user (Admin only)
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx
│   │   │   ├── SOPChart.tsx
│   │   │   └── ActivityList.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── lib/
│   │   ├── auth.ts           ← AuthService (login, logout, getToken)
│   │   ├── mockData.ts       ← Fallback data saat API tidak tersedia
│   │   └── api.ts            ← Axios wrapper ke backend
│   └── types/index.ts        ← Type definitions frontend
├── package.json              ← SATU package.json (monolith)
└── CATATAN_TEKNIS_DAN_KELANJUTAN.md ← File ini
```

---

## 👥 Role Pengguna & Hak Akses (RBAC)

| Role | Kode | Hak Akses |
|------|------|-----------|
| Administrator | `admin` | Full akses: CRUD semua, approve, reject, manage users |
| Kepala Bagian | `kepala_bagian` | Bisa approve/reject SOP, lihat semua |
| Staf | `staf` | Buat SOP (draft), edit SOP milik sendiri, request revisi ulang |

> **⚠️ PENTING**: Role divalidasi di backend melalui `requireRole(['admin', 'kepala_bagian'])` dari middleware `backend/middleware/auth.js`.

---

## 📊 Status SOP — Nilai yang Disepakati

### ⚠️ KONVENSI KRITIS — STATUS PAKAI BAHASA INDONESIA

Semua nilai status harus **konsisten** antara backend dan frontend:

| Status | Nilai String | Deskripsi |
|--------|-------------|-----------|
| Aktif | `"aktif"` | SOP sudah disetujui dan berlaku |
| Draft | `"draft"` | SOP baru dibuat, belum diajukan |
| Revisi | `"revisi"` | SOP perlu direvisi |
| Kedaluwarsa | `"kedaluwarsa"` | SOP sudah melewati expiry_date |
| Archived | `"archived"` | SOP diarsipkan |

**Approval Status:**

| Status | Nilai String | Deskripsi |
|--------|-------------|-----------|
| Menunggu | `"pending"` | Baru diajukan, menunggu review |
| Disetujui | `"approved"` | Sudah disetujui |
| Ditolak | `"rejected"` | Ditolak, perlu revisi |

> **⚠️ JANGAN PAKAI** `"active"` — ini menyebabkan badge/filter menjadi kosong/salah. Gunakan `"aktif"` selalu.

---

## 🔄 Alur Kerja SOP (Workflow)

```
[Staf membuat SOP]
       ↓
   status: "draft"
   approval_status: "pending"
       ↓
[Staf klik "Ajukan Persetujuan"]
   PUT /api/sops/:id/submit  ← (masih belum ada, lihat TODO)
       ↓
[Kepala Bagian/Admin review]
       ↓
  ┌────────────────┐
  │  SETUJUI       │──→  status: "aktif", approval_status: "approved"
  │  PUT /approve  │     version += 1 (hanya saat approve revisi)
  └────────────────┘
  ┌────────────────┐
  │  TOLAK         │──→  status: "draft", approval_status: "rejected"
  │  PUT /reject   │     reject_reason disimpan di review_notes
  └────────────────┘
       ↓ (jika ditolak)
[Staf perbaiki & ajukan ulang]
  PUT /api/sops/:id/request-revision  ← ✅ SUDAH ADA
  → status: "draft", approval_status: "pending"
  → Membuat SOPRevision baru dengan status "menunggu_persetujuan"
       ↓
[Siklus approval berulang]
```

---

## 🔐 Autentikasi

- **Library**: `jsonwebtoken` + `bcryptjs`
- **Token**: JWT, expired **8 jam** (satu sesi kerja) — disimpan di `localStorage`
- **Header**: `Authorization: Bearer <token>`
- **Payload JWT**: `{ id, email, role }`
- **Register**: `POST /api/auth/register` — **HANYA BISA DIAKSES OLEH ADMIN** (requires `Bearer token`)
- **Login**: `POST /api/auth/login` — Public, tidak butuh token
- **Me**: `GET /api/auth/me` — Requires token

---

## 🗄️ Database

- **ORM**: Sequelize v6
- **Database**: MySQL
- **Config**: `backend/config/database.js` → environment variables `.env`:
  ```env
  DB_HOST=localhost
  DB_PORT=3306
  DB_NAME=bps_sop
  DB_USER=root
  DB_PASSWORD=yourpassword
  JWT_SECRET=secret-key-sop-bps-surabaya
  JWT_EXPIRES_IN=8h
  PORT=3001
  ```
- **Sync**: `node backend/restore-database.js` — sinkronisasi tabel ke database

### Relasi Model (backend/models/index.js)

```
User --hasMany--> SOPDocument (created_by, updated_by, approved_by)
User --hasMany--> SOPRevision (revised_by, reviewed_by)
User --hasMany--> ActivityLog (user_id)
SOPDocument --hasMany--> SOPRevision (sop_id)
SOPDocument --hasMany--> ActivityLog (sop_id)
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/auth/login` | ❌ | Login user |
| POST | `/api/auth/register` | ✅ Admin only | Daftar user baru |
| GET | `/api/auth/me` | ✅ | Profil user login |

### SOP Documents
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/sops` | ✅ | List semua SOP |
| POST | `/api/sops` | ✅ | Buat SOP baru |
| GET | `/api/sops/:id` | ✅ | Detail SOP |
| PUT | `/api/sops/:id` | ✅ | Update SOP |
| DELETE | `/api/sops/:id` | ✅ | Hapus SOP |
| PUT | `/api/sops/:id/approve` | ✅ Admin/Kepala | Setujui SOP |
| PUT | `/api/sops/:id/reject` | ✅ Admin/Kepala | Tolak SOP |
| PUT | `/api/sops/:id/request-revision` | ✅ Owner/Admin | Ajukan ulang setelah reject |

### Users
| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/api/users` | ✅ Admin | List semua user |
| POST | `/api/users` | ✅ Admin | Buat user |
| PUT | `/api/users/:id` | ✅ | Update profil |
| DELETE | `/api/users/:id` | ✅ Admin | Hapus user |
| POST | `/api/users/:id/avatar` | ✅ | Upload avatar |

---

## ✅ Perbaikan yang Sudah Dilakukan

### Sesi Sebelumnya (Restrukturisasi)
- [x] Gabung 3 `package.json` → 1 monolith
- [x] Pindahkan `src/`, `public/`, `backend/` ke root
- [x] Hapus file legacy dan zip lama
- [x] Tambah relasi Sequelize di `backend/models/index.js`

### Sesi Ini (Perbaikan Logic Bisnis)
- [x] **JWT**: Perpanjang dari `30m` → `8h`
- [x] **Register security**: Endpoint `/api/auth/register` sekarang butuh token Admin
- [x] **Status value**: Standarisasi semua ke `"aktif"` (bukan `"active"`) di:
  - `src/pages/Index.tsx`
  - `src/pages/Management.tsx`
  - `src/components/dashboard/StatsCards.tsx`
  - `src/components/dashboard/SOPChart.tsx`
- [x] **User.updatedAt**: Di-set `false` di `User.js` untuk mencocokkan skema tabel MySQL `users` (mencegah error `Unknown column 'updated_at'`).
- [x] **Alur Reject → Revisi**: Endpoint `PUT /api/sops/:id/request-revision` ditambahkan
- [x] **API Endpoint POST /api/sops**: Terverifikasi bekerja 100% (Status 201 Created)

---

## 📋 TODO / Fitur yang Belum Selesai

### 🔴 Prioritas Tinggi

1. **Endpoint Submit SOP**
   - `PUT /api/sops/:id/submit` — Staf mengajukan SOP dari draft ke pending
   - Saat ini belum ada endpoint ini; approve/reject langsung dari daftar
   - Saran: Tambahkan di `backend/routes/sops.js`

2. **Tombol "Ajukan Revisi Ulang" di Frontend**
   - Endpoint `PUT /api/sops/:id/request-revision` sudah ada di backend
   - **Belum ada tombol di `Management.tsx`** untuk memanggil endpoint ini
   - Tambahkan tombol di row action ketika `approval_status === "rejected"` dan user adalah owner SOP

3. **Flowchart SOP**
   - Generate flowchart dari `flowchart_steps` JSON di `SOPDocument`
   - Belum ada komponen yang merender ini secara visual
   - Saran: Gunakan `reactflow` atau `mermaid.js`

### 🟡 Prioritas Sedang

4. **Menu Admin: Hapus "Tambah SOP"**
   - Admin tidak seharusnya bisa membuat SOP baru (hanya user staf/kepala_bagian)
   - Di `Management.tsx`, sembunyikan tombol "Tambah SOP" jika `user.role === 'admin'`

5. **Merge Menu "Riwayat" ke "Manajemen" untuk Admin**
   - Sidebar admin punya menu terpisah "Riwayat" dan "Manajemen"
   - Pertimbangkan untuk menggabungkan ke tab di halaman yang sama

6. **Token Refresh**
   - Saat ini JWT expired → user langsung ter-redirect ke login
   - Idealnya ada mekanisme `refresh_token` atau silent refresh

7. **Validasi `expiry_date` Otomatis**
   - SOP yang `expiry_date < today` seharusnya otomatis berubah ke `"kedaluwarsa"`
   - Saran: Tambah cron job atau validasi saat GET `/api/sops`

### 🟢 Prioritas Rendah

8. **Kolom `updated_at` di tabel `users`**
   - Sudah diaktifkan di model (`updatedAt: 'updated_at'`)
   - **Perlu jalankan** `node backend/restore-database.js --alter` untuk tambah kolom ke DB

9. **Error Boundary di Frontend**
   - Tidak ada komponen error boundary; jika API gagal, tampilan bisa kosong
   - Tambahkan React Error Boundary di `src/App.tsx`

---

## 🚀 Cara Menjalankan

```bash
# Install dependencies (sekali saja)
npm install

# Jalankan dev server (Frontend + Backend bersamaan)
npm run dev

# Hanya backend
npm run dev:backend

# Hanya frontend
npm run dev:frontend

# Sync database (jika ada perubahan model)
node backend/restore-database.js
```

---

## 🐛 Diketahui Bug / Gotcha

1. **`postcss.config.js`**: Harus pakai `module.exports` (bukan `export default`) karena konflik CJS/ESM
2. **Static Hosting Fallback**: Jika API tidak tersedia, frontend otomatis pakai `mockData.ts`. Ini desain yang disengaja untuk Hostinger shared hosting
3. **UUID**: Model menggunakan `defaultValue: () => require('uuid').v4()` — lazy require untuk menghindari circular dependency
4. **`SOPRevision.version`**: Disimpan terpisah dari `SOPDocument.version`. Saat approve revisi, `version` di `SOPDocument` harus di-increment manual

---

## 📎 File Penting untuk Diperhatikan Model Lain

| File | Catatan |
|------|---------|
| `backend/routes/sops.js` | Semua endpoint SOP + logika bisnis approval/reject/revisi |
| `backend/models/index.js` | Relasi antar model Sequelize |
| `src/types/index.ts` | Type definitions — pastikan sesuai dengan backend |
| `src/lib/mockData.ts` | Fallback data saat offline — status harus `"aktif"` bukan `"active"` |
| `.env` (buat sendiri) | Variabel database dan JWT — tidak di-commit ke git |
