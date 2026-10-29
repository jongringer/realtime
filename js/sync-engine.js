/**
 * sync-engine.js - realtime 개인별 로컬 저장소 기반 즉시 동기화 및 UI 새로고침 엔진
 * (외부 공용 클라우드 공유 없이 기기별 개인 데이터 완전 독립 보장 · APK/웹 모두 자유 편집 지원)
 */
(function() {
  'use strict';

  function spinSyncIcon() {
    var icon = document.getElementById('syncIcon');
    if (icon) {
      icon.style.transition = 'transform 0.55s ease';
      icon.style.transform = 'rotate(360deg)';
      setTimeout(function() {
        icon.style.transition = 'none';
        icon.style.transform = 'rotate(0deg)';
      }, 600);
    }
  }

  function refreshUI() {
    try {
      if (window.app) {
        if (typeof window.app.loadProfileToUI === 'function') window.app.loadProfileToUI();
        if (typeof window.app.updateTodayCard === 'function') window.app.updateTodayCard();
        if (typeof window.app.renderCalendar === 'function') window.app.renderCalendar();
      }
      if (window.transitManager && typeof window.transitManager.fetchAllData === 'function') {
        window.transitManager.fetchAllData(true);
      }
    } catch (e) {
      console.warn('[SyncEngine] UI 갱신 오류:', e);
    }
  }

  function pushNow() {
    return Promise.resolve(true);
  }

  function syncNow(manualTrigger) {
    if (manualTrigger) {
      spinSyncIcon();
      refreshUI();
      if (window.app && typeof window.app.showWeatherToast === 'function') {
        window.app.showWeatherToast('🔄 캘린더 및 실시간 대중교통 정보를 새로고침했습니다.');
      }
    }
    return Promise.resolve(true);
  }

  function initSyncEngine() {
    // 웹/APK 구분 없이 항상 편집 가능하도록 읽기전용 클래스 제거 보장
    if (document.body) {
      document.body.classList.remove('web-readonly-mode');
    }
    var btnSync = document.getElementById('btnSyncRefresh');
    if (btnSync) {
      btnSync.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        syncNow(true);
      });
    }
  }

  if (typeof window !== 'undefined') {
    window.syncEngine = {
      pushNow: pushNow,
      syncNow: syncNow,
      isApkClient: function() { return true; },
      canPushToCloud: function() { return true; },
      setWebToApkSyncEnabled: function() {}
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSyncEngine);
    } else {
      initSyncEngine();
    }
  }
})();
