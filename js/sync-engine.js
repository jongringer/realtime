/**
 * sync-engine.js - 중앙 마스터 근무표 실시간 자동 동기화 엔진 (v1.2.73)
 * 
 * - 어플(APK)과 웹(Surge) 양쪽 모두에서 9월, 10월, 11월, 12월 등 모든 달의 일정을 실시간 동기화
 * - 사용자가 수정한 일정을 영구 보존하며, 마스터의 새 일정과 안전하게 지능형 머지
 * - 스마트폰 APK 내에서도 원격 Surge CDN 서버(https://kbs-4shift-5855.surge.sh)를 직접 조회
 */
(function() {
  'use strict';

  var REMOTE_SERVER = 'https://kbs-4shift-5855.surge.sh/';

  function getStorage() {
    if (typeof shiftStorage !== 'undefined' && shiftStorage) return shiftStorage;
    if (typeof window !== 'undefined' && window.shiftStorage) return window.shiftStorage;
    return null;
  }

  // 토스트 알림 헬퍼
  function showToast(message, isSuccess) {
    if (isSuccess === undefined) isSuccess = true;
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
      'padding: 12px 22px',
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
    }, 3200);
  }

  // 서버의 마스터 근무표(/master-shifts.json) 자동 동기화 (앱/웹 완벽 대응)
  function fetchAndApplyMasterShifts(isManualClick) {
    var icon = document.getElementById('syncIcon');
    if (icon && isManualClick) {
      icon.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      icon.style.transform = 'rotate(360deg)';
      setTimeout(function() {
        icon.style.transition = 'none';
        icon.style.transform = 'rotate(0deg)';
      }, 650);
    }

    // 안드로이드 네이티브 앱(Capacitor) 또는 로컬 파일인 경우 원격 서버 URL 지정
    var isApp = (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
                window.location.protocol === 'file:' ||
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1';
    
    var targetUrl = (isApp ? REMOTE_SERVER : '') + 'master-shifts.json?_t=' + Date.now();

    fetch(targetUrl, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    })
    .catch(function() {
      // 1차 실패 시 상대경로로 폴백 시도
      return fetch('master-shifts.json?_t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
    })
    .then(function(res) {
      if (!res.ok) throw new Error('master-shifts.json status ' + res.status);
      return res.json();
    })
    .then(function(data) {
      if (!data || !data.overrides) return;

      var storage = getStorage();
      if (!storage) return;

      var curOverrides = storage.getOverrides ? storage.getOverrides() : {};
      var updated = false;

      // 마스터 근무표(9월, 10월, 11월, 12월 등) 지능형 머지
      for (var dateKey in data.overrides) {
        var masterVal = data.overrides[dateKey];
        var curVal = curOverrides[dateKey];

        if (!curVal) {
          // 로컬에 없는 날짜는 마스터에서 즉시 적용
          curOverrides[dateKey] = masterVal;
          updated = true;
        } else if (!curVal.updatedAt && curVal.shiftType !== masterVal.shiftType) {
          // 사용자가 직접 수정한 적 없는 기본 항목에 한해서만 마스터 최신값으로 갱신
          curOverrides[dateKey] = masterVal;
          updated = true;
        }
      }

      if (updated || isManualClick) {
        if (storage.setOverrides) storage.setOverrides(curOverrides);

        // 달력 및 화면 전체 즉각 리렌더링
        if (window.app) {
          if (typeof window.app.renderCalendar === 'function') window.app.renderCalendar();
          if (typeof window.app.renderTodayCard === 'function') window.app.renderTodayCard();
          if (typeof window.app.renderMonthlyNotes === 'function') window.app.renderMonthlyNotes();
          if (typeof window.app.updateHeaderTodayDisplay === 'function') window.app.updateHeaderTodayDisplay();
        }

        if (isManualClick) {
          showToast('🔄 최신 근무표(9월~12월 일정)가 성공적으로 동기화되었습니다!');
        } else if (updated) {
          showToast('✨ 최신 근무표로 자동 업데이트되었습니다!');
        }
      }
    })
    .catch(function(err) {
      console.warn('[SyncEngine] 마스터 동기화 알림:', err.message);
      if (isManualClick) {
        // 오프라인이나 네트워크 지연 시에도 로컬 데이터 기반 화면 새로고침 보장
        if (window.app && typeof window.app.renderCalendar === 'function') {
          window.app.renderCalendar();
          if (typeof window.app.renderTodayCard === 'function') window.app.renderTodayCard();
          if (typeof window.app.renderMonthlyNotes === 'function') window.app.renderMonthlyNotes();
        }
        showToast('🔄 화면 및 일정을 새로고침했습니다.');
      }
    });
  }

  // DOM 로드 완료 시
  window.addEventListener('DOMContentLoaded', function() {
    var btnSync = document.getElementById('btnSyncRefresh');
    if (btnSync) {
      btnSync.addEventListener('click', function() {
        fetchAndApplyMasterShifts(true);
      });
    }

    // 접속 즉시 자동으로 마스터 근무표 최신화 실행
    setTimeout(function() {
      fetchAndApplyMasterShifts(false);
    }, 400);

    // 탭 복귀 시(화면 켬, 카톡에서 브라우저 복귀 등) 자동 점검
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        fetchAndApplyMasterShifts(false);
      }
    });
  });

  window.fetchAndApplyMasterShifts = fetchAndApplyMasterShifts;
})();
