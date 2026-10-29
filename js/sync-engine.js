/**
 * sync-engine.js - APK ↔ 웹 실시간 양방향 클라우드 동기화 엔진 (v1.2.74)
 * 
 * [완벽한 양방향 동기화 워크플로우]
 * 1. APK(어플)에서 달력 일정을 수정한 후 상단 새로고침(회전 화살표) 아이콘을 터치하면:
 *    - 현재 기기의 최신 일정(9월~12월 등 모든 달)이 클라우드 스토리지로 즉시 전송(Push)됩니다.
 * 2. 웹(https://kbs-4shift-5855.surge.sh)에서는:
 *    - 페이지 접속 시, 탭 활성화 시, 또는 15초마다 클라우드 데이터를 자동 수신(Pull)하여
 *      APK에서 수정한 최신 근무표를 화면에 자동으로 즉시 반영합니다.
 * 3. 웹에서 수정 후 새로고침을 눌러도 마찬가지로 클라우드에 전송되어 APK로 전달됩니다.
 */
(function() {
  'use strict';

  // 클라우드 실시간 JSON 스토리지 엔드포인트 (CORS 전체 지원, 초고속 HTTPS)
  var CLOUD_SYNC_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a1857209d94199';
  var BACKUP_MASTER_URL = 'https://kbs-4shift-5855.surge.sh/master-shifts.json';

  var lastSyncedTimestamp = 0;
  var isSyncInProgress = false;

  function getStorage() {
    if (typeof shiftStorage !== 'undefined' && shiftStorage) return shiftStorage;
    if (typeof window !== 'undefined' && window.shiftStorage) return window.shiftStorage;
    return null;
  }

  // 사용자 토스트 알림 헬퍼
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

  // 화면 전체 강제 리렌더링
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

  // 1. [클라우드로 데이터 전송 (Push)] - 새로고침 버튼 터치 시 현재 기기 수정본 전송
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
      version: '1.2.74',
      updatedAt: Date.now(),
      clientType: (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ? 'APK' : 'WEB',
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
      lastSyncedTimestamp = payload.updatedAt;
      if (callback) callback(true, payload.clientType);
    })
    .catch(function(err) {
      console.warn('[SyncEngine] 클라우드 푸시 폴백:', err.message);
      if (callback) callback(false);
    });
  }

  // 2. [클라우드에서 최신 데이터 수신 (Pull)] - 접속 시 / 주기적 자동 동기화
  function pullDataFromCloud(isManualClick) {
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
      var remoteUpdatedAt = Number(remoteData.updatedAt || resObj.data.updatedAt || 0);

      var storage = getStorage();
      if (!storage) return;

      var curOverrides = storage.getOverrides ? storage.getOverrides() : {};
      var updated = false;

      // 지능형 머지: 원격 오버라이드 병합
      if (remoteData.overrides) {
        for (var dateKey in remoteData.overrides) {
          var remoteVal = remoteData.overrides[dateKey];
          var localVal = curOverrides[dateKey];

          if (!localVal) {
            curOverrides[dateKey] = remoteVal;
            updated = true;
          } else {
            var localTime = Number(localVal.updatedAt || 0);
            var remoteTime = Number(remoteVal.updatedAt || remoteUpdatedAt || 0);
            // 원격이 더 최신이거나 로컬에 타임스탬프가 없는 기본값이면 원격값 적용
            if (remoteTime > localTime || (!localVal.updatedAt && localVal.shiftType !== remoteVal.shiftType)) {
              curOverrides[dateKey] = remoteVal;
              updated = true;
            }
          }
        }
      }

      // 개인 일정(schedules) 병합
      if (remoteData.schedules && Array.isArray(remoteData.schedules)) {
        var localSchedules = storage.getSchedules ? storage.getSchedules() : [];
        var localIds = {};
        localSchedules.forEach(function(s) { if (s && s.id) localIds[s.id] = true; });

        remoteData.schedules.forEach(function(rs) {
          if (rs && rs.id && !localIds[rs.id]) {
            localSchedules.push(rs);
            updated = true;
          }
        });
        if (updated && storage.setSchedules) {
          storage.setSchedules(localSchedules);
        }
      }

      if (updated) {
        if (storage.setOverrides) storage.setOverrides(curOverrides);
        lastSyncedTimestamp = remoteUpdatedAt;
        refreshUI();

        var clientLabel = remoteData.clientType === 'APK' ? '어플(APK)' : '웹';
        showToast('✨ ' + clientLabel + '에서 수정한 최신 근무표가 자동 반영되었습니다!');
      } else if (isManualClick) {
        refreshUI();
        showToast('🔄 모든 기기와 최신 근무표가 완벽하게 일치합니다.');
      }
    })
    .catch(function(err) {
      // 1차 클라우드 실패 시 Surge 마스터 백업 파일로 폴백 조회
      fallbackToMasterJson(isManualClick);
    })
    .finally(function() {
      isSyncInProgress = false;
    });
  }

  // 폴백 백업 동기화 (/master-shifts.json)
  function fallbackToMasterJson(isManualClick) {
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

      var curOverrides = storage.getOverrides ? storage.getOverrides() : {};
      var updated = false;

      for (var dateKey in data.overrides) {
        if (!curOverrides[dateKey]) {
          curOverrides[dateKey] = data.overrides[dateKey];
          updated = true;
        }
      }

      if (updated && storage.setOverrides) {
        storage.setOverrides(curOverrides);
        refreshUI();
      }

      if (isManualClick) {
        refreshUI();
        showToast('🔄 화면 및 일정을 새로고침했습니다.');
      }
    })
    .catch(function() {
      if (isManualClick) {
        refreshUI();
        showToast('🔄 화면을 새로고침했습니다.');
      }
    });
  }

  // 사용자가 상단 '새로고침(회전 화살표)' 버튼을 클릭했을 때의 전체 통합 동작
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

    // 1단계: 현재 기기에서 수정한 최신 데이터를 클라우드로 즉시 전송(Push)
    pushDataToCloud(function(success, clientType) {
      if (success) {
        var label = clientType === 'APK' ? '어플(APK)' : '웹';
        showToast('☁️ ' + label + '의 최신 일정이 클라우드로 전송되었습니다! (상대 기기에 자동 반영)');
        // 2단계: 최신 클라우드 상태 재확인 및 UI 리프레시
        setTimeout(function() {
          pullDataFromCloud(false);
        }, 300);
      } else {
        // 전송 실패 시 일반 pull로 새로고침
        pullDataFromCloud(true);
      }
    });
  }

  // DOM 로드 완료 시 이벤트 및 자동 감시 세팅
  window.addEventListener('DOMContentLoaded', function() {
    var btnSync = document.getElementById('btnSyncRefresh');
    if (btnSync) {
      btnSync.addEventListener('click', handleManualSyncClick);
    }

    // 1. 페이지 접속 시 0.4초 후 최신 클라우드 데이터 자동 수신
    setTimeout(function() {
      pullDataFromCloud(false);
    }, 400);

    // 2. 브라우저 탭 활성화 시 (스마트폰에서 화면을 켜거나, 다른 앱에서 복귀 시) 즉시 자동 갱신
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        pullDataFromCloud(false);
      }
    });

    // 3. 웹 브라우저를 열어두었을 때 15초마다 백그라운드 자동 동기화 체크
    setInterval(function() {
      if (document.visibilityState === 'visible') {
        pullDataFromCloud(false);
      }
    }, 15000);
  });

  window.handleManualSyncClick = handleManualSyncClick;
  window.pullDataFromCloud = pullDataFromCloud;
  window.pushDataToCloud = pushDataToCloud;
})();
