# 🚀 Panduan Jalankan Server Menggunakan PM2 Production

Panduan ini berisi langkah-langkah lengkap untuk menjalankan aplikasi **E-SOPRA (SOP BPS Kota Surabaya)** dalam mode **Production** menggunakan Process Manager [PM2](https://pm2.keymetrics.io/).

---

## 📋 Persyaratan Sebelum Memulai

1. **Node.js** terinstall di server/VPS.
2. **PM2** terinstall secara global. Jika belum, install dengan command:
   ```bash
   npm install -g pm2
   ```

---

## ⚙️ File Konfigurasi (`ecosystem.config.js`)

File `ecosystem.config.js` sudah disediakan di root folder project:

```javascript
module.exports = {
  apps: [
    {
      name: 'sop-bps-surabaya',
      script: './backend/server.js',
      instances: 1,                 // 1 instance mode (fork) lebih stabil untuk Sequelize DB
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 8000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      watch: false,               // Disable watch pada mode produksi
      max_memory_restart: '1G',   // Auto restart jika memori melebihi 1GB
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true
    }
  ]
};
```

---

## 🚀 Perintah Utama Running PM2 Production

### 1. Jalankan Production Server (Build Frontend + Start PM2)

Menjalankan build bundle frontend Vite (`dist/`) lalu menyalakannya melalui PM2:

```bash
npm run prod
# atau
npm run pm2:start
```

Atau menggunakan perintah langsung PM2:
```bash
npm run build
pm2 start ecosystem.config.js --env production
```

---

## 🛠️ Perintah Manajemen PM2

| Perintah | Deskripsi |
|---|---|
| `npm run pm2:status` | Melihat status server (Online/Offline, CPU, Memory) |
| `npm run pm2:logs` | Melihat log realtime aplikasi |
| `npm run pm2:restart` | Restart server tanpa downtime (Reload dengan konfigurasi produksi) |
| `npm run pm2:stop` | Menghentikan server |
| `npm run pm2:delete` | Menghapus proses server dari daftar PM2 |

Perintah CLI PM2 opsional:
```bash
pm2 monit            # Monitoring Dashboard (CPU & RAM realtime)
pm2 reload all       # Zero-downtime reload
```

---

## 🔄 Agar PM2 Otomatis Jalan Saat Server/VPS Reboot

Jalankan perintah berikut di VPS/Server Linux agar PM2 otomatis menyala saat OS dinyalakan ulang:

```bash
pm2 save
pm2 startup
```
*Ikuti instruksi `sudo env PATH=...` yang dimunculkan oleh perintah `pm2 startup`.*

---

## 🌐 Setting Nginx (Reverse Proxy) - Opsional / Disarankan

Jika menggunakan Nginx di server Linux (Port 80/443 -> Port 8000):

```nginx
server {
    listen 80;
    server_name domain-anda.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 📂 Lokasi File Log PM2

- **Log Error**: `./logs/pm2-error.log`
- **Log Output**: `./logs/pm2-out.log`

---

## 🔍 Troubleshooting `curl: (7) Failed to connect to localhost port 8000`

Jika `curl localhost:8000` gagal connect atau status PM2 menunjukkan `launching` / `restarting` (dengan hitungan restart `↺` bertambah):

1. **Cek Log Error Realtime**:
   ```bash
   pm2 logs sop-bps-surabaya --lines 50
   # atau
   cat logs/pm2-error.log
   ```

2. **Penyebab Umurnya**:
   - **Koneksi Database MySQL Gagal**: Pastikan file `.env` di folder server Linux sudah berisi `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` yang valid.
   - **Bentrokan Cluster Mode**: Ubah `exec_mode` di `ecosystem.config.js` menjadi `'fork'` dengan `instances: 1`.
   - **Module / Dependensi Hilang**: Jalankan `npm install` di server Linux.

3. **Cara Terapkan Perubahan Konfigurasi**:
   ```bash
   pm2 delete sop-bps-surabaya
   npm run pm2:start
   ```

