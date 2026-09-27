const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const baseDir = __dirname;
const distDir = path.join(baseDir, 'dist');

console.log('========================================================');
console.log('  4조 3교대 스마트 근무표 24시간 클라우드 배포기');
console.log('========================================================\n');

// 1. dist 디렉토리 동기화
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

console.log('1. 최신 웹 파일 준비 중 (index.html, css, js, icons, manifest)...');
copyRecursive(path.join(baseDir, 'index.html'), path.join(distDir, 'index.html'));
copyRecursive(path.join(baseDir, 'css'), path.join(distDir, 'css'));
copyRecursive(path.join(baseDir, 'js'), path.join(distDir, 'js'));
if (fs.existsSync(path.join(baseDir, 'icons'))) {
  copyRecursive(path.join(baseDir, 'icons'), path.join(distDir, 'icons'));
}
if (fs.existsSync(path.join(baseDir, 'manifest.json'))) {
  copyRecursive(path.join(baseDir, 'manifest.json'), path.join(distDir, 'manifest.json'));
}
if (fs.existsSync(path.join(baseDir, 'transit-guide.html'))) {
  copyRecursive(path.join(baseDir, 'transit-guide.html'), path.join(distDir, 'transit-guide.html'));
}
if (fs.existsSync(path.join(baseDir, 'transit.html'))) {
  copyRecursive(path.join(baseDir, 'transit.html'), path.join(distDir, 'transit.html'));
}
if (fs.existsSync(path.join(baseDir, 'favicon.ico'))) {
  copyRecursive(path.join(baseDir, 'favicon.ico'), path.join(distDir, 'favicon.ico'));
}
if (fs.existsSync(path.join(baseDir, 'favicon.png'))) {
  copyRecursive(path.join(baseDir, 'favicon.png'), path.join(distDir, 'favicon.png'));
}

// 2. Surge 클라우드 배포
const email = 'kbs_shift_1634@shiftwork.app';
const password = 'ShiftPassword2026!';
const domain = 'kbs-4shift-5855.surge.sh';

console.log(`2. 클라우드 CDN 서버로 업로드 시작 (도메인: ${domain})...`);

const child = spawn('npx.cmd', ['surge', distDir, domain], {
  shell: true,
  stdio: ['pipe', 'pipe', 'pipe']
});

child.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);

  if (text.includes('email:')) {
    child.stdin.write(email + '\n');
  } else if (text.includes('password:')) {
    child.stdin.write(password + '\n');
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n========================================================');
    console.log('🎉 [배포 성공] 컴퓨터를 꺼도 24시간 언제나 열립니다!');
    console.log(`📱 카카오톡 전송 링크: https://${domain}`);
    console.log('========================================================\n');
  } else {
    console.log(`\n배포 종료 (코드: ${code})`);
  }
});
