const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const distDir = path.join(baseDir, 'dist');

console.log('========================================================');
console.log('  realtime 웹 에셋 빌드 & 실시간 캐시 무효화 시작');
console.log('========================================================');

// 1. 패키지 버전 및 빌드 타임스탬프 계산
let pkgVersion = '1.0.0';
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(baseDir, 'package.json'), 'utf8'));
  if (pkg.version) pkgVersion = pkg.version;
} catch (e) {
  console.warn('package.json 읽기 실패, 기본 버전 사용:', pkgVersion);
}

const now = new Date();
const buildTimestamp = now.getTime();
const buildDate = now.toISOString().replace('T', ' ').substring(0, 19);
const cacheVersionTag = `${pkgVersion}.${buildTimestamp}`;

console.log(`[Build Info] Version: ${pkgVersion} | Build Timestamp: ${buildTimestamp} (${buildDate})`);

// 2. dist 디렉토리 보장
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 3. 재귀 복사 유틸리티
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

// 4. version.json 생성
const versionInfo = {
  version: pkgVersion,
  buildTimestamp: buildTimestamp,
  buildDate: buildDate,
  domain: 'kbs-realtime.surge.sh'
};
fs.writeFileSync(path.join(distDir, 'version.json'), JSON.stringify(versionInfo, null, 2), 'utf8');
console.log('✓ version.json 생성 완료');

// 4-1. master-shifts.json (개인별 클린 초기 상태 유지)
const defaultMasterOverrides = {};
let existingOverrides = {};
const masterShiftsPath = path.join(baseDir, 'master-shifts.json');
if (fs.existsSync(masterShiftsPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(masterShiftsPath, 'utf8'));
    if (raw && raw.overrides) existingOverrides = raw.overrides;
  } catch (e) {
    console.warn('기존 master-shifts.json 파싱 실패, 기본값 사용');
  }
}

const mergedOverrides = Object.assign({}, defaultMasterOverrides, existingOverrides);

const masterShifts = {
  version: pkgVersion,
  updatedAt: buildDate,
  overrides: mergedOverrides
};
fs.writeFileSync(path.join(distDir, 'master-shifts.json'), JSON.stringify(masterShifts, null, 2), 'utf8');
fs.writeFileSync(path.join(baseDir, 'master-shifts.json'), JSON.stringify(masterShifts, null, 2), 'utf8');
console.log('✓ master-shifts.json 동기화 완료');

// 5. 정적 리소스 복사 (css, js, icons, manifest 등)
const copyItems = [
  'css',
  'js',
  'icons',
  'manifest.json',
  'favicon.ico',
  'favicon.png'
];

// GitHub Pages용 .nojekyll 생성 (에셋 404 방지)
fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf8');

copyItems.forEach(item => {
  const srcPath = path.join(baseDir, item);
  const destPath = path.join(distDir, item);
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, destPath);
    console.log(`✓ Copied: ${item}`);
  }
});

// 6. APK 파일 보존/동기화 (루트에 있으면 dist로 복사, dist에 이미 있으면 보존)
const rootApk = path.join(baseDir, 'realtime.apk');
const distApk = path.join(distDir, 'realtime.apk');
if (fs.existsSync(rootApk)) {
  fs.copyFileSync(rootApk, distApk);
  console.log('✓ realtime.apk 루트에서 dist로 동기화 완료');
} else if (fs.existsSync(distApk)) {
  console.log('✓ 기존 dist/realtime.apk 보존 완료');
}

// QR 코드 이미지가 있으면 dist에도 복사 (다운로드 안내용)
const rootQr = path.join(baseDir, 'qr_realtime.png');
if (fs.existsSync(rootQr)) {
  fs.copyFileSync(rootQr, path.join(distDir, 'qr_realtime.png'));
}

// 7. HTML 파일 캐시 버스팅 및 전역 버전 메타 주입
function processHtmlFile(srcFileName, destFileName) {
  const srcPath = path.join(baseDir, srcFileName);
  const destPath = path.join(distDir, destFileName);
  if (!fs.existsSync(srcPath)) return;

  let content = fs.readFileSync(srcPath, 'utf8');

  // 로컬 CSS/JS 파일 쿼리스트링 자동 치환 (?v=...)
  content = content.replace(/(href=["']?(?:css\/[^"'\s>]+\.css))(?:\?v=[^"'\s>]*)?/gi, `$1?v=${cacheVersionTag}`);
  content = content.replace(/(src=["']?(?:js\/[^"'\s>]+\.js))(?:\?v=[^"'\s>]*)?/gi, `$1?v=${cacheVersionTag}`);

  // icon/image 쿼리스트링 치환
  content = content.replace(/(href=["']?icons\/[^"'\s>]+\.(?:png|svg|ico))(\?v=[^"'\s>]*)?/gi, `$1?v=${cacheVersionTag}`);
  content = content.replace(/(content=["']?https:\/\/kbs-realtime\.surge\.sh\/icons\/[^"'\s>]+\.(?:png|svg|ico))(\?v=[^"'\s>]*)?/gi, `$1?v=${cacheVersionTag}`);

  // 전역 버전 정보 스크립트 주입
  const metaScript = `\n  <script>\n    window.__APP_VERSION__ = "${pkgVersion}";\n    window.__BUILD_TIMESTAMP__ = ${buildTimestamp};\n    window.__BUILD_DATE__ = "${buildDate}";\n  </script>`;
  
  if (content.includes('</head>')) {
    content = content.replace('</head>', `${metaScript}\n</head>`);
  }

  // index.html의 경우 version-sync.js 스크립트 주입 보장
  if (srcFileName === 'index.html' && !content.includes('version-sync.js')) {
    content = content.replace('</body>', `  <script src="js/version-sync.js?v=${cacheVersionTag}"></script>\n</body>`);
  }

  fs.writeFileSync(destPath, content, 'utf8');
  console.log(`✓ HTML 캐시 버스팅 완료: ${srcFileName} -> dist/${destFileName}`);
}

processHtmlFile('index.html', 'index.html');
processHtmlFile('transit.html', 'transit.html');
processHtmlFile('transit-guide.html', 'transit-guide.html');

// 8. Android 네이티브 assets 동기화 보장 (APK는 자체 APK 파일 복사 제외하여 용량 최적화)
const androidAssetsDir = path.join(baseDir, 'android', 'app', 'src', 'main', 'assets', 'public');
if (fs.existsSync(androidAssetsDir)) {
  fs.readdirSync(distDir).forEach(childItemName => {
    if (childItemName.endsWith('.apk')) return;
    copyRecursive(path.join(distDir, childItemName), path.join(androidAssetsDir, childItemName));
  });
  console.log('✓ Android 네이티브 assets(public) 동기화 완료');
}

console.log('========================================================');
console.log('🎉 realtime 최신 웹 에셋 빌드 및 캐시 무효화 완료!');
console.log('========================================================\n');
