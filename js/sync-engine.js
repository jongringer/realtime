/**
 * sync-engine.js - APK 우선 마스터 실시간 클라우드 동기화 엔진 (v1.2.75)
 * 
 * [철저한 단일 원천(Single Source of Truth) 원칙]
 * 1. 어플(APK): 최종철 님 전용 마스터 콘솔.
 *    - APK에서 근무표를 수정하고 상단 새로고침을 누르면 클라우드로 최신 데이터가 즉시 전달됩니다.
 * 2. 웹(kbs-4shift-5855.surge.sh): 타인 열람용 웹 뷰어.
 *    - 웹 접속 시 클라우드의 APK 마스터 데이터를 1순위로 즉각 가져와 화면에 그대로 표출합니다.
 * 3. 사용자 요청에 따라 번거롭고 불필요한 '자동 반영' 토스트 팝업은 일절 띄우지 않고 조용히 화면만 갱신합니다.
 */
(function() {
  'use strict';

  var CLOUD_SYNC_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a1857209d94199';
  var BACKUP_MASTER_URL = 'https://kbs-4shift-5855.surge.sh/master-shifts.json';

  var isSyncInProgress = false;

  function isNativeApp() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  function getStorage() {
    if (typeof shiftStorage !== 'undefined' && shiftStorage) return shiftStorage;
    if (typeof window !== 'undefined' && window.shiftStorage) return window.shiftStorage;
    return null;
  }

  // 화면 강제 리렌더링
  function refreshUI() {
    if (!window.app) return;
    try {
      if (typeof window.app.renderCalendar === 'function') window.app.renderCalendar();
      if (typeof window.app.renderTodayCard === 'function') window.app.renderTodayCard();
      if (typeof window.app.renderMonthlyNotes === 'function') window.app.renderMonthlyNotes();
      if (typeof window.app.updateHeaderTodayDisplay === 'function') window.app.updateHeaderTodayDisplay();
    } catch (e) {
      console.warn('[SyncEngine] UI 리렌더링 알림:', e);
    }
  }

  // 1. [클라우드로 데이터 전송 (Push)] - APK에서 새로고침 누를 때 실행
  function pushDataToCloud(callback) {
    var storage = getStorage();
    if (!storage) {
      if (callback) callback(false);
      return;
    }

    var overrides = storage.getOverrides ? storage.getOverrides() : {};
    var schedules = storage.getSchedules ? storage.getSchedules() : [];
    var profile = storage.getProfile ? storage.getProfile() : {};

    var payload = {
      version: '1.2.75',
      updatedAt: Date.now(),
      clientType: isNativeApp() ? 'APK' : 'WEB',
      overrides: overrides,
      schedules: schedules,
      profile: profile
    };

    var reqBody = JSON.stringify({
      name: 'kbs_shifts_master',
      data: {
        updatedAt: payload.updatedAt,
        payload: JSON.stringify(payload)
      }
    });

    fetch(CLOUD_SYNC_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: reqBody
    })
    .then(function(res) {
      if (!res.ok) throw new Error('Cloud HTTP ' + res.status);
      return res.json();
    })
    .then(function(result) {
      if (callback) callback(true);
    })
    .catch(function(err) {
      console.warn('[SyncEngine] 클라우드 푸시 오류:', err.message);
      if (callback) callback(false);
    });
  }

  // 2. [클라우드에서 최신 데이터 수신 (Pull)] - 웹 열람 시 & 주기적 감지
  function pullDataFromCloud() {
    if (isSyncInProgress) return;
    isSyncInProgress = true;

    fetch(CLOUD_SYNC_URL + '?_t=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    })
    .then(function(res) {
      if (!res.ok) throw new Error('Cloud HTTP ' + res.status);
      return res.json();
    })
    .then(function(resObj) {
      if (!resObj || !resObj.data || !resObj.data.payload) {
        throw new Error('Invalid cloud data');
      }

      var remoteData = JSON.parse(resObj.data.payload);
      var storage = getStorage();
      if (!storage) return;

      var isApp = isNativeApp();

      if (!isApp) {
        // [웹 환경 - 열람 전용]: 어플(APK)이 올린 클라우드 데이터가 절대 마스터
        if (remoteData.overrides && storage.setOverrides) {
          storage.setOverrides(remoteData.overrides);
        }
        if (remoteData.schedules && Array.isArray(remoteData.schedules) && storage.setSchedules) {
          storage.setSchedules(remoteData.schedules);
        }
        refreshUI();
      } else {
        // [어플 환경]: 본인 기기가 마스터이므로 로컬에 없는 날짜만 안전 보충
        var curOverrides = storage.getOverrides ? storage.getOverrides() : {};
        var updated = false;

        if (remoteData.overrides) {
          for (var dateKey in remoteData.overrides) {
            if (!curOverrides[dateKey]) {
              curOverrides[dateKey] = remoteData.overrides[dateKey];
              updated = true;
            }
          }
        }
        if (updated && storage.setOverrides) {
          storage.setOverrides(curOverrides);
        }
        refreshUI();
      }
    })
    .catch(function(err) {
      // 1차 클라우드 실패 시 Surge 마스터 백업 파일로 폴백 조회
      fallbackToMasterJson();
    })
    .finally(function() {
      isSyncInProgress = false;
    });
  }

  // 폴백 백업 동기화 (/master-shifts.json)
  function fallbackToMasterJson() {
    var targetUrl = BACKUP_MASTER_URL + '?_t=' + Date.now();
    fetch(targetUrl, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
    .catch(function() {
      return fetch('master-shifts.json?_t=' + Date.now());
    })
    .then(function(res) {
      if (!res.ok) throw new Error('status ' + res.status);
      return res.json();
    })
    .then(function(data) {
      if (!data || !data.overrides) return;
      var storage = getStorage();
      if (!storage) return;

      var isApp = isNativeApp();
      if (!isApp && storage.setOverrides) {
        storage.setOverrides(data.overrides);
        refreshUI();
      }
    })
    .catch(function() {});
  }

  // 상단 새로고침(회전 화살표) 클릭 시 동작
  function handleManualSyncClick() {
    var icon = document.getElementById('syncIcon');
    if (icon) {
      icon.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      icon.style.transform = 'rotate(360deg)';
      setTimeout(function() {
        icon.style.transition = 'none';
        icon.style.transform = 'rotate(0deg)';
      }, 650);
    }

    if (isNativeApp()) {
      // 어플(APK)에서 클릭: 현재 APK 데이터를 클라우드로 즉시 전송
      pushDataToCloud(function(success) {
        refreshUI();
      });
    } else {
      // 웹에서 클릭: 클라우드에서 최신 APK 데이터 즉시 땡겨옴
      pullDataFromCloud();
    }
  }

  // DOM 로드 완료 시
  window.addEventListener('DOMContentLoaded', function() {
    var btnSync = document.getElementById('btnSyncRefresh');
    if (btnSync) {
      btnSync.addEventListener('click', handleManualSyncClick);
    }

    // 1. 페이지 접속 시 즉시 최신 클라우드 데이터 수신
    setTimeout(function() {
      pullDataFromCloud();
    }, 200);

    // 2. 화면 켜짐 및 브라우저 탭 복귀 시 자동 수신
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        pullDataFromCloud();
      }
    });

    // 3. 웹 열람 중 10초마다 백그라운드 자동 수신
    setInterval(function() {
      if (document.visibilityState === 'visible') {
        pullDataFromCloud();
      }
    }, 10000);
  });

  window.handleManualSyncClick = handleManualSyncClick;
  window.pullDataFromCloud = pullDataFromCloud;
  window.pushDataToCloud = pushDataToCloud;
})();
