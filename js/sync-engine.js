/**
 * sync-engine.js - 중앙 마스터 근무표 실시간 자동 동기화 엔진
 * 
 * 복잡하고 긴 링크 복사 없이, 깔끔한 기본 웹 주소(https://kbs-4shift-5855.surge.sh) 하나로
 * 모든 공유된 사용자와 스마트폰 APK에서 11월 근무(휴가, 대근)가 자동으로 즉시 반영됩니다.
 */
(function() {
  'use strict';

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
    }, 3000);
  }

  // 서버의 마스터 근무표(/master-shifts.json) 자동 동기화
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

    var fetchUrl = '/master-shifts.json?_t=' + Date.now();

    fetch(fetchUrl, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
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

      // 마스터 근무표(11월 5일 일근휴가, 12일·20일 일근대근 등) 강제 머지
      for (var dateKey in data.overrides) {
        var masterVal = data.overrides[dateKey];
        var curVal = curOverrides[dateKey];
        if (!curVal || curVal.shiftType !== masterVal.shiftType) {
          curOverrides[dateKey] = masterVal;
          updated = true;
        }
      }

      if (updated || isManualClick) {
        if (storage.setOverrides) storage.setOverrides(curOverrides);

        // 화면 즉각 렌더링
        if (window.app) {
          if (typeof window.app.renderCalendar === 'function') window.app.renderCalendar();
          if (typeof window.app.updateHeaderTodayDisplay === 'function') window.app.updateHeaderTodayDisplay();
        }

        if (isManualClick) {
          showToast('🔄 최신 근무표(11월 대근·휴가 포함)가 성공적으로 갱신되었습니다!');
        } else if (updated) {
          showToast('✨ 최신 근무표로 자동 업데이트되었습니다!');
        }
      }
    })
    .catch(function(err) {
      if (isManualClick) {
        // 오프라인이나 통신 지연 시 기본 저장소 데이터 기반 화면 리프레시
        if (window.app && typeof window.app.renderCalendar === 'function') {
          window.app.renderCalendar();
        }
        showToast('🔄 화면을 새로고침했습니다.');
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
    }, 500);

    // 탭 복귀 시(화면 켬, 카톡에서 브라우저 복귀 등) 자동 점검
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        fetchAndApplyMasterShifts(false);
      }
    });
  });

  window.fetchAndApplyMasterShifts = fetchAndApplyMasterShifts;
})();
