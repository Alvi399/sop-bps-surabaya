/**
 * Restore database MySQL: buat database jika belum ada, lalu sync semua tabel.
 * Jalankan: node restore-database.js
 * Opsi --force: hapus semua tabel lalu buat ulang (data hilang).
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'sop_bps';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT) || 3306;

const useForce = process.argv.includes('--force');

async function createDatabaseIfNotExists() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Database "${DB_NAME}" siap (sudah ada atau baru dibuat).`);
  } finally {
    await conn.end();
  }
}

async function restore() {
  try {
    console.log('🔄 Restore database MySQL...');
    console.log(`   Host: ${DB_HOST}:${DB_PORT}, DB: ${DB_NAME}, User: ${DB_USER}`);

    await createDatabaseIfNotExists();

    const { sequelize } = require('./models');

    await sequelize.authenticate();
    console.log('✅ Koneksi MySQL berhasil.');

    if (useForce) {
      await sequelize.sync({ force: true });
      console.log('✅ Semua tabel di-drop dan dibuat ulang (--force).');
    } else {
      await sequelize.sync({ alter: false });
      console.log('✅ Tabel disinkronkan (buat jika belum ada).');
    }

    console.log('\n📌 Restore selesai. Jalankan seed admin jika perlu:');
    console.log('   node seed-admin.js');
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal restore database:', err.message);
    if (err.message && err.message.includes('Access denied')) {
      console.error('   Periksa DB_USER, DB_PASSWORD di .env');
    }
    if (err.message && err.message.includes('ECONNREFUSED')) {
      console.error('   Pastikan MySQL berjalan di', DB_HOST + ':' + DB_PORT);
    }
    process.exit(1);
  }
}

restore();
