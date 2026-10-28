/**
 * sync-engine.js - 스마트폰 APK ↔ 웹(Surge) 실시간 근무표 상호 동기화 엔진
 * 
 * APK나 웹에서 11월달 등 달력을 수정한 후 새로고침(회전 화살표) 아이콘을 터치하면
 * 현재 기기의 모든 근무표 특이사항을 담은 동기화 링크를 자동 생성 및 공유합니다.
 */
(function() {
  'use strict';

  // 1. 토스트 알림 헬퍼
  function showToast(message, isSuccess = true) {
    var old = document.getElementById('sync-toast-msg');
    if (old) old.remove();

    var toast = document.createElement('div');
    toast.id = 'sync-toast-msg';
    toast.style.cssText = [
      'position: fixed',
      'bottom: 24px',
      'left: 50%',
      'transform: translateX(-50%)',
      'z-index: 9999999',
      'background: ' + (isSuccess ? 'linear-gradient(135deg, #0284c7, #0369a1)' : '#ef4444'),
      'color: #ffffff',
      'padding: 12px 20px',
      'border-radius: 999px',
      'box-shadow: 0 8px 24px rgba(0,0,0,0.3)',
      'font-size: 13.5px',
      'font-weight: 700',
      'text-align: center',
      'line-height: 1.4',
      'border: 1px solid rgba(255,255,255,0.25)',
      'animation: slideUpToast 0.3s ease-out'
    ].join(';');

    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(function() {
      if (toast && toast.parentNode) {
        toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 10px)';
        setTimeout(function() { toast.remove(); }, 400);
      }
    }, 3500);
  }

  // 2. 동기화 링크 생성 및 복사/공유
  function triggerSyncShare() {
    var icon = document.getElementById('syncIcon');
    if (icon) {
      icon.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      icon.style.transform = 'rotate(360deg)';
      setTimeout(function() {
        icon.style.transition = 'none';
        icon.style.transform = 'rotate(0deg)';
      }, 650);
    }

    try {
      if (typeof StorageManager === 'undefined') {
        showToast('저장소 로드 대기 중입니다. 잠시 후 다시 눌러주세요.', false);
        return;
      }

      var overrides = StorageManager.getOverrides();
      var profile = StorageManager.getProfile();
      var baseSettings = StorageManager.getBaseSettings();

      var payload = {
        overrides: overrides,
        profile: profile,
        baseSettings: baseSettings,
        ts: Date.now()
      };

      var jsonStr = JSON.stringify(payload);
      // UTF-8 안전 Base64 인코딩
      var base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
      }));

      // 서지 클라우드 정규 도메인 기준 동기화 링크 생성
      var baseUrl = 'https://kbs-4shift-5855.surge.sh/';
      var syncUrl = baseUrl + '?sync=' + encodeURIComponent(base64);

      // 클립보드 복사 시도
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(syncUrl).catch(function() {});
      }

      // 스마트폰 네이티브 공유 다이얼로그 (카카오톡, 메시지 등)
      if (navigator.share && /android|iphone|ipad/i.test(navigator.userAgent)) {
        navigator.share({
          title: (profile && profile.name ? profile.name : '최종철 님') + ' 근무표 동기화',
          text: '수정된 최신 근무표(11월 포함) 동기화 링크입니다. 열면 즉시 동일하게 반영됩니다.',
          url: syncUrl
        }).then(function() {
          showToast('📋 최신 근무표 동기화 링크가 공유되었습니다!');
        }).catch(function(err) {
          // 사용자가 취소한 경우에도 클립보드 복사 안내
          showToast('📋 최신 근무표 동기화 링크가 복사되었습니다!\n카카오톡에 붙여넣어 웹에서 열면 즉시 반영됩니다.');
        });
      } else {
        showToast('📋 최신 근무표 동기화 링크가 복사되었습니다!\n웹 브라우저나 카카오톡에 붙여넣으면 즉시 반영됩니다.');
      }
    } catch (e) {
      console.error('[SyncEngine] 동기화 링크 생성 실패:', e);
      showToast('동기화 링크 생성 중 오류가 발생했습니다.', false);
    }
  }

  // 3. 페이지 접속 시 URL에 포함된 동기화 데이터 자동 수신 및 머지
  function checkUrlSync() {
    try {
      var params = new URLSearchParams(window.location.search);
      var syncData = params.get('sync');
      if (!syncData) return;

      // Base64 디코딩
      var jsonStr = decodeURIComponent(Array.prototype.map.call(atob(decodeURIComponent(syncData)), function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      var payload = JSON.parse(jsonStr);
      if (payload && payload.overrides) {
        if (typeof StorageManager !== 'undefined') {
          var curOverrides = StorageManager.getOverrides();
          var merged = Object.assign({}, curOverrides, payload.overrides);
          StorageManager.setOverrides(merged);

          if (payload.profile) StorageManager.setProfile(payload.profile);
          if (payload.baseSettings) StorageManager.setBaseSettings(payload.baseSettings);

          // 화면 갱신
          if (window.app && typeof window.app.renderCalendar === 'function') {
            window.app.renderCalendar();
          }
          if (window.app && typeof window.app.updateHeaderTodayDisplay === 'function') {
            window.app.updateHeaderTodayDisplay();
          }

          showToast('✨ 수정한 근무표(11월 포함)가 웹에 즉각 동기화되었습니다!');

          // URL 파라미터 깨끗하게 정리
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      }
    } catch (e) {
      console.warn('[SyncEngine] URL 동기화 파싱 건너뜀:', e);
    }
  }

  // DOM 로드 완료 시 이벤트 바인딩
  window.addEventListener('DOMContentLoaded', function() {
    var btnSync = document.getElementById('btnSyncRefresh');
    if (btnSync) {
      btnSync.addEventListener('click', triggerSyncShare);
    }

    // 0.5초 후 URL 동기화 파라미터 점검
    setTimeout(checkUrlSync, 300);
  });

  window.triggerSyncShare = triggerSyncShare;
})();
