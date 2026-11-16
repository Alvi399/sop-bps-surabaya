const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const zipPath = path.join(rootDir, 'update-sop-hosting.zip');
const distZipPath = path.join(rootDir, 'dist.zip');

const publicHtaccess = path.join(rootDir, 'public', '.htaccess');
const distHtaccess = path.join(distDir, '.htaccess');

if (!fs.existsSync(distDir)) {
  console.error('❌ Folder dist tidak ditemukan. Jalankan "npm run build" terlebih dahulu!');
  process.exit(1);
}

if (fs.existsSync(publicHtaccess)) {
  fs.copyFileSync(publicHtaccess, distHtaccess);
  console.log('✅ .htaccess successfully copied to dist folder');
}

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
if (fs.existsSync(distZipPath)) fs.unlinkSync(distZipPath);

try {
  execSync(`cd "${distDir}" && 7z a -tzip "${zipPath}" .`, { stdio: 'inherit' });
  console.log('✅ 7z created archive successfully');
} catch (err) {
  console.error('Archive error:', err.message);
  process.exit(1);
}

if (fs.existsSync(zipPath)) {
  fs.copyFileSync(zipPath, distZipPath);
  console.log('🎉 File update-sop-hosting.zip & dist.zip berhasil dibuat di root folder!');
} else {
  console.error('❌ Gagal membuat zip!');
  process.exit(1);
}
