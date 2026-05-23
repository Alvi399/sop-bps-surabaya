// Script wrapper for running backend-express from the root directory
const path = require('path');
const fs = require('fs');

const backendDir = path.join(__dirname, 'shadcn-ui', 'backend-express');

if (fs.existsSync(backendDir)) {
  process.chdir(backendDir);
  console.log(`📂 Switched directory to: ${process.cwd()}`);
  require(path.join(backendDir, 'server.js'));
} else {
  console.error(`❌ Backend directory not found: ${backendDir}`);
  process.exit(1);
}
