const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const distDir = path.join(baseDir, 'dist');

console.log('Building web assets to dist directory...');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const copyItems = [
  'index.html',
  'css',
  'js',
  'icons',
  'manifest.json',
  'transit-guide.html',
  'transit.html',
  'favicon.ico',
  'favicon.png'
];

copyItems.forEach(item => {
  const srcPath = path.join(baseDir, item);
  const destPath = path.join(distDir, item);
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, destPath);
    console.log(`✓ Copied: ${item}`);
  }
});

console.log('✓ Web assets build completed successfully.');
