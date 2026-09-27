import { clearUpdateApkCache, checkForAppUpdates } from './updater.js';

window.addEventListener('DOMContentLoaded', async () => {
  // 앱 켜질 때 이전 설치 캐시 즉시 자동 청소
  await clearUpdateApkCache();

  // 1.5초 후 백그라운드 릴리스 버전 체크
  setTimeout(() => {
    checkForAppUpdates();
  }, 1500);
});
