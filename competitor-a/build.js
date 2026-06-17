const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'source');
const distDir = path.join(__dirname, 'dist');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const sourcePath = path.join(from, entry.name);
    const targetPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

fs.rmSync(distDir, { recursive: true, force: true });
copyDir(sourceDir, distDir);
console.log('competitor-a built to dist/');
