/**
 * version-sync.js - 실시간 버전 동기화 및 자동 새로고침 (Auto-Reload) 엔진
 * 
 * 코드 수정 및 배포가 발생하면 5초 이내에 즉각 감지하여
 * 열려있는 브라우저 화면을 자동으로 새로고침하고 최신 코드를 반영합니다.
 */
(function() {
  'use strict';

  // 1. 오래된 서비스워커 및 로컬 캐시 스토리지 즉각 정리
  function cleanLegacyCaches() {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          registrations.forEach(function(registration) {
            registration.unregister().catch(function() {});
          });
        }).catch(function() {});
      }
      if ('caches' in window) {
        caches.keys().then(function(names) {
          names.forEach(function(name) {
            caches.delete(name).catch(function() {});
          });
        }).catch(function() {});
      }
    } catch (e) {
      console.warn('[VersionSync] Cache cleanup skipped:', e);
    }
  }

  // 2. 버전 비교 및 자동 새로고침
  var startTime = Date.now();
  var isChecking = false;
  var isUpdating = false;

  function showAutoRefreshToast(serverVersion) {
    if (document.getElementById('version-update-toast')) return;

    var toast = document.createElement('div');
    toast.id = 'version-update-toast';
    toast.style.cssText = [
      'position: fixed',
      'top: 16px',
      'left: 50%',
      'transform: translateX(-50%)',
      'z-index: 9999999',
      'background: linear-gradient(135deg, #0284c7, #0369a1)',
      'color: #ffffff',
      'padding: 10px 20px',
      'border-radius: 999px',
      'box-shadow: 0 10px 25px rgba(2, 132, 199, 0.4)',
      'display: flex',
      'align-items: center',
      'gap: 10px',
      'font-size: 13px',
      'font-weight: 700',
      'border: 1.5px solid rgba(255,255,255,0.3)',
      'animation: pulse 1s infinite alternate'
    ].join(';');

    toast.innerHTML = [
      '<span style="font-size: 16px;">⚡</span>',
      '<span>최신 업데이트 감지! 1초 후 자동 새로고침됩니다...</span>'
    ].join('');

    document.body.appendChild(toast);
  }

  function applyUpdate(buildTimestamp) {
    if (isUpdating) return;
    isUpdating = true;

    // URL에 새 타임스탬프를 부여하여 브라우저 완전 강제 갱신
    var cleanUrl = window.location.origin + window.location.pathname;
    var searchParams = new URLSearchParams(window.location.search);
    searchParams.set('_v', buildTimestamp || Date.now());
    var newUrl = cleanUrl + '?' + searchParams.toString();

    // 1초 후 부드럽게 전환
    setTimeout(function() {
      window.location.replace(newUrl);
    }, 800);
  }

  function checkServerVersion() {
    if (isChecking || isUpdating) return;
    isChecking = true;

    var currentBuildTime = window.__BUILD_TIMESTAMP__ || 0;
    var fetchUrl = 'version.json?_t=' + Date.now();

    fetch(fetchUrl, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
    .then(function(res) {
      if (!res.ok) throw new Error('version.json status ' + res.status);
      return res.json();
    })
    .then(function(data) {
      isChecking = false;
      if (!data || !data.buildTimestamp) return;

      var serverBuildTime = Number(data.buildTimestamp);
      if (currentBuildTime > 0 && serverBuildTime > currentBuildTime) {
        console.log('[VersionSync] New version detected (' + serverBuildTime + ' > ' + currentBuildTime + '). Auto-reloading page...');
        
        // 텍스트를 입력 중인지 확인
        var activeEl = document.activeElement;
        var isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

        if (isTyping) {
          // 사용자가 입력 중이면 포커스를 잃을 때 자동 새로고침 예약
          activeEl.addEventListener('blur', function onBlur() {
            activeEl.removeEventListener('blur', onBlur);
            showAutoRefreshToast(data);
            applyUpdate(serverBuildTime);
          });
        } else {
          // 일반 열람 상태에서는 즉각 자동 새로고침 안내 후 리로드!
          showAutoRefreshToast(data);
          applyUpdate(serverBuildTime);
        }
      }
    })
    .catch(function(err) {
      isChecking = false;
      // 오프라인이거나 네트워크 일시 오류 시 조용히 스킵
    });
  }

  // 초기 실행
  cleanLegacyCaches();
  if (typeof window !== 'undefined') {
    // 최초 접속 1초 후 체크
    setTimeout(checkServerVersion, 1000);

    // 탭/화면 복귀 시 (스마트폰 화면 켬, 카톡에서 브라우저 복귀, 탭 전환) 즉시 체크
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        checkServerVersion();
      }
    });

    window.addEventListener('focus', function() {
      checkServerVersion();
    });

    // 5초 주기로 정밀 폴링 (새 배포 발생 시 5초 이내에 자동 감지되어 새로고침됨)
    setInterval(checkServerVersion, 5000);
  }
})();
