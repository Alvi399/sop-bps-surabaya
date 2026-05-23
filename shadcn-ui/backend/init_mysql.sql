-- ============================================================
-- Script Inisialisasi Database MySQL untuk SOP BPS Surabaya
-- Jalankan: mysql -u root -p < init_mysql.sql
-- ============================================================

-- Buat database dengan encoding UTF-8 penuh (support karakter Indonesia)
CREATE DATABASE IF NOT EXISTS sop_bps
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Gunakan database ini
USE sop_bps;

-- Verifikasi database aktif
SELECT DATABASE() AS 'Database Aktif';

-- ============================================================
-- Catatan: Tabel akan dibuat otomatis oleh SQLAlchemy
-- saat backend pertama kali dijalankan (Base.metadata.create_all)
-- Script ini hanya untuk membuat database-nya saja.
-- ============================================================

-- Jika ingin membuat user khusus (opsional, ganti sesuai kebutuhan):
-- CREATE USER IF NOT EXISTS 'sop_user'@'localhost' IDENTIFIED BY 'password_aman_anda';
-- GRANT ALL PRIVILEGES ON sop_bps.* TO 'sop_user'@'localhost';
-- FLUSH PRIVILEGES;
