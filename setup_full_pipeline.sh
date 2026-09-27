#!/bin/bash
set -e

echo "================================================================="
echo " [1/7] 필수 Capacitor 플러그인 설치 (Filesystem & FileOpener)"
echo "================================================================="
npm install @capacitor/filesystem @capawesome-team/capacitor-file-opener
echo "✓ 플러그인 패키지 설치 완료"

echo "================================================================="
echo " [2/7] .gitignore 보안 설정 갱신"
echo "================================================================="
touch .gitignore
grep -qxF "release.keystore" .gitignore || echo "release.keystore" >> .gitignore
grep -qxF "keystore_base64.txt" .gitignore || echo "keystore_base64.txt" >> .gitignore
grep -qxF "*.apk" .gitignore || echo "*.apk" >> .gitignore
echo "✓ 키스토어 및 APK 파일의 Git 유출 방지 등록 완료"

echo "================================================================="
echo " [3/7] 정식 릴리스 서명 키(Keystore) 생성 및 Base64 인코딩"
echo "================================================================="
KEYSTORE_NAME="release.keystore"
KEY_ALIAS="shiftalarm"
KEY_PASS="ShiftAlarmPass2026!"

if [ -f "$KEYSTORE_NAME" ]; then
    echo "✓ 기존 $KEYSTORE_NAME 파일이 존재하므로 재사용합니다."
else
    keytool -genkeypair -v \
      -keystore "$KEYSTORE_NAME" \
      -alias "$KEY_ALIAS" \
      -keyalg RSA \
      -keysize 2048 \
      -validity 10000 \
      -storepass "$KEY_PASS" \
      -keypass "$KEY_PASS" \
      -dname "CN=ShiftAlarm, OU=Dev, O=Personal, L=Seoul, ST=Seoul, C=KR"
    echo "✓ 릴리스 Keystore 생성 완료"
fi

# Base64 인코딩 (Linux/macOS 호환)
base64 -w 0 "$KEYSTORE_NAME" > keystore_base64.txt 2>/dev/null || base64 "$KEYSTORE_NAME" > keystore_base64.txt
echo "✓ keystore_base64.txt 변환 완료"

echo "================================================================="
echo " [4/7] AndroidManifest.xml 필수 권한 자동 주입"
echo "================================================================="
MANIFEST_FILE="android/app/src/main/AndroidManifest.xml"

if [ -f "$MANIFEST_FILE" ]; then
    # INTERNET 권한 확인 및 추가
    if ! grep -q "android.permission.INTERNET" "$MANIFEST_FILE"; then
        sed -i '/<manifest/a \    <uses-permission android:name="android.permission.INTERNET" />' "$MANIFEST_FILE"
        echo "✓ INTERNET 권한 추가됨"
    fi
    # REQUEST_INSTALL_PACKAGES 권한 확인 및 추가
    if ! grep -q "android.permission.REQUEST_INSTALL_PACKAGES" "$MANIFEST_FILE"; then
        sed -i '/<manifest/a \    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />' "$MANIFEST_FILE"
        echo "✓ REQUEST_INSTALL_PACKAGES 권한 추가됨"
    fi
else
    echo "! android 폴더가 아직 생성되지 않았습니다. 차후 cap add android 후 매니페스트를 확인하세요."
fi

echo "================================================================="
echo " [5/7] GitHub Actions CI/CD 워크플로우 생성 (QR 코드 포함)"
echo "================================================================="
mkdir -p .github/workflows

