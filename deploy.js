const path = require('path');
const { spawnSync, spawn } = require('child_process');

const baseDir = __dirname;
const distDir = path.join(baseDir, 'dist');

console.log('========================================================');
console.log('  realtime 실시간 대중교통 & 스마트 캘린더 클라우드 배포기');
console.log('========================================================\n');

// 1. 배포 전 최신 웹 에셋 빌드 & 캐시 무효화 (Cache-Busting) 실행
console.log('1. 최신 웹 에셋 빌드 및 캐시 버스팅 적용 중...');
const buildScript = path.join(baseDir, 'build.js');
const buildResult = spawnSync(process.execPath, [buildScript], { stdio: 'inherit' });
if (buildResult.status !== 0) {
  console.error('❌ 웹 에셋 빌드 실패. 배포를 중단합니다.');
  process.exit(1);
}

// 2. Surge 클라우드 배포 설정
const token = process.env.SURGE_TOKEN || '81c2062b09ea41b4d328d2d5c79c910a';
const email = process.env.SURGE_LOGIN || 'kbs_shift_1634@shiftwork.app';
const domain = 'kbs-realtime.surge.sh';

console.log(`\n2. 클라우드 CDN 서버로 업로드 시작 (도메인: https://${domain})...`);

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['surge', distDir, domain, '--token', token];

const child = spawn(cmd, args, {
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    SURGE_TOKEN: token,
    SURGE_LOGIN: email
  }
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n========================================================');
    console.log('🎉 [배포 성공] 컴퓨터를 꺼도 24시간 언제나 열립니다!');
    console.log(`📱 실시간 웹앱 링크: https://${domain}`);
    console.log(`📥 최신 APK 다운로드: https://${domain}/realtime.apk`);
    console.log('========================================================\n');
  } else {
    console.error(`\n❌ 배포 종료 (종료 코드: ${code})`);
    process.exit(code);
  }
});
