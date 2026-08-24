const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const zipPath = path.join(rootDir, 'update-sop-hosting.zip');
const distZipPath = path.join(rootDir, 'dist.zip');

const publicHtaccess = path.join(rootDir, 'public', '.htaccess');
const distHtaccess = path.join(distDir, '.htaccess');

if (fs.existsSync(publicHtaccess)) {
  fs.copyFileSync(publicHtaccess, distHtaccess);
  console.log('✅ .htaccess successfully copied to dist folder');
}

function getFiles(dir, base = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const rel = base ? `${base}/${file}` : file;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(full, rel));
    } else {
      results.push(rel);
    }
  });
  return results;
}

if (!fs.existsSync(distDir)) {
  console.error('❌ Folder dist tidak ditemukan. Jalankan "npm run build" terlebih dahulu!');
  process.exit(1);
}

const files = getFiles(distDir);
console.log('📦 Jumlah file yang akan diarsip:', files.length);

const fileArgs = files.map(f => `"${f}"`).join(' ');
execSync(`tar.exe -a -cf "${zipPath}" -C "${distDir}" ${fileArgs}`, { stdio: 'inherit' });
fs.copyFileSync(zipPath, distZipPath);

console.log('🎉 File update-sop-hosting.zip & dist.zip berhasil dibuat di root folder!');
