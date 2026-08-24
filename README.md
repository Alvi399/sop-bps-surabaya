# SOP BPS Surabaya

## 📌 Catatan Perbaikan (Perlu Fix)

### Urgent

1. [x] Ubah framework ke bentuk monolith (SELESAI - Clean Monolith Architecture)
2. Fix generate flowchart SOP
3. Di akun admin menu tambah SOP dihilangkan saja
4. Merge menu riwayat ke manajemen pada akun admin
5. Menu riwayat hanya perlu aksi hapus, lihat, dan download
6. Aksi edit di akun admin pada menu manajemen tidak perlu, cukup lihat, reject, dan approve
7. Flow ke reject - revision - approve masih bermasalah

### Opsional

1. Pada menu pengaturan profil tidak bisa menyimpan foto

---

## 🔑 Akun & Credential Login (Berdasarkan Role)

Password standar untuk semua akun bawaan: Sby123456

1. Role: Admin (Super Admin)
   Email / Username: admin@bps-surabaya.go.id
   Password: Sby123456

2. Role: Admin (Alternatif)
   Email / Username: alvikirana138@bps-surabaya.go.id
   Password: Sby123456

3. Role: Kepala Bagian
   Email / Username: kepala@bps-surabaya.go.id
   Password: Sby123456

4. Role: Staf (User Biasa 1)
   Email / Username: staf1@bps-surabaya.go.id
   Password: Sby123456

5. Role: Staf (User Biasa 2)
   Email / Username: atha@bps-surabaya.go.id
   Password: Sby123456

---

## 🛡️ Penjelasan Level Hak Akses (Role)

1. admin: Full access (Edit, Hapus SOP, Approval, Revisi, User Management).
2. kepala_bagian: Hak Verifikasi & Approval (Approve / Reject / Minta Revisi).
3. ketua_tim: View & Edit terbatas sesuai Seksi/Tim.
4. staf: Hak akses user biasa (View & Download PDF SOP).

---

## 🚀 Cara Menjalankan Aplikasi (Clean Monolith)

1. Install Dependencies (Cukup Sekali di Root):
   npm install

2. Jalankan Database & Seed Admin (Hanya Sekali):
   npm run restore-db
   npm run seed-admin

3. Jalankan Mode Development (Frontend + Backend Concurrently):
   npm run dev
   - Frontend Vite: http://localhost:5173
   - Backend Express API: http://localhost:8000

4. Jalankan Server Production Monolith (Single Server serving API & Built UI):
   npm run build
   npm start
   - Web App & API: http://localhost:8000

5. Paketkan Build untuk Deploy ke Hostinger:
   npm run package:hosting
