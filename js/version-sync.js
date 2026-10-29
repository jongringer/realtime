/**
 * version-sync.js - 실시간 버전 동기화 (웹 자동 갱신 + APK 신규 릴리스 감지 배너)
 */
(function() {
  'use strict';

  var LATEST_APK_URL = 'https://github.com/jongringer/realtime/releases/latest/download/realtime.apk';
  var RELEASES_PAGE_URL = 'https://github.com/jongringer/realtime/releases';
  var REMOTE_VERSION_URL = 'https://kbs-realtime.surge.sh/version.json';

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

  function isNativeApk() {
    try {
      if (window.AndroidAlarm) return true;
      if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
        return window.Capacitor.isNativePlatform();
      }
      return window.location.protocol === 'capacitor:' || (window.location.hostname === 'localhost' && !window.location.port);
    } catch (e) {
      return false;
    }
  }

  function compareSemver(a, b) {
    var pa = String(a || '0.0.0').replace(/^v/i, '').split('.').map(function(n) { return parseInt(n, 10) || 0; });
    var pb = String(b || '0.0.0').replace(/^v/i, '').split('.').map(function(n) { return parseInt(n, 10) || 0; });
    for (var i = 0; i < 3; i++) {
      var diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  function injectSettingsVersionCard() {
    var curVer = window.__APP_VERSION__ || '1.0.0';
    var resetBtn = document.getElementById('btnResetAllData');
    if (!resetBtn || document.getElementById('settingsAppVersionBox')) return;

    var wrap = document.createElement('div');
    wrap.id = 'settingsAppVersionBox';
    wrap.style.cssText = 'margin-bottom:12px; padding:12px 14px; border-radius:14px; background:rgba(37,99,235,0.08); border:1px solid rgba(37,99,235,0.25); display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;';
    wrap.innerHTML =
      '<div style="font-size:14px; font-weight:800;">📱 현재 버전: <strong style="color:#2563eb;">v' + curVer + '</strong></div>' +
      '<div style="display:flex; gap:6px;">' +
        '<a href="' + LATEST_APK_URL + '" target="_blank" rel="noopener" style="padding:7px 12px; border-radius:9px; background:#2563eb; color:#ffffff; font-size:13px; font-weight:800; text-decoration:none;">📥 최신 APK 받기</a>' +
        '<a href="' + RELEASES_PAGE_URL + '" target="_blank" rel="noopener" style="padding:7px 10px; border-radius:9px; background:rgba(15,23,42,0.08); color:inherit; font-size:12.5px; font-weight:800; text-decoration:none;">릴리스 목록</a>' +
      '</div>';

    if (resetBtn.parentNode) {
      resetBtn.parentNode.insertBefore(wrap, resetBtn);
    }
  }

  function showApkUpdateBanner(latestVersion) {
    var cleanVer = String(latestVersion || '').replace(/^v/i, '');
    if (!cleanVer) return;
    var dismissed = sessionStorage.getItem('realtime_dismissed_update_' + cleanVer);
    if (dismissed === '1') return;

    var existing = document.getElementById('apkUpdateNotifyBanner');
    if (existing) return;

    var banner = document.createElement('div');
    banner.id = 'apkUpdateNotifyBanner';
    banner.style.cssText = 'margin:0 0 10px 0; padding:10px 13px; border-radius:14px; background:linear-gradient(135deg,#1d4ed8,#0284c7); color:#ffffff; display:flex; align-items:center; justify-content:space-between; gap:8px; box-shadow:0 6px 16px rgba(2,132,199,0.3); font-size:13.5px; font-weight:800;';
    banner.innerHTML =
      '<span>🆕 새 버전 <strong>v' + cleanVer + '</strong> 출시!</span>' +
      '<div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">' +
        '<a href="' + LATEST_APK_URL + '" target="_blank" rel="noopener" style="padding:6px 11px; border-radius:9px; background:#ffffff; color:#1d4ed8; font-size:12.5px; font-weight:900; text-decoration:none;">업데이트 APK 다운로드</a>' +
        '<button type="button" id="btnCloseApkUpdateBanner" style="border:none; background:rgba(255,255,255,0.2); color:#fff; width:26px; height:26px; border-radius:50%; font-size:13px; cursor:pointer;">✕</button>' +
      '</div>';

    var container = document.getElementById('firstScreenView') || document.querySelector('.app-container');
    if (container) {
      container.insertBefore(banner, container.firstChild);
      var closeBtn = document.getElementById('btnCloseApkUpdateBanner');
      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          sessionStorage.setItem('realtime_dismissed_update_' + cleanVer, '1');
          banner.remove();
        });
      }
    }
  }

  var isChecking = false;
  var isUpdating = false;

  function applyWebUpdate(buildTimestamp) {
    if (isUpdating) return;
    isUpdating = true;

    var cleanUrl = window.location.origin + window.location.pathname;
    var searchParams = new URLSearchParams(window.location.search);
    searchParams.set('_v', buildTimestamp || Date.now());
    var newUrl = cleanUrl + '?' + searchParams.toString();

    setTimeout(function() {
      window.location.replace(newUrl);
    }, 300);
  }

  function checkRemoteApkRelease() {
    var curVer = window.__APP_VERSION__ || '1.0.0';
    fetch(REMOTE_VERSION_URL + '?_t=' + Date.now(), { cache: 'no-store' })
      .then(function(res) { return res.ok ? res.json() : null; })
      .then(function(data) {
        if (data && data.version && compareSemver(data.version, curVer) > 0) {
          showApkUpdateBanner(data.version);
        }
      })
      .catch(function() {});
  }

  function checkServerVersion() {
    if (isNativeApk()) {
      checkRemoteApkRelease();
      return;
    }
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
          var activeEl = document.activeElement;
          var isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

          if (isTyping) {
            activeEl.addEventListener('blur', function onBlur() {
              activeEl.removeEventListener('blur', onBlur);
              applyWebUpdate(serverBuildTime);
            });
          } else {
            applyWebUpdate(serverBuildTime);
          }
        }
      })
      .catch(function() {
        isChecking = false;
      });
  }

  cleanLegacyCaches();
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectSettingsVersionCard);
    } else {
      injectSettingsVersionCard();
    }

    setTimeout(checkServerVersion, 1200);

    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        checkServerVersion();
      }
    });

    window.addEventListener('focus', function() {
      checkServerVersion();
    });

    if (!isNativeApk()) {
      setInterval(checkServerVersion, 15000);
    }
  }
})();
