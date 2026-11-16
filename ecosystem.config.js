// ============================================================
// FILE: ecosystem.config.js
// DESKRIPSI: Konfigurasi PM2 untuk menjalankan backend di VPS
//
// CARA DEPLOY DI VPS:
//   1. Di VPS, edit file ini atau buat file .env (lebih aman)
//   2. Jalankan: pm2 start ecosystem.config.js --env production
//   3. Simpan konfigurasi PM2: pm2 save
//   4. Auto-start saat reboot: pm2 startup
//
// CATATAN KEAMANAN:
//   - JWT_SECRET di bawah ini SUDAH di-generate secara cryptographically secure
//   - Jangan commit file ini ke Git publik setelah mengisi JWT_SECRET
//   - Alternatif lebih aman: simpan JWT_SECRET di file .env (sudah di .gitignore)
// ============================================================
module.exports = {
  apps: [
    {
      name: 'sop-bps-surabaya',
      script: './backend/server.js',
      instances: 1,
      exec_mode: 'fork',

      // Environment untuk development lokal
      env: {
        NODE_ENV: 'development',
        PORT: 8000,
        JWT_SECRET: 'secret-key-sop-bps-surabaya-dev-only',
        JWT_EXPIRES_IN: '8h',
      },

      // Environment untuk production di VPS
      // Gunakan: pm2 start ecosystem.config.js --env production
      env_production: {
        NODE_ENV: 'production',
        PORT: 8000,
        // [SECURITY] JWT_SECRET - sudah di-generate secara aman (128 karakter hex)
        // PENTING: Jangan ubah nilai ini sembarangan — semua sesi login user akan invalid
        JWT_SECRET: 'd86263b2f3b1bb5323e4749ea029d793871174f2d87fd6d961de7dab38756e55e15e8085e146e377f5d5698e002cb54ec1f52fef351237943ce82773079813fe',
        JWT_EXPIRES_IN: '8h',
        // Tambahkan jika menggunakan database:
        // DB_HOST: 'localhost',
        // DB_USER: 'bps_user',
        // DB_PASS: 'password_database',
        // DB_NAME: 'sop_bps',
      },

      watch: false,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true
    }
  ]
};
