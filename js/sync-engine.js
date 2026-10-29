/**
 * sync-engine.js - APK ↔ 웹 실시간 양방향 클라우드 동기화 엔진 (v1.2.76)
 *
 * - Lamport 논리 시계(updatedAt) + 전체 스냅샷 동기화로 APK와 웹 어느 쪽에서
 *   어느 달(지난달, 이번달, 다음달, 다다음달 등)의 일정을 추가/변경/삭제하더라도
 *   즉시 클라우드에 반영되고 상대 기기에 100% 동일하게 동기화됩니다.
 * - 연속 수정 자동 병합(Coalescing Queue) 및 FLOOD_WAIT 자동 재시도로
 *   빠른 연속 입력 시에도 API 제한 없이 100% 안전하게 전송됩니다.
 * - 불필요한 토스트 공지 없이 조용하고 정확하게 화면만 갱신합니다.
 */
(function() {
  'use strict';

  var TELEGRAPH_PATH = 'KBS-SHIFT-SYNC-10-29';
  var TELEGRAPH_TOKEN = 'cad37a8299f5f01af3cd742787193d2e28f317467f91bc42d3fff0317000';
  var TELEGRAPH_EDIT_URL = 'https://api.telegra.ph/editPage/' + TELEGRAPH_PATH;
  var TELEGRAPH_GET_URL = 'https://api.telegra.ph/getPage/' + TELEGRAPH_PATH + '?return_content=true';

  var lastKnownCloudTime = 0;
  var lastPushedTime = 0;
  var hasPendingPush = false;
  var currentPushPromise = null;
  var pushDebounceTimer = null;
  var isSyncing = false;

  function getStorage() {
    if (typeof shiftStorage !== 'undefined' && shiftStorage) return shiftStorage;
    if (typeof window !== 'undefined' && window.shiftStorage) return window.shiftStorage;
    return null;
  }

  function spinSyncIcon() {
    if (typeof document === 'undefined') return;
    var icon = document.getElementById('syncIcon');
    if (icon) {
      icon.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      icon.style.transform = 'rotate(360deg)';
      setTimeout(function() {
        icon.style.transition = 'none';
        icon.style.transform = 'rotate(0deg)';
      }, 650);
    }
  }

  function refreshUI() {
    if (typeof window === 'undefined' || !window.app) return;
    try {
      if (typeof window.app.renderCalendar === 'function') window.app.renderCalendar();
      if (typeof window.app.renderTodayCard === 'function') window.app.renderTodayCard();
      if (typeof window.app.renderMonthlyNotes === 'function') window.app.renderMonthlyNotes();
      if (typeof window.app.renderScheduleList === 'function') window.app.renderScheduleList();
      if (typeof window.app.populateScheduleDateOptions === 'function') window.app.populateScheduleDateOptions();
      if (typeof window.app.renderUploadModalSpecialNotes === 'function') window.app.renderUploadModalSpecialNotes();
    } catch (e) {
      console.warn('[SyncEngine] UI 갱신 중 오류:', e);
    }
  }

  // 현재 로컬 스토리지 스냅샷을 클라우드로 전송 (동시 호출 병합 및 FLOOD_WAIT 자동 복구 지원)
  function pushToCloud() {
    if (pushDebounceTimer) {
      clearTimeout(pushDebounceTimer);
      pushDebounceTimer = null;
    }

    if (currentPushPromise) {
      return currentPushPromise.then(function() {
        var st = getStorage();
        var curT = st && st.getUpdatedAt ? st.getUpdatedAt() : 0;
        if (hasPendingPush || curT > lastPushedTime) {
          return pushToCloud();
        }
        return true;
      });
    }

    var storage = getStorage();
    if (!storage) return Promise.resolve(false);

    var localTime = storage.getUpdatedAt ? storage.getUpdatedAt() : Date.now();
    if (localTime <= lastKnownCloudTime) {
      localTime = Math.max(Date.now(), lastKnownCloudTime + 1);
      if (storage.setUpdatedAt) storage.setUpdatedAt(localTime);
    }

    var snapshot = {
      version: '1.2.76',
      updatedAt: localTime,
      overrides: storage.getOverrides ? storage.getOverrides() : {},
      schedules: storage.getSchedules ? storage.getSchedules() : []
    };

    var contentNodes = JSON.stringify([
      { tag: 'p', children: [JSON.stringify(snapshot)] }
    ]);

    var bodyStr = 'access_token=' + encodeURIComponent(TELEGRAPH_TOKEN) +
                  '&title=' + encodeURIComponent('KBS_SHIFT_SYNC') +
                  '&content=' + encodeURIComponent(contentNodes);

    var reqPromise = fetch(TELEGRAPH_EDIT_URL, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyStr
    })
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(json) {
      currentPushPromise = null;
      if (json && json.ok) {
        lastKnownCloudTime = Math.max(lastKnownCloudTime, localTime);
        lastPushedTime = Math.max(lastPushedTime, localTime);
        var latestLocalTime = storage.getUpdatedAt ? storage.getUpdatedAt() : localTime;
        if (latestLocalTime <= localTime) {
          hasPendingPush = false;
        } else {
          return pushToCloud();
        }
        return true;
      }

      // FLOOD_WAIT 발생 시 지정된 대기 시간 직후 자동 재전송
      if (json && json.error && String(json.error).indexOf('FLOOD_WAIT_') === 0) {
        var waitSec = parseInt(String(json.error).replace('FLOOD_WAIT_', ''), 10) || 2;
        hasPendingPush = true;
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve(pushToCloud());
          }, (waitSec + 0.5) * 1000);
        });
      }

      hasPendingPush = true;
      return false;
    })
    .catch(function(err) {
      currentPushPromise = null;
      hasPendingPush = true;
      console.warn('[SyncEngine] 클라우드 전송 대기:', err.message);
      return false;
    });

    currentPushPromise = reqPromise;
    return reqPromise;
  }

  // 로컬에서 일정 변경 발생 시 즉각 호출 (동일 틱 내 다중 변경 자동 병합)
  function pushNow() {
    hasPendingPush = true;
    var storage = getStorage();
    if (storage && storage.getUpdatedAt && storage.setUpdatedAt) {
      var cur = storage.getUpdatedAt();
      if (cur <= lastKnownCloudTime) {
        storage.setUpdatedAt(Math.max(Date.now(), lastKnownCloudTime + 1));
      }
    }
    if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
    pushDebounceTimer = setTimeout(function() {
      pushDebounceTimer = null;
      pushToCloud();
    }, 150);
  }

  // 클라우드에서 최신 스냅샷 조회 및 양방향 동기화
  function syncNow(isManualClick) {
    if (isManualClick) {
      spinSyncIcon();
    }

    var waitPush = Promise.resolve(true);
    if (pushDebounceTimer || hasPendingPush || currentPushPromise) {
      waitPush = pushToCloud();
    }

    if (isSyncing) {
      return waitPush;
    }
    isSyncing = true;

    return waitPush
      .then(function() {
        var url = TELEGRAPH_GET_URL + '&_t=' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        return fetch(url, { cache: 'no-store' });
      })
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(json) {
        if (!json || !json.ok || !json.result || !Array.isArray(json.result.content) || !json.result.content[0]) {
          throw new Error('Invalid cloud response');
        }

        var firstNode = json.result.content[0];
        var rawText = (firstNode.children && firstNode.children[0]) ? firstNode.children[0] : '';
        if (!rawText || typeof rawText !== 'string') {
          throw new Error('Empty cloud payload');
        }

        var cloudSnapshot = JSON.parse(rawText);
        var cloudTime = Number(cloudSnapshot.updatedAt || 0);
        lastKnownCloudTime = Math.max(lastKnownCloudTime, cloudTime);

        var storage = getStorage();
        if (!storage) return false;

        var localTime = storage.getUpdatedAt ? storage.getUpdatedAt() : 0;

        if (cloudTime > localTime) {
          // 클라우드에 더 최신 변경사항이 있으면 즉시 로컬에 반영 (추가/수정/삭제 모두 완벽 동기화)
          if (cloudSnapshot.overrides && typeof cloudSnapshot.overrides === 'object' && storage.setOverrides) {
            storage.setOverrides(cloudSnapshot.overrides);
          }
          if (Array.isArray(cloudSnapshot.schedules) && storage.setSchedules) {
            storage.setSchedules(cloudSnapshot.schedules);
          }
          if (storage.setUpdatedAt) {
            storage.setUpdatedAt(cloudTime);
          }
          lastPushedTime = Math.max(lastPushedTime, cloudTime);
          refreshUI();
          return true;
        } else if (localTime > cloudTime) {
          // 로컬에 더 최신 변경사항이 있으면 클라우드로 즉시 푸시
          return pushToCloud().then(function() {
            refreshUI();
            return true;
          });
        } else {
          if (isManualClick) {
            refreshUI();
          }
          return true;
        }
      })
      .catch(function(err) {
        console.warn('[SyncEngine] 클라우드 조회 알림:', err.message);
        if (isManualClick) {
          refreshUI();
        }
        return false;
      })
      .finally(function() {
        isSyncing = false;
      });
  }

  // 브라우저 / 웹뷰 환경 이벤트 바인딩
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
      var btnSync = document.getElementById('btnSyncRefresh');
      if (btnSync) {
        btnSync.addEventListener('click', function() {
          syncNow(true);
        });
      }

      // 접속 즉시 클라우드 최신 데이터 동기화
      setTimeout(function() {
        syncNow(false);
      }, 100);

      // 앱/브라우저 화면 복귀 시 즉시 동기화
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
          syncNow(false);
        }
      });

      window.addEventListener('focus', function() {
        syncNow(false);
      });

      // 화면을 열어둔 상태에서 8초 주기로 조용히 자동 동기화
      setInterval(function() {
        if (document.visibilityState === 'visible' && !currentPushPromise && !pushDebounceTimer) {
          syncNow(false);
        }
      }, 8000);
    });

    window.syncEngine = {
      pushNow: pushNow,
      pushToCloud: pushToCloud,
      syncNow: syncNow,
      getLastKnownCloudTime: function() { return lastKnownCloudTime; }
    };
    window.handleManualSyncClick = function() { return syncNow(true); };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      pushNow: pushNow,
      pushToCloud: pushToCloud,
      syncNow: syncNow
    };
  }
})();
