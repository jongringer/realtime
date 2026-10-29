// ==========================================================================
// realtime 실시간 대중교통 상시 즐겨찾기 3곳 전광판 엔진
// 1. 국회의사당역 (9호선 상·하행선)
// 2. 여의도역 (9호선 일반·급행 상·하행선 & 5호선 상·하행선)
// 3. 버스정류장 ID 19130 (KBS, ARS 19-130 전체 노선 실시간 도착)
// ==========================================================================

class TransitManager {
  constructor() {
    this.busApiKeys = [
      '0f40f3c7a3220ef7d0f45825f4364e47d05d10fa087632a03db7c8c2222aae63',
      'df332cd23ac6df535a295747d46e0328dd0fd3faed11cec584c87a0ca1e7a759'
    ];
    this.stationBusApiKey = this.busApiKeys[0];
    this.subwayApiKey = '476a79484b6a6f6e3833504f4f6d4e';

    this.REFRESH_INTERVAL = 25;
    this.refreshCountdown = 25;
    this.isFetching = false;
    this.lastLoadedTimeStr = '';

    // 즐겨찾기 캐시
    this.subwayCache = {
      '국회의사당': [],
      '여의도': []
    };
    this.stationBusesCache = {};

    // 정류소 전체 버스 팝업 모달 상태 (transit-lookup.js 호환 유지)
    this.stationModalFilter = 'all';
    this.stationModalSort = 'arrival';
    this.stationModalCountdown = 15;
    this.stationModalTicker = null;
    this.currentStationModalArsId = '19-130';
    this.currentStationModalName = 'KBS';
    this.isFetchingStationBuses = false;

    this.initElements();
    this.initEvents();
    this.loadAllData(false);
    this.startTicker();

    let lastResumeFetch = 0;
    const handleAppResume = () => {
      const now = Date.now();
      if (now - lastResumeFetch < 2500) return;
      lastResumeFetch = now;
      this.refreshCountdown = this.REFRESH_INTERVAL;
      this.loadAllData(false);
    };

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) handleAppResume();
    });
    window.addEventListener('pageshow', () => handleAppResume());
    window.addEventListener('focus', () => handleAppResume());
  }

  initElements() {
    this.widgetCard = document.getElementById('transitWidgetSection');
    this.cardsContainer = document.getElementById('transitCardsContainer');
    this.lastUpdatedEl = document.getElementById('lastUpdated');
    this.btnReloadTransit = document.getElementById('btnReloadTransit');
    this.btnHeaderReload = document.getElementById('btnHeaderReload');
  }

  initEvents() {
    if (this.btnReloadTransit) {
      this.btnReloadTransit.addEventListener('click', () => this.triggerManualRefresh(this.btnReloadTransit));
    }
    if (this.btnHeaderReload) {
      this.btnHeaderReload.addEventListener('click', () => this.triggerManualRefresh(this.btnHeaderReload));
    }
  }

  scrollToFavCard(cardId) {
    const el = document.getElementById(cardId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('fav-card-flash');
      setTimeout(() => el.classList.remove('fav-card-flash'), 900);
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ========= 글씨 크기 조절 유틸리티 (기존 섹션 및 lookup 전광판 완벽 호환) =========
  getFontBoostForKey(key) {
    if (!key) return 0;
    try {
      const v = parseInt(localStorage.getItem('transit_time_boost_' + key) || '0', 10);
      return (!isNaN(v) && v >= 0 && v <= 10) ? v : 0;
    } catch (e) {
      return 0;
    }
  }

  increaseTimeFontSize(e, customKey = null) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const maxBoost = 10;
    const step = 2;

    const targetEl = e && e.target ? e.target.closest('[data-zoom-key]') : null;
    const key = customKey || (targetEl ? targetEl.getAttribute('data-zoom-key') : null);
    const targetName = targetEl ? (targetEl.getAttribute('data-zoom-name') || '') : '';

    if (key) {
      let current = this.getFontBoostForKey(key);
      let next = current + step;
      if (next > maxBoost) {
        this.showTimeZoomToast(`${targetName ? targetName + ' ' : ''}도착시간 글씨가 최대 크기입니다`);
        return;
      }
      try {
        localStorage.setItem('transit_time_boost_' + key, String(next));
      } catch (err) {}
      if (targetEl) {
        targetEl.style.setProperty('--time-font-boost', `${next}px`);
      }
      this.showTimeZoomToast(`${targetName ? targetName + ' ' : ''}도착시간 글씨 확대 (+${next}px)`);
      return;
    }

    let current = parseInt(localStorage.getItem('transit_time_font_boost') || '0', 10);
    if (isNaN(current) || current < 0) current = 0;
    let next = current + step;
    if (next > maxBoost) {
      this.showTimeZoomToast('도착시간 글씨가 최대 크기입니다');
      return;
    }
    this.setTimeFontBoost(next);
    this.showTimeZoomToast(`도착시간 글씨 확대 (+${next}px)`);
  }

  resetTimeFontSize(e, customKey = null) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const targetEl = e && e.target ? e.target.closest('[data-zoom-key]') : null;
    const key = customKey || (targetEl ? targetEl.getAttribute('data-zoom-key') : null);
    const targetName = targetEl ? (targetEl.getAttribute('data-zoom-name') || '') : '';

    if (key) {
      try {
        localStorage.removeItem('transit_time_boost_' + key);
      } catch (err) {}
      if (targetEl) {
        targetEl.style.setProperty('--time-font-boost', '0px');
      }
      this.showTimeZoomToast(`${targetName ? targetName + ' ' : ''}도착시간 원래대로 복귀`);
      return;
    }

    this.setTimeFontBoost(0);
    this.showTimeZoomToast('도착시간 글씨 기본 크기로 복귀');
  }

  setTimeFontBoost(boostPx) {
    try {
      localStorage.setItem('transit_time_font_boost', String(boostPx));
    } catch (e) {}
    document.documentElement.style.setProperty('--time-font-boost', `${boostPx}px`);
  }

  showTimeZoomToast(msg) {
    if (window.app && typeof window.app.showWeatherToast === 'function') {
      window.app.showWeatherToast(`🔍 ${msg}`);
      return;
    }
    let toast = document.getElementById('transitZoomToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'transitZoomToast';
      toast.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.92);color:#fff;padding:9px 18px;border-radius:999px;font-size:13.5px;font-weight:800;z-index:99999;pointer-events:none;transition:opacity 0.2s;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(this._zoomToastTimer);
    this._zoomToastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
  }

  // ========= 네트워크 공통 Fetch (APK 직접 HTTP + 웹 HTTPS 프록시 이중 백업) =========
  async fetchJsonWithFallback(httpUrl, timeoutMs = 4500) {
    const isHttpsPage = (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:');

    // 1차: HTTP 직접 호출 (안드로이드 APK CapacitorHttp 및 로컬 HTTP에서 즉시 응답)
    if (!isHttpsPage) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(httpUrl, { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().startsWith('{')) {
            return JSON.parse(text);
          }
        }
      } catch (e) {}
    }

    // 2차: HTTPS 웹 브라우저 호환 프록시 순차 호출
    const proxies = [
      u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
    ];

    for (const makeProxy of proxies) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 7500);
        const res = await fetch(makeProxy(httpUrl), { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().startsWith('{')) {
            return JSON.parse(text);
          }
        }
      } catch (e) {}
    }

    // HTTPS 페이지에서도 Capacitor 패치가 동작하는 경우를 대비한 최후 직접 시도
    if (isHttpsPage) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(httpUrl, { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) return await res.json();
      } catch (e) {}
    }

    return null;
  }

  async fetchSubwayStation(stationName) {
    const cleanName = String(stationName).replace(/역$/, '').trim();
    const url = `http://swopenAPI.seoul.go.kr/api/subway/${this.subwayApiKey}/json/realtimeStationArrival/0/40/${encodeURIComponent(cleanName)}`;
    const data = await this.fetchJsonWithFallback(url, 4500);
    if (data && Array.isArray(data.realtimeArrivalList)) {
      this.subwayCache[cleanName] = data.realtimeArrivalList;
      return data.realtimeArrivalList;
    }
    return this.subwayCache[cleanName] || [];
  }

  async fetchStationBuses(arsId) {
    const cleanArsId = String(arsId).replace(/[^0-9]/g, '');
    for (const key of this.busApiKeys) {
      const url = `http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?serviceKey=${key}&arsId=${cleanArsId}&resultType=json`;
      const data = await this.fetchJsonWithFallback(url, 4500);
      const items = data && data.msgBody && data.msgBody.itemList;
      if (Array.isArray(items) && items.length > 0) {
        this.stationBusesCache[cleanArsId] = items;
        return items;
      }
    }
    return this.stationBusesCache[cleanArsId] || [];
  }

  fetchAllData(manual = false) {
    return this.loadAllData(manual);
  }

  async loadAllData(showLoading = false) {
    if (this.isFetching) return;
    this.isFetching = true;

    if (showLoading && this.cardsContainer && !this.cardsContainer.innerHTML.trim()) {
      this.cardsContainer.innerHTML = `
        <div class="fav-loading-card">
          <div style="font-size:24px; margin-bottom:6px;">🔄</div>
          <div style="font-size:15px; font-weight:800;">국회의사당역 · 여의도역 · 19130 실시간 도착정보 수신 중...</div>
        </div>
      `;
    }

    try {
      await Promise.allSettled([
        this.fetchSubwayStation('국회의사당'),
        this.fetchSubwayStation('여의도'),
        this.fetchStationBuses('19130')
      ]);

      const now = new Date();
      this.lastLoadedTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      this.renderFavoritesBoard();
      this.updateFooterStatus();
    } catch (e) {
      console.error('[TransitManager] loadAllData 오류:', e);
    } finally {
      this.isFetching = false;
    }
  }

  // ========= 지하철 실시간 도착 파싱 유틸리티 =========
  parseSubwayTrains(rawList, subwayId, updnLine) {
    const nowMs = Date.now();
    const filtered = (rawList || []).filter(item => {
      if (subwayId && String(item.subwayId) !== String(subwayId)) return false;
      const lineDir = String(item.updnLine || '');
      if (updnLine === '상행') {
        return lineDir.includes('상행') || lineDir.includes('내선');
      }
      if (updnLine === '하행') {
        return lineDir.includes('하행') || lineDir.includes('외선');
      }
      return true;
    });

    const parsed = filtered.map((item, idx) => {
      const arvlMsg2 = String(item.arvlMsg2 || '').trim();
      const arvlMsg3 = String(item.arvlMsg3 || '').trim();
      const arvlCd = String(item.arvlCd || '');
      const rawSec = parseInt(item.barvlDt || '0', 10);
      const bstatnNm = String(item.bstatnNm || '').replace(/행$/, '').trim();
      const trainStatus = String(item.btrainSttus || '').trim(); // '급행' | '일반' | ''
      const isExpress = trainStatus.includes('급행');
      const trainNo = item.btrainNo ? String(item.btrainNo) : '';

      let sec = (!isNaN(rawSec) && rawSec > 0) ? rawSec : 0;
      let isArrivingNow = false;
      let statusLabel = '';

      if (arvlCd === '1' || (/도착/.test(arvlMsg2) && !/전역/.test(arvlMsg2))) {
        sec = Math.min(sec || 8, 12);
        isArrivingNow = true;
        statusLabel = '당역 도착';
      } else if (arvlCd === '0' || (/진입/.test(arvlMsg2) && !/전역/.test(arvlMsg2))) {
        sec = Math.min(sec || 20, 25);
        isArrivingNow = true;
        statusLabel = '당역 진입';
      } else if (sec <= 0) {
        // barvlDt가 0으로 내려올 때 메시지 기반 정밀 초 산출
        const minSecMatch = arvlMsg2.match(/(\d+)\s*분(?:\s*(\d+)\s*초)?/);
        const stopsAwayMatch = arvlMsg2.match(/\[?(\d+)\]?\s*번째\s*전역/);
        if (minSecMatch) {
          sec = parseInt(minSecMatch[1], 10) * 60 + (minSecMatch[2] ? parseInt(minSecMatch[2], 10) : 0);
        } else if (arvlCd === '5' || arvlMsg2.includes('전역 도착')) {
          sec = 75;
          statusLabel = '전역 도착';
        } else if (arvlCd === '3' || arvlMsg2.includes('전역 출발')) {
          sec = 55;
          statusLabel = '전역 출발';
        } else if (arvlCd === '4' || arvlMsg2.includes('전역 진입')) {
          sec = 95;
          statusLabel = '전역 진입';
        } else if (stopsAwayMatch) {
          const stops = parseInt(stopsAwayMatch[1], 10);
          sec = Math.max(60, stops * 115);
        }
      }

      // 깔끔한 위치 설명 텍스트
      let posText = '';
      const stopsMatch = arvlMsg2.match(/\[?(\d+)\]?\s*번째\s*전역/);
      if (statusLabel) {
        posText = arvlMsg3 ? `${statusLabel} (${arvlMsg3})` : statusLabel;
      } else if (stopsMatch) {
        posText = arvlMsg3 ? `${stopsMatch[1]}정거장 전 (${arvlMsg3})` : `${stopsMatch[1]}정거장 전`;
      } else if (arvlMsg2.includes('전역')) {
        posText = arvlMsg3 ? `${arvlMsg2.replace(/\(.*?\)/g, '').trim()} (${arvlMsg3})` : arvlMsg2;
      } else if (arvlMsg3) {
        posText = `${arvlMsg3} 부근`;
      } else if (arvlMsg2) {
        posText = arvlMsg2;
      }

      const sortSec = sec > 0 ? sec : (9000 + idx * 60);
      return {
        bstatnNm: bstatnNm ? `${bstatnNm}행` : (updnLine === '상행' ? '상행 열차' : '하행 열차'),
        isExpress,
        trainTypeLabel: isExpress ? '⚡급행' : (String(subwayId) === '1009' ? '일반' : '5호선'),
        trainNo,
        sec,
        sortSec,
        targetTime: sec > 0 ? (nowMs + sec * 1000) : null,
        isArrivingNow,
        posText,
        rawMsg: arvlMsg2
      };
    });

    // 중복 열차 제거 후 도착 임박순 정렬
    const seen = new Set();
    const deduped = [];
    parsed.sort((a, b) => a.sortSec - b.sortSec).forEach(t => {
      const key = t.trainNo ? `${t.trainNo}_${t.bstatnNm}` : `${t.bstatnNm}_${Math.round(t.sortSec / 20)}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(t);
      }
    });

    return deduped.slice(0, 2);
  }

  formatLiveCountdownHtml(sec, isPrimary = true) {
    if (sec <= 15) {
      return `<span class="fav-eta-imminent">⚡ 곧 도착</span>`;
    }
    if (sec < 60) {
      return `<span class="fav-eta-imminent">${sec}초 후</span>`;
    }
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const sStr = String(s).padStart(2, '0');
    const cls = isPrimary ? 'fav-eta-primary' : 'fav-eta-secondary';
    return `<span class="${cls}"><span class="fav-min-num">${m}분</span> <span class="fav-sec-num">${sStr}초</span></span>`;
  }

  formatEtaClock(targetMs) {
    if (!targetMs) return '';
    const d = new Date(targetMs);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  renderSubwayDirectionBlock(dirBadgeText, dirDesc, trains, accentClass = 'line9') {
    if (!trains || trains.length === 0) {
      return `
        <div class="fav-dir-box ${accentClass}">
          <div class="fav-dir-header">
            <span class="fav-dir-pill">${dirBadgeText}</span>
            <span class="fav-dir-dest">${dirDesc}</span>
          </div>
          <div class="fav-empty-row">실시간 도착 대기 중 (잠시 후 자동 갱신)</div>
        </div>
      `;
    }

    const rowsHtml = trains.map((t, idx) => {
      const orderTag = idx === 0
        ? `<span class="fav-order-dot dot-first">이번</span>`
        : `<span class="fav-order-dot dot-second">다음</span>`;

      const typeBadge = t.isExpress
        ? `<span class="fav-train-type is-express">⚡급행</span>`
        : (t.trainTypeLabel === '일반' ? `<span class="fav-train-type is-normal">일반</span>` : '');

      const etaHtml = t.isArrivingNow
        ? `<span class="fav-eta-imminent">⚡ ${this.escapeHtml(t.posText || '곧 도착')}</span>`
        : (t.targetTime
          ? `<span class="fav-live-countdown" data-target-time="${t.targetTime}" data-primary="${idx === 0 ? '1' : '0'}">${this.formatLiveCountdownHtml(t.sec, idx === 0)}</span>`
          : `<span class="fav-eta-msg">${this.escapeHtml(t.rawMsg || '운행 중')}</span>`);

      const clockStr = t.targetTime ? this.formatEtaClock(t.targetTime) : '';
      const clockHtml = clockStr ? `<span class="fav-eta-clock">${clockStr} 도착</span>` : '';

      return `
        <div class="fav-train-row ${idx === 0 ? 'is-first-train' : 'is-second-train'}">
          <div class="fav-train-left">
            ${orderTag}
            ${typeBadge}
            <span class="fav-train-dest">${this.escapeHtml(t.bstatnNm)}</span>
            ${t.posText && !t.isArrivingNow ? `<span class="fav-train-pos">${this.escapeHtml(t.posText)}</span>` : ''}
          </div>
          <div class="fav-train-right">
            ${etaHtml}
            ${clockHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="fav-dir-box ${accentClass}">
        <div class="fav-dir-header">
          <span class="fav-dir-pill">${dirBadgeText}</span>
          <span class="fav-dir-dest">${dirDesc}</span>
        </div>
        <div class="fav-train-list">
          ${rowsHtml}
        </div>
      </div>
    `;
  }

  renderBusStop19130Card() {
    const items = this.stationBusesCache['19130'] || [];
    const nowMs = Date.now();
    const stName = (items[0] && items[0].stNm) ? items[0].stNm : 'KBS';

    let bodyHtml = '';
    if (items.length === 0) {
      bodyHtml = `
        <div class="fav-empty-row" style="padding: 16px 10px;">
          정류장 19130 실시간 버스 정보를 불러오는 중이거나 현재 운행 중인 차량이 없습니다.
        </div>
      `;
    } else {
      // 주요 노선 순 정렬 (도착 임박 우선, 운행종료 후순위)
      const parsedBuses = items.map(it => {
        const sec1 = parseInt(it.traTime1 || '0', 10);
        const msg1 = String(it.arrmsg1 || '').trim();
        const isArr1 = msg1.includes('곧 도착') || (sec1 > 0 && sec1 <= 35);
        const isEnd1 = msg1.includes('운행종료');
        const isWait1 = msg1.includes('출발대기');
        const eff1 = isArr1 ? 15 : (sec1 > 0 ? sec1 : (isWait1 ? 80000 : (isEnd1 ? 99999 : 70000)));

        const sec2 = parseInt(it.traTime2 || '0', 10);
        const msg2 = String(it.arrmsg2 || '').trim();
        const isArr2 = msg2.includes('곧 도착') || (sec2 > 0 && sec2 <= 35);
        const isEnd2 = msg2.includes('운행종료');
        const isWait2 = msg2.includes('출발대기');

        const stopM1 = msg1.match(/\[(\d+)번째\s*전\]/);
        const stopText1 = stopM1 ? `${stopM1[1]}정거장 전` : '';
        const stopM2 = msg2.match(/\[(\d+)번째\s*전\]/);
        const stopText2 = stopM2 ? `${stopM2[1]}정거장 전` : '';

        return {
          it,
          eff1,
          sec1: isArr1 && sec1 <= 0 ? 20 : sec1,
          target1: (sec1 > 0 || isArr1) ? nowMs + ((isArr1 && sec1 <= 0 ? 20 : sec1) * 1000) : null,
          msg1,
          isArr1,
          isEnd1,
          isWait1,
          stopText1,
          sec2: isArr2 && sec2 <= 0 ? 45 : sec2,
          target2: (sec2 > 0 || isArr2) ? nowMs + ((isArr2 && sec2 <= 0 ? 45 : sec2) * 1000) : null,
          msg2,
          isArr2,
          isEnd2,
          isWait2,
          stopText2
        };
      });

      parsedBuses.sort((a, b) => a.eff1 - b.eff1);

      bodyHtml = `<div class="fav-bus-list">` + parsedBuses.map(b => {
        const it = b.it;
        const badge = this.getRouteBadgeStyle(it.routeType, it.rtNm || '');

        let eta1Html = '';
        if (b.isArr1) {
          eta1Html = `<span class="fav-eta-imminent">⚡ 곧 도착</span>`;
        } else if (b.isWait1) {
          eta1Html = `<span class="fav-eta-wait">⏸️ 출발대기</span>`;
        } else if (b.isEnd1) {
          eta1Html = `<span class="fav-eta-end">운행종료</span>`;
        } else if (b.target1) {
          eta1Html = `<span class="fav-live-countdown" data-target-time="${b.target1}" data-primary="1">${this.formatLiveCountdownHtml(b.sec1, true)}</span>`;
        } else {
          eta1Html = `<span class="fav-eta-msg">${this.escapeHtml(b.msg1 || '운행 중')}</span>`;
        }

        const clock1 = (b.target1 && !b.isWait1 && !b.isEnd1) ? `<span class="fav-eta-clock">${this.formatEtaClock(b.target1)} 도착</span>` : '';
        const loc1 = b.stopText1 ? `<span class="fav-bus-stops-away">${b.stopText1}${it.stationNm1 ? ' · ' + this.escapeHtml(it.stationNm1) : ''}</span>` : '';

        let eta2Html = '';
        if (b.isArr2) {
          eta2Html = `<span class="fav-eta-imminent">⚡ 곧 도착</span>`;
        } else if (b.isWait2) {
          eta2Html = `<span class="fav-eta-wait">출발대기</span>`;
        } else if (b.isEnd2) {
          eta2Html = `<span class="fav-eta-end">운행종료</span>`;
        } else if (b.target2) {
          eta2Html = `<span class="fav-live-countdown" data-target-time="${b.target2}" data-primary="0">${this.formatLiveCountdownHtml(b.sec2, false)}</span>`;
        } else if (b.msg2) {
          eta2Html = `<span class="fav-eta-msg">${this.escapeHtml(b.msg2)}</span>`;
        }

        const clock2 = (b.target2 && !b.isWait2 && !b.isEnd2) ? `<span class="fav-eta-clock">${this.formatEtaClock(b.target2)}</span>` : '';

        return `
          <div class="fav-bus-item">
            <div class="fav-bus-top">
              <div class="fav-bus-route-wrap">
                <span class="fav-bus-num-badge" style="background:${badge.badgeBg}; color:${badge.badgeColor};">${this.escapeHtml(it.rtNm)}</span>
                <span class="fav-bus-type-pill" style="background:${badge.pillBg}; color:${badge.pillText}; border-color:${badge.pillBorder};">${badge.typeName}</span>
                <span class="fav-bus-dir-text">${this.escapeHtml(it.adirection || '')} 방면</span>
              </div>
              ${it.nxtStn ? `<span class="fav-bus-next-stn">다음: ${this.escapeHtml(it.nxtStn)}</span>` : ''}
            </div>
            <div class="fav-bus-arrivals">
              <div class="fav-bus-arr-row is-first">
                <div class="fav-bus-arr-left">
                  <span class="fav-order-dot dot-first">다음</span>
                  ${loc1}
                </div>
                <div class="fav-bus-arr-right">
                  ${eta1Html}
                  ${clock1}
                </div>
              </div>
              ${eta2Html ? `
                <div class="fav-bus-arr-row is-second">
                  <div class="fav-bus-arr-left">
                    <span class="fav-order-dot dot-second">다다음</span>
                    ${b.stopText2 ? `<span class="fav-bus-stops-away">${b.stopText2}</span>` : ''}
                  </div>
                  <div class="fav-bus-arr-right">
                    ${eta2Html}
                    ${clock2}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('') + `</div>`;
    }

    return `
      <article class="fav-station-card fav-bus-station-card" id="fav-card-19130">
        <div class="fav-card-header fav-header-bus">
          <div class="fav-card-title-group">
            <span class="fav-line-badge badge-bus-ars">🚏 19130</span>
            <div>
              <h3 class="fav-station-name">${this.escapeHtml(stName)} 정류소</h3>
              <span class="fav-station-sub">버스정류장 ID 19130 (ARS 19-130) · 전체 노선 상시 노출</span>
            </div>
          </div>
          <button type="button" class="fav-open-modal-btn" onclick="window.openStationBusesModal && window.openStationBusesModal('19-130', '${this.escapeHtml(stName)}')">전체 확대 ↗</button>
        </div>
        <div class="fav-card-body">
          ${bodyHtml}
        </div>
      </article>
    `;
  }

  renderFavoritesBoard() {
    if (!this.cardsContainer) return;

    // 1. 국회의사당역 (9호선 상행 / 하행)
    const assemblyRaw = this.subwayCache['국회의사당'] || [];
    const assemblyUp = this.parseSubwayTrains(assemblyRaw, '1009', '상행');
    const assemblyDown = this.parseSubwayTrains(assemblyRaw, '1009', '하행');

    const cardAssemblyHtml = `
      <article class="fav-station-card" id="fav-card-assembly">
        <div class="fav-card-header fav-header-line9">
          <div class="fav-card-title-group">
            <span class="fav-line-badge badge-line9">9호선</span>
            <div>
              <h3 class="fav-station-name">국회의사당역</h3>
              <span class="fav-station-sub">상행(여의도·중앙보훈병원) · 하행(당산·개화) 실시간</span>
            </div>
          </div>
          <span class="fav-live-pill">⚡ 상시노출</span>
        </div>
        <div class="fav-card-body fav-two-dirs">
          ${this.renderSubwayDirectionBlock('상행선 (하선)', '여의도 · 노량진 · 중앙보훈병원 방면', assemblyUp, 'dir-line9-up')}
          ${this.renderSubwayDirectionBlock('하행선 (상선)', '당산 · 김포공항 · 개화 방면', assemblyDown, 'dir-line9-down')}
        </div>
      </article>
    `;

    // 2. 여의도역 (9호선 일반·급행 상/하행 + 5호선 상/하행)
    const yeouidoRaw = this.subwayCache['여의도'] || [];
    const yeouido9Up = this.parseSubwayTrains(yeouidoRaw, '1009', '상행');
    const yeouido9Down = this.parseSubwayTrains(yeouidoRaw, '1009', '하행');
    const yeouido5Up = this.parseSubwayTrains(yeouidoRaw, '1005', '상행');
    const yeouido5Down = this.parseSubwayTrains(yeouidoRaw, '1005', '하행');

    const cardYeouidoHtml = `
      <article class="fav-station-card" id="fav-card-yeouido">
        <div class="fav-card-header fav-header-yeouido">
          <div class="fav-card-title-group">
            <div style="display:flex; gap:4px; align-items:center;">
              <span class="fav-line-badge badge-line9">9호선</span>
              <span class="fav-line-badge badge-line5">5호선</span>
            </div>
            <div>
              <h3 class="fav-station-name">여의도역</h3>
              <span class="fav-station-sub">9호선(급행·일반) 및 5호선 상·하행 실시간</span>
            </div>
          </div>
          <span class="fav-live-pill">⚡ 상시노출</span>
        </div>
        <div class="fav-card-body fav-two-dirs">
          <div class="fav-line-sub-divider"><span class="badge-line9-mini">9호선</span> 일반 · ⚡급행 열차</div>
          ${this.renderSubwayDirectionBlock('9호선 상행', '노량진 · 신논현 · 중앙보훈병원 방면', yeouido9Up, 'dir-line9-up')}
          ${this.renderSubwayDirectionBlock('9호선 하행', '국회의사당 · 당산 · 김포공항 · 개화 방면', yeouido9Down, 'dir-line9-down')}

          <div class="fav-line-sub-divider" style="margin-top:4px;"><span class="badge-line5-mini">5호선</span> 상 · 하행 열차</div>
          ${this.renderSubwayDirectionBlock('5호선 상행', '신길 · 영등포구청 · 까치산 · 방화 방면', yeouido5Up, 'dir-line5-up')}
          ${this.renderSubwayDirectionBlock('5호선 하행', '여의나루 · 광화문 · 하남검단산 · 마천 방면', yeouido5Down, 'dir-line5-down')}
        </div>
      </article>
    `;

    // 3. 버스정류장 19130 (KBS)
    const card19130Html = this.renderBusStop19130Card();

    this.cardsContainer.innerHTML = cardAssemblyHtml + cardYeouidoHtml + card19130Html;
  }

  startTicker() {
    if (this.mainTicker) clearInterval(this.mainTicker);
    this.mainTicker = setInterval(() => {
      const now = Date.now();
      const countdownEls = document.querySelectorAll('.fav-live-countdown');
      countdownEls.forEach(el => {
        const target = parseInt(el.getAttribute('data-target-time') || '0', 10);
        if (!target) return;
        const isPrimary = el.getAttribute('data-primary') === '1';
        const diffSec = Math.max(0, Math.floor((target - now) / 1000));
        el.innerHTML = this.formatLiveCountdownHtml(diffSec, isPrimary);
      });

      this.refreshCountdown--;
      if (this.refreshCountdown <= 0) {
        this.refreshCountdown = this.REFRESH_INTERVAL;
        this.loadAllData(false);
      }
      this.updateFooterStatus();
    }, 1000);
  }

  updateFooterStatus() {
    if (!this.lastUpdatedEl) return;
    const baseText = this.lastLoadedTimeStr
      ? `실시간 기준 ${this.lastLoadedTimeStr} (${this.refreshCountdown}초 후 자동갱신)`
      : `서울시 TOPIS · 지하철 실시간 연동 중...`;
    this.lastUpdatedEl.textContent = baseText;
  }

  triggerManualRefresh(btn = null) {
    this.refreshCountdown = this.REFRESH_INTERVAL;
    if (btn) {
      btn.classList.add('spinning');
      const originalText = btn.innerHTML;
      btn.innerHTML = '🔄 갱신중';
      this.loadAllData(false).finally(() => {
        btn.innerHTML = '✅ 완료';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('spinning');
        }, 650);
      });
    } else {
      this.loadAllData(false);
    }
  }

  // =========================================================================
  // 정류소 전체 버스 도착정보 팝업 모달 (ARS 번호 클릭 시 호출 · transit-lookup 호환)
  // =========================================================================
  getRouteBadgeStyle(routeType, rtNm) {
    const t = String(routeType);
    const name = String(rtNm || '');
    if (t === '2' || /^(양천|영등포|마포|강서|구로|동작|관악|서대문)/.test(name)) {
      return { typeName: '마을', badgeBg: '#059669', badgeColor: '#ffffff', pillBg: '#ecfdf5', pillText: '#059669', pillBorder: '#a7f3d0' };
    }
    if (t === '3') {
      return { typeName: '간선', badgeBg: '#1d4ed8', badgeColor: '#ffffff', pillBg: '#eff6ff', pillText: '#1d4ed8', pillBorder: '#bfdbfe' };
    }
    if (t === '4') {
      return { typeName: '지선', badgeBg: '#16a34a', badgeColor: '#ffffff', pillBg: '#f0fdf4', pillText: '#15803d', pillBorder: '#bbf7d0' };
    }
    if (t === '1') {
      return { typeName: '공항', badgeBg: '#b45309', badgeColor: '#ffffff', pillBg: '#fef3c7', pillText: '#b45309', pillBorder: '#fde68a' };
    }
    if (t === '8') {
      return { typeName: '경기', badgeBg: '#6366f1', badgeColor: '#ffffff', pillBg: '#eef2ff', pillText: '#4338ca', pillBorder: '#c7d2fe' };
    }
    if (t === '6') {
      return { typeName: '광역', badgeBg: '#dc2626', badgeColor: '#ffffff', pillBg: '#fef2f2', pillText: '#dc2626', pillBorder: '#fecaca' };
    }
    return { typeName: '일반', badgeBg: '#475569', badgeColor: '#ffffff', pillBg: '#f1f5f9', pillText: '#334155', pillBorder: '#cbd5e1' };
  }

  openStationBusesModal(arsId = '19-130', stationName = 'KBS') {
    this.currentStationModalArsId = arsId || '19-130';
    this.currentStationModalName = stationName || 'KBS';
    this.stationModalFilter = 'all';
    this.stationModalCountdown = 15;

    this.ensureStationBusesModal();
    const modal = document.getElementById('stationBusesModal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }

    this.loadStationBusesData(true);
    this.startStationBusesTicker();
  }

  closeStationBusesModal() {
    const modal = document.getElementById('stationBusesModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
    this.stopStationBusesTicker();
  }

  switchStationModalFilter(filterKey) {
    this.stationModalFilter = filterKey;
    this.renderStationBusesModal();
  }

  toggleStationModalSort(sortKey) {
    this.stationModalSort = sortKey || (this.stationModalSort === 'arrival' ? 'route' : 'arrival');
    this.renderStationBusesModal();
  }

  triggerStationModalRefresh() {
    this.stationModalCountdown = 15;
    const btn = document.getElementById('btnRefreshStationBuses');
    if (btn) btn.classList.add('spinning');
    this.loadStationBusesData(true).finally(() => {
      if (btn) btn.classList.remove('spinning');
    });
  }

  ensureStationBusesModal() {
    if (document.getElementById('stationBusesModal')) return;

    const modalHtml = `
      <div class="modal-overlay" id="stationBusesModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.75); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); z-index:100000; justify-content:center; align-items:center; padding:12px;">
        <div class="modal-container station-buses-container" style="background:#f8fafc; width:min(95vw, 480px) !important; max-width:95vw !important; max-height:90vh; border-radius:20px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); display:flex; flex-direction:column; overflow:hidden; border:1px solid #cbd5e1; padding:0 !important;">
          <div class="modal-header station-modal-header" style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color:#ffffff; padding:15px 16px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
              <span style="font-size:20px; flex-shrink:0;">🚏</span>
              <div style="min-width:0; overflow:hidden;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <strong id="stModalStationName" style="font-size:17px; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">정류소 전체 버스 도착</strong>
                  <span id="stModalArsBadge" style="background:#0284c7; color:#ffffff; font-size:12px; font-weight:800; padding:2px 7px; border-radius:5px; flex-shrink:0;">ARS 19-130</span>
                </div>
                <div style="font-size:12.5px; color:#94a3b8; margin-top:2px; display:flex; align-items:center; gap:4px;">
                  <span>TOPIS 실시간 버스도착</span>
                  <span>·</span>
                  <span id="stModalRefreshTimerText" style="color:#38bdf8; font-weight:700;">15초 자동갱신</span>
                </div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
              <button type="button" id="btnRefreshStationBuses" onclick="window.transitManager && window.transitManager.triggerStationModalRefresh()" style="background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.25); color:#ffffff; font-size:13px; font-weight:800; padding:6px 10px; border-radius:8px; cursor:pointer;">🔄 새로고침</button>
              <button type="button" class="modal-close-btn" onclick="window.transitManager && window.transitManager.closeStationBusesModal()" style="background:rgba(255,255,255,0.18); border:none; color:#ffffff; font-size:18px; width:34px; height:34px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
            </div>
          </div>

          <div style="background:#ffffff; border-bottom:1px solid #e2e8f0; padding:9px 12px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div id="stModalFilterChips" style="display:flex; gap:5px; overflow-x:auto;"></div>
            <div id="stModalSortWrap" style="flex-shrink:0;"></div>
          </div>

          <div class="modal-body" id="stModalBodyContainer" style="padding:12px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:10px; background:#f8fafc;"></div>

          <div class="modal-footer" style="padding:12px 16px; background:#ffffff; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
            <span id="stModalFooterInfo" style="font-size:12.5px; color:#64748b; font-weight:700;">💡 서울시 TOPIS 실시간 버스 전광판</span>
            <button type="button" class="btn-primary" onclick="window.transitManager && window.transitManager.closeStationBusesModal()" style="background:#0284c7; color:#ffffff; border:none; padding:9px 20px; border-radius:9px; font-weight:800; cursor:pointer; font-size:14.5px;">닫기</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('stationBusesModal');
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) this.closeStationBusesModal();
      });
    }
  }

  async loadStationBusesData(showLoading = false) {
    if (this.isFetchingStationBuses) return;
    this.isFetchingStationBuses = true;

    const cleanArsId = String(this.currentStationModalArsId).replace(/[^0-9]/g, '');
    const bodyContainer = document.getElementById('stModalBodyContainer');

    if (showLoading && bodyContainer && (!this.stationBusesCache[cleanArsId] || this.stationBusesCache[cleanArsId].length === 0)) {
      bodyContainer.innerHTML = `
        <div style="padding:40px 16px; text-align:center;">
          <div style="font-size:28px; margin-bottom:10px;">🔄</div>
          <div style="font-size:16px; font-weight:800; color:#0284c7;">정류소 전체 버스 도착정보 수신 중...</div>
        </div>
      `;
    }

    try {
      await this.fetchStationBuses(this.currentStationModalArsId);
      this.renderStationBusesModal();
    } finally {
      this.isFetchingStationBuses = false;
    }
  }

  renderStationBusesModal() {
    const nameEl = document.getElementById('stModalStationName');
    const arsBadgeEl = document.getElementById('stModalArsBadge');
    const filterContainer = document.getElementById('stModalFilterChips');
    const sortWrap = document.getElementById('stModalSortWrap');
    const bodyContainer = document.getElementById('stModalBodyContainer');
    const footerInfo = document.getElementById('stModalFooterInfo');

    if (!bodyContainer) return;
    if (nameEl) nameEl.textContent = this.currentStationModalName;
    if (arsBadgeEl) arsBadgeEl.textContent = `ARS ${this.currentStationModalArsId}`;

    const cleanArsId = String(this.currentStationModalArsId).replace(/[^0-9]/g, '');
    const rawItems = this.stationBusesCache[cleanArsId] || [];
    if (rawItems.length === 0) {
      bodyContainer.innerHTML = `<div style="padding:32px 16px; text-align:center; color:#64748b; font-size:15px; font-weight:700;">현재 도착 예정인 버스 정보가 없습니다.</div>`;
      return;
    }

    const nowMs = Date.now();
    const countTotal = rawItems.length;
    const countTown = rawItems.filter(i => String(i.routeType) === '2').length;
    const countBlue = rawItems.filter(i => String(i.routeType) === '3').length;
    const countGreen = rawItems.filter(i => String(i.routeType) === '4').length;
    const countOther = rawItems.filter(i => !['2', '3', '4'].includes(String(i.routeType))).length;

    if (filterContainer) {
      const filters = [
        { key: 'all', label: `전체 ${countTotal}` },
        ...(countBlue > 0 ? [{ key: 'blue', label: `간선 ${countBlue}` }] : []),
        ...(countGreen > 0 ? [{ key: 'green', label: `지선 ${countGreen}` }] : []),
        ...(countTown > 0 ? [{ key: 'town', label: `마을 ${countTown}` }] : []),
        ...(countOther > 0 ? [{ key: 'other', label: `경기·기타 ${countOther}` }] : [])
      ];
      filterContainer.innerHTML = filters.map(f => {
        const active = (this.stationModalFilter === f.key);
        return `<button type="button" onclick="window.transitManager && window.transitManager.switchStationModalFilter('${f.key}')" style="padding:5px 11px; border-radius:14px; font-size:13px; font-weight:${active ? '800' : '600'}; border:1px solid ${active ? '#0284c7' : '#e2e8f0'}; background:${active ? '#0284c7' : '#ffffff'}; color:${active ? '#ffffff' : '#64748b'}; cursor:pointer; white-space:nowrap;">${f.label}</button>`;
      }).join('');
    }

    if (sortWrap) {
      const isArrivalSort = (this.stationModalSort === 'arrival');
      sortWrap.innerHTML = `<button type="button" onclick="window.transitManager && window.transitManager.toggleStationModalSort()" style="padding:5px 10px; border-radius:8px; font-size:12.5px; font-weight:800; border:1px solid #cbd5e1; background:#f8fafc; color:#334155; cursor:pointer;">${isArrivalSort ? '⏱️ 도착순' : '🔤 번호순'}</button>`;
    }

    let filtered = rawItems.filter(item => {
      const t = String(item.routeType);
      if (this.stationModalFilter === 'all') return true;
      if (this.stationModalFilter === 'town') return t === '2';
      if (this.stationModalFilter === 'blue') return t === '3';
      if (this.stationModalFilter === 'green') return t === '4';
      if (this.stationModalFilter === 'other') return !['2', '3', '4'].includes(t);
      return true;
    });

    const parsedList = filtered.map(item => {
      const traTime1 = parseInt(item.traTime1 || '0', 10);
      const arrmsg1 = (item.arrmsg1 || '').trim();
      const isArriving1 = arrmsg1.includes('곧 도착') || (traTime1 > 0 && traTime1 <= 35);
      const isWait1 = arrmsg1.includes('출발대기');
      const isEnd1 = arrmsg1.includes('운행종료');
      const sec1 = isArriving1 && traTime1 <= 0 ? 25 : traTime1;

      const traTime2 = parseInt(item.traTime2 || '0', 10);
      const arrmsg2 = (item.arrmsg2 || '').trim();
      const isArriving2 = arrmsg2.includes('곧 도착') || (traTime2 > 0 && traTime2 <= 35);
      const isWait2 = arrmsg2.includes('출발대기');
      const isEnd2 = arrmsg2.includes('운행종료');
      const sec2 = isArriving2 && traTime2 <= 0 ? 50 : traTime2;

      let effectiveSec = isArriving1 ? 0 : (sec1 > 0 ? sec1 : (isWait1 ? 99999 : 999999));
      return {
        item,
        effectiveSec,
        sec1,
        targetTime1: sec1 > 0 ? nowMs + sec1 * 1000 : null,
        arrmsg1,
        isArriving1,
        isWait1,
        isEnd1,
        sec2,
        targetTime2: sec2 > 0 ? nowMs + sec2 * 1000 : null,
        arrmsg2,
        isArriving2,
        isWait2,
        isEnd2
      };
    });

    if (this.stationModalSort === 'arrival') {
      parsedList.sort((a, b) => a.effectiveSec - b.effectiveSec);
    } else {
      parsedList.sort((a, b) => String(a.item.rtNm).localeCompare(String(b.item.rtNm), undefined, { numeric: true }));
    }

    bodyContainer.innerHTML = parsedList.map(p => {
      const it = p.item;
      const badge = this.getRouteBadgeStyle(it.routeType, it.rtNm);
      const eta1Html = p.isArriving1
        ? `<span style="color:#dc2626; font-size:20px; font-weight:900;">⚡ 곧 도착</span>`
        : p.isWait1
          ? `<span style="color:#d97706; font-size:16px; font-weight:800;">⏸️ 출발대기</span>`
          : p.isEnd1
            ? `<span style="color:#64748b; font-size:15px; font-weight:700;">🚫 운행종료</span>`
            : p.targetTime1
              ? `<span class="live-station-bus-countdown" data-target-time="${p.targetTime1}">${this.formatStationCountdown1(p.sec1)}</span>`
              : `<span style="color:#475569; font-size:16px; font-weight:800;">${this.escapeHtml(p.arrmsg1 || '운행 중')}</span>`;

      const eta2Html = p.isArriving2
        ? `<span style="color:#dc2626; font-size:16px; font-weight:900;">다다음: ⚡ 곧 도착</span>`
        : p.targetTime2
          ? `<span style="font-size:14px; font-weight:800; color:#2563eb;">다다음:</span> <span class="live-station-bus-countdown2" data-target-time="${p.targetTime2}">${this.formatStationCountdown2(p.sec2)}</span>`
          : p.arrmsg2
            ? `<span style="font-size:14px; color:#64748b; font-weight:700;">다다음: ${this.escapeHtml(p.arrmsg2)}</span>`
            : '';

      return `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:13px 14px; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:9px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="background:${badge.badgeBg}; color:${badge.badgeColor}; font-size:18px; font-weight:900; padding:4px 11px; border-radius:8px;">${this.escapeHtml(it.rtNm)}</span>
              <span style="background:${badge.pillBg}; color:${badge.pillText}; border:1px solid ${badge.pillBorder}; font-size:12px; font-weight:800; padding:2px 7px; border-radius:5px;">${badge.typeName}</span>
            </div>
            <div style="text-align:right; font-size:13.5px; font-weight:800; color:#0f172a;">
              <strong style="color:#0369a1;">${this.escapeHtml(it.adirection || '')}</strong> 방면
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div>${eta1Html}</div>
            <div style="font-size:13px; color:#64748b; font-weight:700;">${this.escapeHtml(it.stationNm1 || '')}</div>
          </div>
          ${eta2Html ? `<div style="border-top:1px dashed #e2e8f0; padding-top:6px;">${eta2Html}</div>` : ''}
        </div>
      `;
    }).join('');

    if (footerInfo) {
      footerInfo.innerHTML = `💡 정류소 전체 <b>${countTotal}개</b> 노선 실시간 연동`;
    }
  }

  formatStationCountdown1(diffSec) {
    if (diffSec <= 15) return `<span style="color:#dc2626; font-size:20px; font-weight:900;">⚡ 곧 도착</span>`;
    if (diffSec < 60) return `<span style="color:#dc2626; font-size:20px; font-weight:900;">${diffSec}초 후</span>`;
    const m = Math.floor(diffSec / 60);
    const s = String(diffSec % 60).padStart(2, '0');
    return `<span style="color:#dc2626; font-size:20px; font-weight:900;">${m}분</span> <span style="color:#0f172a; font-size:15.5px; font-weight:800;">${s}초 후</span>`;
  }

  formatStationCountdown2(diffSec) {
    if (diffSec <= 15) return `<span style="color:#dc2626; font-size:16.5px; font-weight:900;">⚡ 곧 도착</span>`;
    if (diffSec < 60) return `<span style="color:#dc2626; font-size:16.5px; font-weight:900;">${diffSec}초 후</span>`;
    const m = Math.floor(diffSec / 60);
    const s = String(diffSec % 60).padStart(2, '0');
    return `<span style="color:#2563eb; font-size:16.5px; font-weight:900;">${m}분</span> <span style="color:#0f172a; font-size:14px; font-weight:800;">${s}초 후</span>`;
  }

  startStationBusesTicker() {
    this.stopStationBusesTicker();
    this.stationModalTicker = setInterval(() => this.updateStationBusesTickers(), 1000);
  }

  stopStationBusesTicker() {
    if (this.stationModalTicker) {
      clearInterval(this.stationModalTicker);
      this.stationModalTicker = null;
    }
  }

  updateStationBusesTickers() {
    const modal = document.getElementById('stationBusesModal');
    if (!modal || modal.style.display === 'none') {
      this.stopStationBusesTicker();
      return;
    }
    const now = Date.now();
    modal.querySelectorAll('.live-station-bus-countdown').forEach(el => {
      const t = parseInt(el.getAttribute('data-target-time') || '0', 10);
      if (t) el.innerHTML = this.formatStationCountdown1(Math.max(0, Math.floor((t - now) / 1000)));
    });
    modal.querySelectorAll('.live-station-bus-countdown2').forEach(el => {
      const t = parseInt(el.getAttribute('data-target-time') || '0', 10);
      if (t) el.innerHTML = this.formatStationCountdown2(Math.max(0, Math.floor((t - now) / 1000)));
    });

    if (this.stationModalCountdown > 0) this.stationModalCountdown--;
    const timerTextEl = document.getElementById('stModalRefreshTimerText');
    if (timerTextEl) timerTextEl.textContent = `${this.stationModalCountdown}초 후 자동갱신`;
    if (this.stationModalCountdown <= 0) {
      this.stationModalCountdown = 15;
      if (!this.isFetchingStationBuses) this.loadStationBusesData(false);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.transitManager = new TransitManager();
  window.openStationBusesModal = (arsId, name) => {
    if (window.transitManager) window.transitManager.openStationBusesModal(arsId, name);
  };
  window.closeStationBusesModal = () => {
    if (window.transitManager) window.transitManager.closeStationBusesModal();
  };
});