cat << 'WORKFLOW' > .github/workflows/build-apk.yml
name: Build and Release Signed Android APK

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Setup Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Install Dependencies & Build Web Assets
        run: |
          npm ci || npm install
          npm run build

      - name: Sync Capacitor to Android
        run: |
          npx cap sync android

      - name: Grant Execute Permission for Gradlew
        run: |
          chmod +x android/gradlew

      - name: Build Unsigned Release APK with Gradle
        run: |
          cd android
          ./gradlew assembleRelease --no-daemon

      - name: Sign Android Release APK
        uses: r0adkll/sign-android-release@v1
        id: sign_app
        with:
          releaseDirectory: android/app/build/outputs/apk/release
          signingKey: ${{ secrets.KEYSTORE_BASE64 }}
          keyStorePassword: ${{ secrets.KEYSTORE_PASSWORD }}
          alias: ${{ secrets.KEY_ALIAS }}
          keyPassword: ${{ secrets.KEY_PASSWORD }}

      - name: Rename Signed APK with Tag Name
        run: |
          cp ${{ steps.sign_app.outputs.signedFile }} ./ShiftAlarm-${{ github.ref_name }}.apk

      - name: Publish Signed APK to GitHub Release with QR Code
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: "근무표 알람 앱 ${{ github.ref_name }} (정식 서명판)"
          body: |
            ### 📱 정식 서명 릴리스 (${{ github.ref_name }})
            - **서명 상태**: Release Keystore 정식 서명 완료 (SHA-256 / RSA)
            - **배포 기준 커밋**: ${{ github.sha }}

            ---

            ### 📲 스마트폰 카메라로 QR 코드를 스캔하세요
            > 갤럭시 기본 카메라 앱으로 아래 QR 코드를 비추면 즉시 최신 앱이 다운로드됩니다.

            ![Download QR Code](https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https://github.com/${{ github.repository }}/releases/download/${{ github.ref_name }}/ShiftAlarm-${{ github.ref_name }}.apk)

            - **직접 다운로드 파일 링크**: [ShiftAlarm-${{ github.ref_name }}.apk](https://github.com/${{ github.repository }}/releases/download/${{ github.ref_name }}/ShiftAlarm-${{ github.ref_name }}.apk)
          draft: false
          prerelease: false
          files: ./ShiftAlarm-${{ github.ref_name }}.apk
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
WORKFLOW

echo "✓ .github/workflows/build-apk.yml 생성 완료"

# Gradlew 실행 권한 Git 인덱스 선반영
if [ -f "android/gradlew" ]; then
    git update-index --chmod=+x android/gradlew 2>/dev/null || true
fi

echo "================================================================="
echo " [6/7] 인앱 자동 업데이트 및 캐시 정리 모듈 생성 (updater.js)"
echo "================================================================="
mkdir -p src

cat << 'UPDATER' > src/updater.js
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capawesome-team/capacitor-file-opener';

// [설정] 현재 앱 버전 및 GitHub 저장소 (계정명/저장소명 입력)
export const CURRENT_APP_VERSION = 'v1.0.0';
const GITHUB_REPO = 'username/shift-alarm-app'; 

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
UPDATER

echo "✓ src/updater.js 생성 완료"

echo "================================================================="
echo " [7/7] 네이티브 동기화 (Capacitor Sync)"
echo "================================================================="
npx cap sync android || echo "! sync는 추후 웹 빌드(npm run build) 완료 후 실행해도 됩니다."

echo ""
echo "================================================================="
echo " 🎉 모든 CI/CD 자동화 파일 및 소스코드 구성이 완료되었습니다!"
echo "================================================================="
echo ""
echo "▶ 다음 단계 (GitHub Secrets 등록 필요):"
echo "GitHub 저장소 [Settings > Secrets and variables > Actions]에서 등록할 값:"
echo "-----------------------------------------------------------------"
echo "1. KEYSTORE_PASSWORD : $KEY_PASS"
echo "2. KEY_ALIAS        : $KEY_ALIAS"
echo "3. KEY_PASSWORD     : $KEY_PASS"
echo "4. KEYSTORE_BASE64   : (프로젝트 루트의 keystore_base64.txt 내용 전체 복사)"
echo "-----------------------------------------------------------------"
echo "※ 저장소 [Settings > Actions > General > Workflow permissions]에서"
echo "   'Read and write permissions' 선택 확인 필수!"
echo ""
