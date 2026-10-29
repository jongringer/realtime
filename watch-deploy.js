const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');

const baseDir = __dirname;
const distDir = path.join(baseDir, 'dist');
const token = process.env.SURGE_TOKEN || '81c2062b09ea41b4d328d2d5c79c910a';
const email = process.env.SURGE_LOGIN || 'kbs_shift_1634@shiftwork.app';
const domain = 'kbs-4shift-5855.surge.sh';

console.log('========================================================');
console.log('  ⚡ 실시간 코드 감시 & 자동 즉각 배포기 (Live Auto-Deploy)');
console.log('  파일을 수정하고 저장하면 즉각 클라우드로 배포되며,');
console.log('  열려있는 웹 브라우저는 5초 내로 자동 새로고침됩니다.');
console.log('========================================================\n');

let isDeploying = false;
let deployTimer = null;

function triggerDeploy(changedFile) {
  if (isDeploying) {
    console.log(`[대기] 배포 진행 중... (${changedFile} 변경 감지됨)`);
    return;
  }

  clearTimeout(deployTimer);
  deployTimer = setTimeout(() => {
    isDeploying = true;
    console.log(`\n[감지] 파일 수정됨: ${changedFile}`);
    console.log('🚀 1. 웹 에셋 빌드 & 새 버전 태그 생성 중...');

    const buildResult = spawnSync(process.execPath, [path.join(baseDir, 'build.js')], { stdio: 'inherit' });
    if (buildResult.status !== 0) {
      console.error('❌ 빌드 실패로 배포가 중단되었습니다.');
      isDeploying = false;
      return;
    }

    console.log(`🚀 2. Surge 클라우드로 즉각 배포 중 (https://${domain})...`);
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
      isDeploying = false;
      if (code === 0) {
        console.log(`\n✅ [배포 완료] 브라우저가 잠시 후 자동으로 새로고침됩니다!`);
        console.log(`🌐 확인: https://${domain}\n`);
      } else {
        console.error(`\n❌ 배포 실패 (코드: ${code})`);
      }
    });
  }, 1200); // 1.2초 디바운스로 연속 저장 시 안전하게 1회만 배포
}

// 감시 대상 디렉토리 및 파일
const watchTargets = [
  path.join(baseDir, 'index.html'),
  path.join(baseDir, 'transit.html'),
  path.join(baseDir, 'transit-guide.html'),
  path.join(baseDir, 'css'),
  path.join(baseDir, 'js'),
  path.join(baseDir, 'icons'),
  path.join(baseDir, 'manifest.json'),
  path.join(baseDir, 'master-shifts.json')
];

watchTargets.forEach(target => {
  if (fs.existsSync(target)) {
    fs.watch(target, { recursive: true }, (eventType, filename) => {
      // dist나 임시 파일 무시
      if (!filename || filename.includes('dist') || filename.endsWith('~') || filename.startsWith('.')) return;
      triggerDeploy(filename);
    });
    console.log(`👀 감시 등록: ${path.relative(baseDir, target)}`);
  }
});

console.log('\n[준비 완료] 소스 코드를 수정하시면 즉시 자동 배포가 시작됩니다.');
