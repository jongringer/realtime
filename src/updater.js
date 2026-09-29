import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capawesome-team/capacitor-file-opener';

// [설정] 현재 앱 버전 및 GitHub 저장소 (계정명/저장소명 입력)
export const CURRENT_APP_VERSION = 'v1.2.2';
const GITHUB_REPO = 'jongringer/apk'; 

/**
 * 1. 캐시에 남아있는 이전 임시 APK 파일 완전 삭제
 */
export async function clearUpdateApkCache() {
  try {
    await Filesystem.deleteFile({
      path: 'update.apk',
      directory: Directory.Cache
    });
    console.log('[Updater] 이전 캐시 update.apk 정리 완료');
  } catch (e) {
    // 파일이 없는 평상시 상태는 정상 패스
  }
}

/**
 * 2. 시맨틱 버전 비교 (최신 태그가 현재 버전보다 크면 true)
 */
function isNewerVersion(latest, current) {
  const parse = v => v.replace(/^v/, '').split('.').map(Number);
  const [lMaj = 0, lMin = 0, lPat = 0] = parse(latest);
  const [cMaj = 0, cMin = 0, cPat = 0] = parse(current);

  if (lMaj > cMaj) return true;
  if (lMaj === cMaj && lMin > cMin) return true;
  if (lMaj === cMaj && lMin === cMin && lPat > cPat) return true;
  return false;
}

/**
 * 3. GitHub Releases 최신 버전 체크
 */
export async function checkForAppUpdates() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) return;

    const data = await res.json();
    const latestVersion = data.tag_name;

    if (isNewerVersion(latestVersion, CURRENT_APP_VERSION)) {
      const apkAsset = data.assets.find(a => a.name.endsWith('.apk'));
      if (apkAsset && apkAsset.browser_download_url) {
        showUpdateAlert(latestVersion, data.body, apkAsset.browser_download_url);
      }
    }
  } catch (err) {
    console.log('[Updater] 업데이트 체크 스킵 (오프라인 등):', err);
  }
}

/**
 * 4. 업데이트 안내 팝업 표출
 */
function showUpdateAlert(version, notes, downloadUrl) {
  let modal = document.getElementById('updater-modal-root');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'updater-modal-root';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;">
      <div style="background:#fff;border-radius:16px;max-width:340px;width:100%;padding:24px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.3);font-family:sans-serif;">
        <div style="font-size:36px;margin-bottom:8px;">🚀</div>
        <h3 style="margin:0 0 8px 0;font-size:18px;color:#111;">새 버전 업데이트 (${version})</h3>
        <p style="font-size:13px;color:#666;margin:0 0 16px 0;">최신 근무표 기능과 버그 수정이 적용됩니다.</p>
        <div style="display:flex;gap:8px;">
          <button id="updater-btn-close" style="flex:1;padding:12px;border:1px solid #ddd;background:#f5f5f5;border-radius:8px;font-weight:600;color:#555;">나중에</button>
          <button id="updater-btn-start" style="flex:1.5;padding:12px;border:none;background:#2563eb;color:#fff;border-radius:8px;font-weight:600;">지금 업데이트</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('updater-btn-close').onclick = () => modal.remove();
  document.getElementById('updater-btn-start').onclick = () => {
    modal.remove();
    downloadAndInstallApk(downloadUrl);
  };
}

/**
 * 5. 인앱 게이지 바 다운로드 및 패키지 설치 창 호출
 */
export async function downloadAndInstallApk(apkUrl) {
  // 사전 청소: 미완성된 기존 파일 삭제
  await clearUpdateApkCache();

  let progModal = document.getElementById('download-progress-root');
  if (!progModal) {
    progModal = document.createElement('div');
    progModal.id = 'download-progress-root';
    document.body.appendChild(progModal);
  }

  progModal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;">
      <div style="background:#fff;border-radius:16px;max-width:340px;width:100%;padding:24px;text-align:center;font-family:sans-serif;">
        <div style="font-size:36px;margin-bottom:8px;">📦</div>
        <h3 style="margin:0 0 12px 0;font-size:18px;color:#111;">새 버전 다운로드 중</h3>
        <div style="width:100%;height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-bottom:8px;">
          <div id="gauge-fill" style="width:0%;height:100%;background:#2563eb;transition:width 0.15s ease-out;"></div>
        </div>
        <div id="gauge-text" style="font-size:14px;font-weight:700;color:#2563eb;text-align:right;">0%</div>
      </div>
    </div>
  `;

  const fill = document.getElementById('gauge-fill');
  const txt = document.getElementById('gauge-text');

  try {
    const progressListener = await Filesystem.addListener('progress', (status) => {
      if (status.contentLength && status.contentLength > 0) {
        const percent = Math.round((status.bytes / status.contentLength) * 100);
        fill.style.width = `${percent}%`;
        txt.textContent = `${percent}%`;
      }
    });

    const result = await Filesystem.downloadFile({
      url: apkUrl,
      path: 'update.apk',
      directory: Directory.Cache,
      progress: true
    });

    await progressListener.remove();
    progModal.remove();

    // 안드로이드 OS 패키지 인스톨러 호출
    await FileOpener.openFile({
      path: result.path,
      mimeType: 'application/vnd.android.package-archive'
    });

  } catch (err) {
    console.error('[Updater] 다운로드 실패:', err);
    await clearUpdateApkCache();
    progModal.remove();
    alert('다운로드 중 오류가 발생했습니다. 네트워크를 확인하세요.');
  }
}
