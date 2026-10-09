// ==========================================================================
// 출퇴근 맞춤 실시간 대중교통 안내 - 서울시 공공 버스도착정보(TOPIS) 직결 전광판
// 서울시 공공 데이터 포털 ws.bus.go.kr getArrInfoByRoute 직접 호출
// ODsay 의존성 완전 제거 · 9호선 역사 공식 시간표 최우선 연동
// 현 시각 기준 실시간 [다음 버스] 및 [다다음 버스] 즉시 카운트다운
// ==========================================================================

class TransitManager {
  constructor() {
    this.busApiKey = 'df332cd23ac6df535a295747d46e0328dd0fd3faed11cec584c87a0ca1e7a759';
    this.currentMode = 'commute'; // 'commute' | 'offwork'
    this.autoReason = '';

    // 25초 단위 실시간 자동 갱신 주기
    this.REFRESH_INTERVAL = 25;
    this.refreshCountdown = 25;
    this.lastLoadedTimeStr = '';
    this.isLiveBus = false;
    this.isFetching = false;

    // 서울시 정류소 및 노선 시스템 식별값 매핑 (stId, busRouteId, ord)
    this.busConfigs = {
      // 1. 출근 모드: 정류소 1 (이대목동병원.목동6단지앞, ARS 15154, stId 114000052)
      commute: {
        arsId: '15-154',
        stId: '114000052',
        stationName: '이대목동병원·목동6단지앞',
        destNote: '선유도역·당산역 방면',
        routes: [
          {
            routeNum: '양천01',
            busRouteId: '114900001',
            stId: '114000052',
            ord: '17',
            badgeClass: 'badge-seoul-town',
            typeText: '마을버스 (평일 5~8분 / 주말·공휴일 8~12분)',
            headway: 360
          },
          {
            routeNum: '603',
            busRouteId: '100100088',
            stId: '114000052',
            ord: '22',
            badgeClass: 'badge-seoul-blue',
            typeText: '간선버스 (배차 10~12분)',
            headway: 660
          },
          {
            // 6620은 15154에서 당산역 방향만 모니터링 (ord 28)
            routeNum: '6620',
            busRouteId: '100100300',
            stId: '114000052',
            ord: '28',
            badgeClass: 'badge-seoul-green',
            typeText: '지선버스 (당산역 방면)',
            headway: 720
          }
        ]
      },
      // 2. 퇴근 모드: 정류소 2 (선유도역1번출구.한신아파트, ARS 19210, stId 118000125)
      offwork: {
        arsId: '19-210',
        stId: '118000125',
        stationName: '선유도역1번출구·한신아파트',
        destNote: '목동아파트 단지 방면 환승',
        routes: [
          {
            routeNum: '양천01',
            busRouteId: '114900001',
            stId: '118000125',
            ord: '20',
            badgeClass: 'badge-seoul-town',
            typeText: '마을버스 (평일 5~8분 / 주말·공휴일 8~12분)',
            headway: 360
          },
          {
            routeNum: '603',
            busRouteId: '100100088',
            stId: '118000125',
            ord: '62',
            badgeClass: 'badge-seoul-blue',
            typeText: '간선버스 (배차 10~12분)',
            headway: 660
          },
          {
            // 6620은 19210에서 차고지 방향만 모니터링 (ord 34)
            routeNum: '6620',
            busRouteId: '100100300',
            stId: '118000125',
            ord: '34',
            badgeClass: 'badge-seoul-green',
            typeText: '지선버스 (차고지 방면)',
            headway: 720
          }
        ]
      }
    };

    // 캐시 저장소
    this.busCache = {};
    this.subwayApiKey = '476a79484b6a6f6e3833504f4f6d4e';
    this.subwayCache = {};
    this.isLiveSubway = false;
    this.subwaySourceMode = localStorage.getItem('subway_source_mode') || 'realtime'; // 'realtime' | 'timetable'
    this.activeTimetableTab = 'seonyudo';

    this.initElements();
    this.initEvents();

    // 근무표 기반 출퇴근 모드 자동 판정 및 초기 데이터 로드
    this.initModeFromShift();
    this.loadAllData();

    // 1초 단위 실시간 카운트다운 티커 시작
    this.startTicker();

    // 스마트폰 앱 복귀/재실행 시 항상 최신 실시간 데이터 새로고침
    let lastResumeFetch = 0;
    const handleAppResume = () => {
      const now = Date.now();
      if (now - lastResumeFetch < 2500) return;
      lastResumeFetch = now;
      this.refreshCountdown = this.REFRESH_INTERVAL;
      this.loadAllData(true);
    };

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) handleAppResume();
    });
    window.addEventListener('pageshow', () => {
      handleAppResume();
    });
    window.addEventListener('focus', () => {
      handleAppResume();
    });
  }

  initElements() {
    this.widgetCard = document.getElementById('transitWidgetSection');
    this.transitStatusBadge = document.getElementById('transitStatusBadge');
    this.btnOpenTransitModal = document.getElementById('btnOpenTransitModal');

    this.tabCommute = document.getElementById('tabCommute');
    this.tabOffwork = document.getElementById('tabOffwork');
    this.cardsContainer = document.getElementById('transitCardsContainer');
    this.commuteSummaryContainer = document.getElementById('commuteEstimationSummaryBox') || document.getElementById('estimationSummaryBox');
    this.commuteDetailContainer = document.getElementById('commuteEstimationDetailBox');

    this.lastUpdated = document.getElementById('lastUpdated');
    this.btnHeaderReload = document.getElementById('btnHeaderReload');
    this.btnReloadTransit = document.getElementById('btnReloadTransit');
  }

  initEvents() {
    if (this.btnOpenTransitModal) {
      this.btnOpenTransitModal.addEventListener('click', () => {
        if (this.widgetCard) {
          this.widgetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          this.widgetCard.classList.add('widget-highlight');
          setTimeout(() => this.widgetCard.classList.remove('widget-highlight'), 1200);
        }
        this.triggerManualRefresh();
      });
    }

    if (this.tabCommute) {
      this.tabCommute.addEventListener('click', () => this.changeMode('commute', false));
    }
    if (this.tabOffwork) {
      this.tabOffwork.addEventListener('click', () => this.changeMode('offwork', false));
    }

    if (this.btnHeaderReload) {
      this.btnHeaderReload.addEventListener('click', () => this.triggerManualRefresh(this.btnHeaderReload));
    }
    if (this.btnReloadTransit) {
      this.btnReloadTransit.addEventListener('click', () => this.triggerManualRefresh(this.btnReloadTransit));
    }
  }

  initModeFromShift() {
    // 사용자 맞춤형 근무표 기반 출/퇴근 모드 자동 초기화
    // - 일근: 전날부터 09시까지 출근모드, 13시부터 퇴근모드
    // - 야근: 당일 07시부터 출근모드
    // - 조근: 당일 05시부터 퇴근모드
    try {
      const overrides = (typeof shiftStorage !== 'undefined') ? shiftStorage.getOverrides() : {};
      const baseSettings = (typeof shiftStorage !== 'undefined') ? shiftStorage.getBaseSettings() : {};
      if (typeof getCommuteModeForDateTime === 'function') {
        this.currentMode = getCommuteModeForDateTime(new Date(), overrides, baseSettings);
      } else {
        const hour = new Date().getHours();
        this.currentMode = (hour >= 7 && hour < 13) ? 'commute' : 'offwork';
      }
    } catch (e) {
      console.warn('initModeFromShift 오류 발생, 기본값 적용:', e);
      this.currentMode = 'commute';
    }
    this.updateModeUI();
  }

  changeMode(mode) {
    this.currentMode = mode;
    this.updateModeUI();
    this.loadAllData();
  }

  updateModeUI() {
    const isCommute = (this.currentMode === 'commute');
    if (this.tabCommute) this.tabCommute.className = `transit-tab-btn ${isCommute ? 'active' : ''}`;
    if (this.tabOffwork) this.tabOffwork.className = `transit-tab-btn ${!isCommute ? 'active' : ''}`;
  }

  startTicker() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = setInterval(() => {
      this.updateLiveTickers();
    }, 1000);
  }

  updateLiveTickers() {
    const now = Date.now();
    const els = document.querySelectorAll('.live-countdown');
    if (els && els.length > 0) {
      els.forEach(el => {
        const targetTime = parseInt(el.getAttribute('data-target-time'), 10);
        const prefix = el.getAttribute('data-prefix') || '';
        const suffix = el.getAttribute('data-suffix') || '';
        if (!targetTime || isNaN(targetTime)) return;

        const diffSec = Math.max(0, Math.floor((targetTime - now) / 1000));
        let timeHtml = '';

        if (diffSec <= 0) {
          timeHtml = `<span class="transit-time-arrive">⚡ 곧 도착 (진입)</span>`;
        } else if (diffSec < 60) {
          timeHtml = `<span class="transit-time-imminent">${diffSec}초 후</span>`;
        } else {
          const m = Math.floor(diffSec / 60);
          const s = diffSec % 60;
          const sStr = s < 10 ? '0' + s : s;
          timeHtml = `<span class="transit-time-min">${m}분</span> <span class="transit-time-sec">${sStr}초 후</span>`;
        }

        el.innerHTML = `${prefix ? prefix + ' ' : ''}${timeHtml} ${suffix ? `<span class="transit-countdown-suffix">${suffix}</span>` : ''}`;
      });
    }

    // 자동 갱신 카운트다운 처리
    if (this.refreshCountdown > 0) {
      this.refreshCountdown--;
    }

    this.updateRefreshStatus();

    // 카운트다운 만료 시 백그라운드 자동 갱신 호출
    if (this.refreshCountdown <= 0) {
      this.refreshCountdown = this.REFRESH_INTERVAL;
      if (!document.hidden && !this.isFetching) {
        this.loadAllData(false);
      }
    }
  }

  setSubwaySourceMode(mode) {
    this.subwaySourceMode = mode;
    try {
      localStorage.setItem('subway_source_mode', mode);
    } catch (e) {}

    // 누르는 즉각 0.001초 만에 버튼 색상 전환 및 반짝임 효과 (재터치 시에도 즉각 반응)
    const btnReal = document.getElementById('btnSubwayRealtimeWidget');
    const btnTime = document.getElementById('btnSubwayTimetableWidget');
    if (btnReal && btnTime) {
      btnReal.classList.remove('sparkle-active-green', 'sparkle-active-amber');
      btnTime.classList.remove('sparkle-active-green', 'sparkle-active-amber');
      void btnReal.offsetWidth;
      void btnTime.offsetWidth;

      if (mode === 'realtime') {
        btnReal.className = 'subway-mode-btn active-realtime sparkle-active-green';
        btnTime.className = 'subway-mode-btn';
      } else {
        btnTime.className = 'subway-mode-btn active-timetable sparkle-active-amber';
        btnReal.className = 'subway-mode-btn';
      }
    }

    this.renderTransitBoard();
  }

  updateRefreshStatus() {
    if (!this.lastUpdated) return;
    const timeStr = this.lastLoadedTimeStr || new Date().toLocaleTimeString('ko-KR');
    const busStatusText = this.isLiveBus ? '버스 실시간(차량번호 연동)' : '버스 정규배차';
    let subwayStatusText = '';
    if (this.subwaySourceMode === 'timetable') {
      subwayStatusText = '9호선 공식시간표 계산';
    } else {
      subwayStatusText = this.isLiveSubway ? '9호선 실시간(열차번호 연동)' : '9호선 실시간 대기';
    }
    this.lastUpdated.innerHTML = `전광판 갱신: ${timeStr} <span style="color:#059669; font-weight:700;">(${busStatusText} · ${subwayStatusText})</span> <span style="margin-left:6px; color:#2563eb; font-weight:700;">🔄 ${this.REFRESH_INTERVAL}초 자동 갱신 (${this.refreshCountdown}초 전)</span>`;
  }

  formatSec(sec) {
    if (sec <= 0) return `<span class="transit-time-arrive">⚡ 곧 도착</span>`;
    if (sec < 60) return `<span class="transit-time-imminent">${sec}초 후</span>`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const sStr = s < 10 ? '0' + s : s;
    return `<span class="transit-time-min">${m}분</span> <span class="transit-time-sec">${sStr}초 후</span>`;
  }

  /**
   * 버스/열차 차량번호 끝 4자리 숫자를 시인성 있게 강조 포맷팅하는 헬퍼
   */
  formatPlateWithBigDigits(plate, icon = '🚌') {
    if (!plate) return '';
    const str = String(plate).trim();
    const m = str.match(/^(.*?)(\d{4})$/);
    if (m) {
      const prefix = m[1] ? `${m[1]} ` : '';
      return `${icon} ${prefix}<strong class="plate-digit-highlight" style="font-size:14.5px; font-weight:900; letter-spacing:0.5px; margin-left:1px;">${m[2]}</strong>`;
    }
    return `${icon} ${str}`;
  }

  formatPlateSmall(plate) {
    if (!plate) return '';
    const str = String(plate).trim();
    const m = str.match(/^(.*?)(\d{4})$/);
    if (m) {
      const prefix = m[1] ? `${m[1]} ` : '';
      return `${prefix}<strong style="font-size:12px; font-weight:800;">${m[2]}</strong>`;
    }
    return str;
  }

  // --- 서울시 버스도착정보 직결 공공 API 호출 함수 ---
  async fetchBusArrival(busRouteId, stId, ord) {
    const cacheKey = `${busRouteId}_${stId}_${ord}`;
    const directUrl = `http://ws.bus.go.kr/api/rest/arrive/getArrInfoByRoute?serviceKey=${this.busApiKey}&busRouteId=${busRouteId}&stId=${stId}&ord=${ord}&resultType=json`;

    // 1차: 직접 HTTP 통신 (Android usesCleartextTraffic 및 로컬/HTTP 환경)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(directUrl, {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const item = data?.msgBody?.itemList?.[0];
        if (item) {
          this.busCache[cacheKey] = item;
          return item;
        }
      }
    } catch (e) {
      // Android가 아닌 웹(HTTPS) 브라우저 환경에서 Mixed Content 차단 발생 시 프록시 fallback
    }

    // 2차: 안전한 CORS 프록시 fallback (웹 배포 환경)
    const proxyList = [
      url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      url => `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];

    for (const makeProxy of proxyList) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const proxyUrl = makeProxy(directUrl);
        const res = await fetch(proxyUrl, {
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const item = data?.msgBody?.itemList?.[0];
          if (item) {
            this.busCache[cacheKey] = item;
            return item;
          }
        }
      } catch (err) {
        // 다음 프록시 시도
      }
    }

    // 서버 일시 장애 시 직전 캐시 반환 (앱 크래시 방지)
    return this.busCache[cacheKey] || null;
  }

  // --- 서울시 지하철 실시간 도착정보 직결 공공 API 호출 함수 ---
  async fetchSubwayArrival(stationName) {
    const cacheKey = stationName;
    const directUrl = `http://swopenAPI.seoul.go.kr/api/subway/${this.subwayApiKey}/json/realtimeStationArrival/0/10/${encodeURIComponent(stationName)}`;

    // 1차: 직접 HTTP 통신
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(directUrl, {
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.realtimeArrivalList) {
          this.subwayCache[cacheKey] = data.realtimeArrivalList;
          return data.realtimeArrivalList;
        }
      }
    } catch (e) {
      // 프록시 fallback
    }

    // 2차: CORS 프록시 fallback
    const proxyList = [
      url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      url => `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];

    for (const makeProxy of proxyList) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const proxyUrl = makeProxy(directUrl);
        const res = await fetch(proxyUrl, {
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.realtimeArrivalList) {
            this.subwayCache[cacheKey] = data.realtimeArrivalList;
            return data.realtimeArrivalList;
          }
        }
      } catch (err) {}
    }

    return this.subwayCache[cacheKey] || null;
  }

  async loadAllData(showLoading = true) {
    if (!this.cardsContainer) return;
    if (this.isFetching) return;
    this.isFetching = true;

    if (showLoading) {
      this.cardsContainer.innerHTML = `
        <div class="transit-loading-box">
          <div style="font-size:26px; margin-bottom:8px; display:inline-block; animation:spin 1s infinite linear;">🔄</div>
          <div style="font-size:14.5px; font-weight:800; color:#0284c7;">실시간 대중교통 최신 정보 수신 중...</div>
          <p style="font-size:11.5px; color:#64748b; margin-top:4px;">서울시 버스(TOPIS) 차량번호 및 9호선 실시간 열차번호를 수신하고 있습니다.</p>
        </div>
      `;
      if (this.lastUpdated) {
        this.lastUpdated.innerHTML = `<span style="color:#0284c7; font-weight:800;">🔄 서울시 실시간 교통정보 수신 중...</span>`;
      }
    }

    const startTime = Date.now();
    const config = this.busConfigs[this.currentMode];
    const isCommute = (this.currentMode === 'commute');
    const subwayStationName = isCommute ? '선유도' : '국회의사당';

    try {
      // 버스(양천01, 603, 6620) 및 지하철(9호선) 동시 병렬 호출
      const busPromises = config.routes.map(r =>
        this.fetchBusArrival(r.busRouteId, r.stId, r.ord).catch(() => null)
      );
      const subwayPromise = this.fetchSubwayArrival(subwayStationName).catch(() => null);

      const [busResults, subwayResults] = await Promise.all([
        Promise.all(busPromises),
        subwayPromise
      ]);

      const busDataMap = {};
      config.routes.forEach((r, idx) => {
        busDataMap[r.routeNum] = busResults[idx];
      });

      // 사용자가 새로고침 애니메이션을 인지할 수 있도록 최소 250ms 보장
      const elapsed = Date.now() - startTime;
      if (showLoading && elapsed < 250) {
        await new Promise(r => setTimeout(r, 250 - elapsed));
      }

      this.lastLoadedTimeStr = new Date().toLocaleTimeString('ko-KR');
      this.isLiveBus = busResults.some(item => item && (parseInt(item.traTime1, 10) > 0 || item.arrmsg1));
      this.isLiveSubway = Array.isArray(subwayResults) && subwayResults.length > 0;

      this.renderResult(busDataMap, subwayResults);

      this.refreshCountdown = this.REFRESH_INTERVAL;
      this.updateRefreshStatus();

      this.updateLiveTickers();
    } catch (err) {
      console.error('교통 정보 수신 중 오류 발생:', err);
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * 실시간 서울시 버스 데이터 파싱 및 UI 변환 엔진
   */
  parseSeoulBusArrival(routeConfig, busItem, now, nowMs) {
    const headway = routeConfig.headway;
    const targetOrd = parseInt(routeConfig.ord, 10);

    let next = null;
    let next2 = null;

    if (busItem) {
      const traTime1 = parseInt(busItem.traTime1 || '0', 10);
      const sectOrd1 = parseInt(busItem.sectOrd1 || '0', 10);
      const arrmsg1 = (busItem.arrmsg1 || '').trim();
      const plainNo1 = (busItem.plainNo1 || '').trim();

      const traTime2 = parseInt(busItem.traTime2 || '0', 10);
      const sectOrd2 = parseInt(busItem.sectOrd2 || '0', 10);
      const arrmsg2 = (busItem.arrmsg2 || '').trim();
      const plainNo2 = (busItem.plainNo2 || '').trim();

      // --- 1번째 버스 분석 ---
      // 남은 정류장 수 파싱 ("[N번째 전]")
      let stop1Text = '';
      const match1 = arrmsg1.match(/\[(\d+)번째\s*전\]/);
      if (match1) {
        stop1Text = `[${match1[1]}번째 전]`;
      } else if (sectOrd1 > 0 && targetOrd > sectOrd1) {
        stop1Text = `[${targetOrd - sectOrd1}번째 전]`;
      }

      // 특수 메시지 판정: "곧 도착", "출발대기", "운행종료"
      const isArrivingSoon1 = arrmsg1.includes('곧 도착');
      const isWait1 = arrmsg1.includes('출발대기');
      const isEnd1 = arrmsg1.includes('운행종료');

      let sec1 = traTime1;
      if (isArrivingSoon1) {
        sec1 = Math.min(sec1 > 0 ? sec1 : 30, 45);
      }

      next = {
        sec: sec1,
        rawSec: traTime1,
        arrmsg: arrmsg1,
        stopText: stop1Text,
        plainNo: plainNo1,
        isArrivingSoon: isArrivingSoon1,
        isWait: isWait1,
        isEnd: isEnd1,
        targetTime: (sec1 > 0) ? (nowMs + sec1 * 1000) : null,
        isEstimate: false
      };

      // --- 2번째 버스 분석 ---
      let stop2Text = '';
      const match2 = arrmsg2.match(/\[(\d+)번째\s*전\]/);
      if (match2) {
        stop2Text = `[${match2[1]}번째 전]`;
      } else if (sectOrd2 > 0 && targetOrd > sectOrd2) {
        stop2Text = `[${targetOrd - sectOrd2}번째 전]`;
      }

      const isWait2 = arrmsg2.includes('출발대기');
      const isEnd2 = arrmsg2.includes('운행종료');
      const isArrivingSoon2 = arrmsg2.includes('곧 도착');

      if (traTime2 > 0 || isWait2 || isArrivingSoon2) {
        let sec2 = traTime2;
        if (isArrivingSoon2) sec2 = Math.min(sec2 > 0 ? sec2 : 45, 60);

        next2 = {
          sec: sec2,
          rawSec: traTime2,
          arrmsg: arrmsg2,
          stopText: stop2Text,
          plainNo: plainNo2,
          isWait: isWait2,
          isEnd: isEnd2,
          targetTime: (sec2 > 0) ? (nowMs + sec2 * 1000) : null,
          isEstimate: false
        };
      } else if (sec1 > 0 && !isWait1 && !isEnd1) {
        // 2번째 버스가 실시간 목록에 없으면 공식 배차간격 기반 다음 순번 추정
        const next2Sec = sec1 + headway;
        next2 = {
          sec: next2Sec,
          rawSec: next2Sec,
          arrmsg: '배차 간격 운행',
          stopText: '차기 순번',
          plainNo: '',
          isWait: false,
          isEnd: false,
          targetTime: nowMs + next2Sec * 1000,
          isEstimate: true
        };
      }
    }

    // 실시간 정보가 전혀 없는 시간대(심야 등): 정규 배차순번 추정
    if (!next) {
      const curSecInHour = now.getMinutes() * 60 + now.getSeconds();
      const cycleOffset = headway - (curSecInHour % headway);

      next = {
        sec: cycleOffset,
        rawSec: cycleOffset,
        arrmsg: '정규 배차순번',
        stopText: '정규 배차',
        plainNo: '',
        isArrivingSoon: false,
        isWait: false,
        isEnd: false,
        targetTime: nowMs + cycleOffset * 1000,
        isEstimate: true
      };

      const next2Sec = cycleOffset + headway;
      next2 = {
        sec: next2Sec,
        rawSec: next2Sec,
        arrmsg: '차기 배차순번',
        stopText: '차기 순번',
        plainNo: '',
        isWait: false,
        isEnd: false,
        targetTime: nowMs + next2Sec * 1000,
        isEstimate: true
      };
    }

    // 사용자 요청: 출퇴근 시간에 버스 시간표에 연동되던 것을 중지하고 버스 번호로 실시간 도착정보를 최우선 수신
    // 실시간 버스 정보가 유효한 경우(!next.isEstimate), 시간표로 덮어쓰지 않고 실시간 정보를 100% 우선 적용합니다.
    // 실시간 데이터가 없는 경우(심야, 미운행 등 next.isEstimate인 상태)에만 시간표를 보조로 활용합니다.
    if (next && next.isEstimate) {
      const prioritySchedule = (typeof getPriorityBusSchedule === 'function')
        ? getPriorityBusSchedule(routeConfig.routeNum, (routeConfig.stId === '114000052' || routeConfig.arsId === '15-154') ? '15154' : '', now)
        : null;

      if (prioritySchedule && prioritySchedule.next) {
        const pNext = prioritySchedule.next;
        const pNext2 = prioritySchedule.next2;

        const isImminent = pNext.diffSec <= 35;
        const livePlate1 = (busItem && busItem.plainNo1) ? busItem.plainNo1 : '';

        next = {
          sec: pNext.diffSec,
          rawSec: pNext.diffSec,
          arrmsg: `${pNext.time} 정시운행`,
          stopText: isImminent ? '정류소 진입 중' : `정시 시간표 (${prioritySchedule.periodName})`,
          plainNo: livePlate1,
          isArrivingSoon: isImminent,
          isWait: false,
          isEnd: false,
          targetTime: pNext.targetTime,
          isEstimate: false,
          isPriority: true,
          priorityTime: pNext.time,
          periodName: prioritySchedule.periodName
        };

        if (pNext2) {
          const livePlate2 = (busItem && busItem.plainNo2) ? busItem.plainNo2 : '';
          next2 = {
            sec: pNext2.diffSec,
            rawSec: pNext2.diffSec,
            arrmsg: `${pNext2.time} 정시운행`,
            stopText: `차기 순번 (${pNext2.time})`,
            plainNo: livePlate2,
            isWait: false,
            isEnd: false,
            targetTime: pNext2.targetTime,
            isEstimate: false,
            isPriority: true,
            priorityTime: pNext2.time
          };
        }
      }
    }

    // 양천01의 경우 사용자 요청에 따라 다다다음(next3)까지 계산 투영 (평일 5~8분 / 주말 8~12분 배차)
    let next3 = null;
    if (routeConfig.routeNum === '양천01') {
      const baseTargetMs = (next2 && next2.targetTime) ? next2.targetTime : (next.targetTime ? next.targetTime + headway * 1000 : nowMs + headway * 2000);
      const next3TargetMs = baseTargetMs + headway * 1000;
      const next3Sec = Math.max(1, Math.round((next3TargetMs - nowMs) / 1000));
      const d3 = new Date(next3TargetMs);
      const clock3 = `${String(d3.getHours()).padStart(2, '0')}:${String(d3.getMinutes()).padStart(2, '0')}`;
      next3 = {
        sec: next3Sec,
        targetTime: next3TargetMs,
        clockStr: clock3,
        arrmsg: '다다다음 순번',
        stopText: '차기 배차'
      };
    }

    return { next, next2, next3 };
  }

  /**
   * 실시간 서울시 지하철(9호선 일반열차) 데이터 파싱 및 UI 변환 엔진
   */
  parseRealtimeSubwayArrival(stationName, updnLine, rawList, now, nowMs) {
    if (!rawList || !Array.isArray(rawList)) return null;

    // 9호선(subwayId 1009) & 일반열차 & 해당 방향(상행/하행) 필터링
    const filtered = rawList.filter(item => {
      if (item.subwayId !== '1009') return false;
      const isNormal = (item.btrainSttus === '일반' || !item.btrainSttus || item.btrainSttus === '0');
      const isDir = (item.updnLine === updnLine);
      return isNormal && isDir;
    });

    if (filtered.length === 0) return null;

    // barvlDt (도착 예정 초) 오름차순 정렬 (보정 후 초 기준)
    filtered.sort((a, b) => {
      const secA = Math.max(0, parseInt(a.barvlDt || '0', 10) - 60);
      const secB = Math.max(0, parseInt(b.barvlDt || '0', 10) - 60);
      return secA - secB;
    });

    const formatTrain = (item) => {
      // 1. 남은 시간 1분(60초) 앞당김 보정 로직 (서버 API 갱신 지연 보정)
      const rawSeconds = parseInt(item.barvlDt || '0', 10);
      // 60초를 차감하여 보정 (음수 방지를 위해 최소값 0 설정)
      const compensatedSeconds = Math.max(0, rawSeconds - 60);

      const trainNo = (item.btrainNo || '').trim();
      const dest = item.bstatnNm || (updnLine === '상행' ? '중앙보훈병원' : '개화');
      const curLoc = item.arvlMsg3 ? `[${item.arvlMsg3}]` : '';
      const statusMsg = (item.arvlMsg2 || '').trim();

      // 2. 60초 이하로 남았거나 상태코드가 진입(0)/도착(1)이거나 메시지에 진입/도착 포함 시 즉시 '곧 도착' 처리
      const isArrivingSoon = (compensatedSeconds === 0) ||
        (item.arvlCd === '0' || item.arvlCd === '1') ||
        statusMsg.includes('도착') || statusMsg.includes('진입');

      let displayEta = "";
      if (isArrivingSoon) {
        displayEta = "⚡ 곧 도착";
      } else {
        const min = Math.floor(compensatedSeconds / 60);
        const secRem = compensatedSeconds % 60;
        displayEta = min === 0 ? `${secRem}초 후` : `${min}분 ${secRem}초 후`;
      }

      let sec = compensatedSeconds;
      if (isArrivingSoon && sec <= 0) sec = 25;
      else if (sec <= 0) sec = 45;

      const targetTime = nowMs + sec * 1000;
      const dt = new Date(targetTime);
      const clockStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

      return {
        sec: sec,
        rawSec: rawSeconds,
        compensatedSec: compensatedSeconds,
        displayEta: displayEta,
        trainNo: trainNo,
        destName: dest,
        curLocation: curLoc,
        statusMsg: statusMsg,
        isArrivingSoon: isArrivingSoon,
        targetTime: targetTime,
        clockStr: clockStr,
        isLive: true
      };
    };

    const nextTrain = filtered[0] ? formatTrain(filtered[0]) : null;
    const next2Train = filtered[1] ? formatTrain(filtered[1]) : null;

    return { nextTrain, next2Train };
  }

  // 대한민국 공휴일 판별
  isKoreanHoliday(date) {
    if (typeof window !== 'undefined' && typeof window.isKoreanHoliday === 'function') {
      return window.isKoreanHoliday(date);
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const md = `${m}-${d}`;
    if (typeof window !== 'undefined' && window.KR_HOLIDAYS_MAP && window.KR_HOLIDAYS_MAP[dateStr]) {
      return true;
    }
    const fixed = ['01-01','03-01','05-05','06-06','08-15','10-03','10-09','12-25'];
    return fixed.includes(md);
  }

  isWeekendOrHoliday(date) {
    const day = date.getDay();
    return day === 0 || day === 6 || this.isKoreanHoliday(date);
  }

  /**
   * 노선별 실 배차간격(초) 계산
   * - 양천01: 평일 약 5~8분 (출퇴근 혼잡 6분 내외, 평시 7분) / 주말 및 공휴일 약 8~12분 (평균 10분)
   * - 603: 평일 약 10~12분 / 주말 13~15분
   * - 6620: 평일 약 12~15분 / 주말 15~18분
   */
  getRouteHeadwaySec(routeNum, now) {
    const isHoliday = this.isWeekendOrHoliday(now);
    const hour = now.getHours();
    const min = now.getMinutes();
    const currentMinOfDay = hour * 60 + min;

    if (routeNum === '양천01') {
      if (isHoliday) {
        // 주말 및 공휴일: 약 8~12분 (평균 10분 = 600초)
        return 10 * 60;
      } else {
        // 평일: 약 5~8분 (출퇴근 혼잡도에 따라 6~10분 내외, 출퇴근 약 6분, 낮시간 7분)
        const isRushHour = (currentMinOfDay >= 7 * 60 && currentMinOfDay <= 9 * 60 + 30) ||
                           (currentMinOfDay >= 17 * 60 + 30 && currentMinOfDay <= 20 * 60);
        return isRushHour ? 6 * 60 : 7 * 60;
      }
    } else if (routeNum === '603') {
      return isHoliday ? 13 * 60 : 11 * 60;
    } else if (routeNum === '6620') {
      return isHoliday ? 16 * 60 : 13 * 60;
    }
    return 10 * 60;
  }

  /**
   * 시간표 딕셔너리의 모든 분(minute)을 minutesToShift(1분)만큼 일괄 앞당기는 헬퍼
   */
  shiftScheduleDictEarlier(scheduleDict, minutesToShift = 1) {
    const adjusted = {};
    for (const [hStr, mins] of Object.entries(scheduleDict)) {
      const h = Number(hStr);
      for (const m of mins) {
        let totalMin = h * 60 + m - minutesToShift;
        if (totalMin < 0) totalMin += 24 * 60;
        const newH = Math.floor(totalMin / 60) % 24;
        const newM = totalMin % 60;
        if (!adjusted[newH]) adjusted[newH] = [];
        adjusted[newH].push(newM);
      }
    }
    for (const h in adjusted) {
      adjusted[h].sort((a, b) => a - b);
    }
    return adjusted;
  }

  // ==========================================
  // 9호선 역사 공식 고정 시간표 배차 엔진 (1분 앞당김 보정 적용)
  // ==========================================
  getStationSchedules() {
    const rawSchedules = {
      NATIONAL_ASSEMBLY_WEEKDAY: {
        5: [42, 53],
        6: [6, 22, 37, 50],
        7: [3, 16, 29, 42, 50],
        8: [2, 14, 22, 31, 39, 48, 57],
        9: [4, 11, 17, 23, 30, 36, 42, 49, 55],
        10: [1, 8, 14, 20, 27, 33, 39, 44, 52, 57],
        11: [5, 13, 23, 34, 45, 56],
        12: [7, 18, 29, 41, 53],
        13: [4, 15, 26, 37, 48, 59],
        14: [10, 21, 32, 43, 54],
        15: [5, 16, 28, 41, 53],
        16: [4, 15, 26, 37, 48, 59],
        17: [10, 21, 32, 43, 54],
        18: [5, 16, 24, 32, 40, 48, 56],
        19: [4, 11, 18, 25, 32, 38, 45, 52, 59],
        20: [6, 13, 19, 26, 33, 40, 47, 54],
        21: [0, 7, 15, 22, 28, 36, 46, 57],
        22: [5, 8, 19, 30, 41, 52],
        23: [3, 14, 25, 36, 47, 58],
        24: [9, 20, 31, 42, 53] // 42분 마곡나루행, 53분 염창행
      },
      NATIONAL_ASSEMBLY_WEEKEND: {
        5: [41, 52],
        6: [5, 18, 35, 50],
        7: [2, 14, 26, 38, 50],
        8: [2, 14, 26, 38, 50],
        9: [2, 14, 26, 37, 50],
        10: [1, 12, 23, 34, 45, 56],
        11: [7, 18, 29, 40, 51],
        12: [2, 13, 24, 35, 46, 57],
        13: [8, 19, 30, 41, 52],
        14: [3, 14, 25, 36, 47, 58],
        15: [9, 20, 31, 42, 53],
        16: [4, 15, 26, 37, 48, 59],
        17: [10, 21, 32, 43, 54],
        18: [5, 16, 27, 38, 49],
        19: [0, 11, 22, 33, 44, 55],
        20: [6, 17, 28, 39, 50],
        21: [1, 11, 23, 34, 45, 56],
        22: [7, 18, 29, 40, 52],
        23: [6, 18, 33, 50] // 50분 염창행
      },
      SEONYUDO_WEEKDAY: {
        5: [34, 48, 59],
        6: [11, 23, 35, 43, 50, 59],
        7: [5, 11, 18, 24, 30, 37, 43, 49, 56],
        8: [2, 8, 15, 21, 27, 34, 40, 46, 53],
        9: [2, 11, 22, 33, 44, 55],
        10: [6, 17, 28, 39, 50],
        11: [1, 13, 25, 36, 47, 58],
        12: [9, 20, 31, 42, 53],
        13: [4, 15, 26, 38, 50],
        14: [1, 12, 23, 34, 45, 56],
        15: [7, 18, 29, 40, 51],
        16: [2, 10, 14, 26, 37, 39, 49, 59],
        17: [5, 12, 19, 26, 33, 40, 46, 53],
        18: [0, 7, 14, 21, 27, 34, 41, 48, 55],
        19: [2, 8, 15, 22, 31, 40, 49, 58],
        20: [7, 18, 29, 40, 51],
        21: [2, 13, 24, 35, 46, 57],
        22: [8, 19, 30, 41, 52],
        23: [3, 14, 25, 36, 47, 57],
        24: [7, 18, 30, 43, 56] // 18분 삼전행, 30분 신논현행, 43분 동작행, 56분 당산행 막차
      },
      SEONYUDO_WEEKEND: {
        5: [36, 47, 57],
        6: [9, 21, 33, 45, 57],
        7: [9, 21, 33, 45, 57],
        8: [9, 21, 33, 45, 57],
        9: [9, 21, 32, 42, 53],
        10: [4, 15, 26, 37, 48, 59],
        11: [10, 21, 32, 43, 54],
        12: [5, 16, 27, 38, 49],
        13: [0, 11, 22, 33, 44, 55],
        14: [6, 17, 28, 39, 50],
        15: [1, 12, 23, 34, 45, 56],
        16: [7, 18, 29, 40, 51],
        17: [2, 13, 24, 35, 46, 57],
        18: [8, 19, 30, 41, 52],
        19: [3, 14, 25, 36, 47, 58],
        20: [9, 20, 31, 42, 53],
        21: [4, 15, 26, 37, 50],
        22: [3, 16, 30, 44, 56],
        23: [11, 27, 41, 55] // 27분 신논현행, 41분 동작행, 55분 당산행 막차
      }
    };

    // 사용자의 요구에 따라 전체 시간표를 일괄 1분씩 앞당겨 적용
    return {
      NATIONAL_ASSEMBLY_WEEKDAY: this.shiftScheduleDictEarlier(rawSchedules.NATIONAL_ASSEMBLY_WEEKDAY, 1),
      NATIONAL_ASSEMBLY_WEEKEND: this.shiftScheduleDictEarlier(rawSchedules.NATIONAL_ASSEMBLY_WEEKEND, 1),
      SEONYUDO_WEEKDAY: this.shiftScheduleDictEarlier(rawSchedules.SEONYUDO_WEEKDAY, 1),
      SEONYUDO_WEEKEND: this.shiftScheduleDictEarlier(rawSchedules.SEONYUDO_WEEKEND, 1)
    };
  }

  getPrioritizedTrains(now, isCommute, count = 2) {
    const isHoliday = this.isWeekendOrHoliday(now);
    const schedules = this.getStationSchedules();
    let schedule;
    let defaultDest;
    let stationName;

    if (isCommute) {
      stationName = '선유도역';
      defaultDest = '중앙보훈병원';
      schedule = isHoliday ? schedules.SEONYUDO_WEEKEND : schedules.SEONYUDO_WEEKDAY;
    } else {
      stationName = '국회의사당역';
      defaultDest = '개화';
      schedule = isHoliday ? schedules.NATIONAL_ASSEMBLY_WEEKEND : schedules.NATIONAL_ASSEMBLY_WEEKDAY;
    }

    const rawH = now.getHours();
    const currentH = (rawH === 0) ? 24 : rawH;
    const currentMinutes = currentH * 60 + now.getMinutes();
    const currentSec = now.getSeconds();
    const nowMs = now.getTime();

    const results = [];
    const hours = Object.keys(schedule).map(Number).sort((a, b) => a - b);

    for (const h of hours) {
      const mins = schedule[h];
      for (const m of mins) {
        const trainMin = h * 60 + m;
        const diffSec = (trainMin - currentMinutes) * 60 - currentSec;
        if (diffSec >= -30) {
          let dest = defaultDest;
          if (stationName === '국회의사당역') {
            if (h === 24 && m === 42) {
              dest = '마곡나루(종착)';
            } else if ((h === 24 && m === 53) || (h === 23 && m === 50 && isHoliday)) {
              dest = '염창(종착)';
            }
          } else if (stationName === '선유도역') {
            if (h === 24 && !isHoliday) {
              if (m === 18) dest = '삼전(종착)';
              else if (m === 30) dest = '신논현(종착)';
              else if (m === 43) dest = '동작(종착)';
              else if (m === 56) dest = '당산(종착)';
            } else if (h === 23 && isHoliday) {
              if (m === 27) dest = '신논현(종착)';
              else if (m === 41) dest = '동작(종착)';
              else if (m === 55) dest = '당산(종착)';
            }
          }

          const displayH = (h === 24) ? '00' : String(h).padStart(2, '0');
          const displayM = String(m).padStart(2, '0');

          results.push({
            departureTime: `${displayH}:${displayM}`,
            endStationName: dest,
            sec: Math.max(0, diffSec),
            remainSeconds: Math.max(0, diffSec),
            remainMinutes: Math.floor(Math.max(0, diffSec) / 60),
            targetTime: nowMs + Math.max(0, diffSec) * 1000,
            source: '역고정시간표(우선)',
            subwayClass: 0
          });
          if (results.length >= count) break;
        }
      }
      if (results.length >= count) break;
    }

    if (results.length === 0 && (rawH >= 1 && rawH < 5)) {
      const firstH = hours[0];
      const firstM = schedule[firstH][0];
      const displayH = String(firstH).padStart(2, '0');
      const displayM = String(firstM).padStart(2, '0');
      const firstTrainMin = firstH * 60 + firstM;
      const diffSec = (firstTrainMin - (rawH * 60 + now.getMinutes())) * 60 - currentSec;
      results.push({
        departureTime: `${displayH}:${displayM}`,
        endStationName: defaultDest,
        sec: Math.max(0, diffSec),
        remainSeconds: Math.max(0, diffSec),
        remainMinutes: Math.floor(Math.max(0, diffSec) / 60),
        targetTime: nowMs + Math.max(0, diffSec) * 1000,
        source: '역고정시간표(첫차)',
        subwayClass: 0,
        isFirstTrain: true
      });
    }

    return results;
  }

  /**
   * "HH:MM:SS" 또는 "HH:MM" 형식의 시간 문자열에서 특정 분(minutes)만큼 앞당기는 유틸 함수
   */
  shiftTimeEarlier(timeStr, minutesToShift = 1) {
    if (!timeStr || typeof timeStr !== 'string') return timeStr;

    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return timeStr;

    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1], 10);
    const seconds = parts.length > 2 ? parts[2] : null;

    if (isNaN(hours) || isNaN(minutes)) return timeStr;

    let totalMinutes = hours * 60 + minutes - minutesToShift;
    if (totalMinutes < 0) totalMinutes += 24 * 60;

    const newH = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    const newM = String(totalMinutes % 60).padStart(2, '0');

    return seconds !== null ? `${newH}:${newM}:${seconds}` : `${newH}:${newM}`;
  }

  /**
   * API로 받아온 9호선 열차 목록 데이터의 시간을 일괄 1분씩 당기는 함수
   * @param {Array<Object>} timetableList - 지하철 시간표 목록
   * @returns {Array<Object>} - 1분 앞당겨진 시간표 목록
   */
  adjustSubwaySchedule(timetableList) {
    if (!Array.isArray(timetableList)) return [];

    return timetableList.map((train) => {
      // API 필드명에 맞춰 보정 (예: arrtime, deptime, ARRIVETIME 등)
      const adjusted = { ...train };

      // 도착 시간 필드가 있는 경우 1분 차감
      if (adjusted.arrtime) {
        adjusted.arrtime = this.shiftTimeEarlier(adjusted.arrtime, 1);
      }
      if (adjusted.ARRIVETIME) {
        adjusted.ARRIVETIME = this.shiftTimeEarlier(adjusted.ARRIVETIME, 1);
      }

      // 출발 시간 필드가 있는 경우 1분 차감
      if (adjusted.deptime) {
        adjusted.deptime = this.shiftTimeEarlier(adjusted.deptime, 1);
      }
      if (adjusted.LEFTTIME) {
        adjusted.LEFTTIME = this.shiftTimeEarlier(adjusted.LEFTTIME, 1);
      }
      if (adjusted.departureTime) {
        adjusted.departureTime = this.shiftTimeEarlier(adjusted.departureTime, 1);
      }

      // 실시간 '도착 예정 잔여 초(barvlDt)' 데이터가 오는 경우 (단위: 초)
      if (adjusted.barvlDt !== undefined && !isNaN(Number(adjusted.barvlDt))) {
        const remainingSec = Number(adjusted.barvlDt);
        // 1분(60초) 차감하되 0초 미만이면 0(도착 진입)으로 고정
        adjusted.barvlDt = String(Math.max(0, remainingSec - 60));
      }

      // 잔여 초 및 목표 시각도 1분(60초) 차감 보정
      if (adjusted.sec !== undefined && !isNaN(Number(adjusted.sec))) {
        adjusted.sec = Math.max(0, Number(adjusted.sec) - 60);
        adjusted.remainSeconds = adjusted.sec;
        adjusted.remainMinutes = Math.floor(adjusted.sec / 60);
      }
      if (adjusted.targetTime !== undefined && !isNaN(Number(adjusted.targetTime))) {
        adjusted.targetTime = adjusted.targetTime - 60000;
      }

      return adjusted;
    });
  }

  renderResult(busDataMap, subwayRawList = null) {
    const isCommute = (this.currentMode === 'commute');
    const now = new Date();
    const nowMs = now.getTime();
    const config = this.busConfigs[this.currentMode];

    let busHtml = '';
    let subwayHtml = '';

    // ==========================================
    // 1. 서울시 공공 버스 도착 전광판 카드 (실시간 버스 번호 100% 최우선)
    // ==========================================
    const routeItems = config.routes.map(r => {
      const busItem = busDataMap[r.routeNum];
      const { next, next2 } = this.parseSeoulBusArrival(r, busItem, now, nowMs);

      // --- 🔴 다음 버스 UI ---
      let nextTimeHtml = '';
      let nextSubLoc = '';

      if (next.isWait) {
        nextTimeHtml = `<span class="transit-time-imminent" style="color:#d97706;">⏸️ 출발대기</span>`;
        nextSubLoc = `상태: <b>기점/차고지 출발대기</b>`;
      } else if (next.isEnd) {
        nextTimeHtml = `<span class="transit-time-arrive" style="color:#64748b;">🚫 운행종료</span>`;
        nextSubLoc = `상태: <b>오늘 운행종료</b>`;
      } else if (next.isArrivingSoon || next.sec <= 30) {
        nextTimeHtml = `<span class="transit-time-arrive">⚡ 곧 도착</span>`;
        const loc = next.stopText ? `${next.stopText} · 진입 중` : '정류소 진입 중';
        nextSubLoc = `위치: <b>${loc}</b>`;
      } else if (next.targetTime) {
        nextTimeHtml = `<span class="live-countdown" data-target-time="${next.targetTime}">${this.formatSec(next.sec)}</span>`;
        const loc = next.stopText || '운행 중';
        nextSubLoc = `위치: <b>${loc}</b>`;
      } else {
        nextTimeHtml = `<span class="transit-time-arrive">⚡ 곧 도착</span>`;
        nextSubLoc = `위치: <b>운행 중</b>`;
      }

      // 도착 예정 시각 및 시간표 우선 정보 매핑
      let nextArrClock = '';
      let nextScheduleBadge = '';
      if (next.isPriority && next.priorityTime) {
        nextArrClock = next.priorityTime;
        nextScheduleBadge = `<span class="badge-priority-timetable" style="display:inline-flex; align-items:center; background:#fef3c7; color:#92400e; font-size:10.5px; padding:1px 6px; border-radius:4px; font-weight:800; margin-left:6px; border:1px solid #fde68a;">🗓️ 공식 시간표</span>`;
      } else if (next.targetTime && !next.isWait && !next.isEnd) {
        const nextArrTime = new Date(next.targetTime);
        nextArrClock = `${String(nextArrTime.getHours()).padStart(2, '0')}:${String(nextArrTime.getMinutes()).padStart(2, '0')}`;
      }

      const vehicleBadge1 = next.plainNo
        ? `<span class="badge-bus-plate" style="display:inline-flex; align-items:center; background:#f1f5f9; color:#334155; font-size:11px; padding:2px 7px; border-radius:5px; font-weight:700; margin-left:6px; border:1px solid #cbd5e1;">${this.formatPlateWithBigDigits(next.plainNo, '🚌')}</span>`
        : '';

      const nextHtml = `
        <div class="next-transit-box">
          <div class="next-transit-header">
            <span class="next-tag-red">
              <span>🔴</span>
              <span>다음 버스</span>
              ${vehicleBadge1}
            </span>
            <span class="next-time-big">
              ${nextTimeHtml}
            </span>
          </div>
          <div class="next-transit-sub">
            <span class="transit-sub-pos">${nextSubLoc}</span>
            ${nextArrClock ? `<span class="transit-sub-time"><span class="transit-arr-label">도착 예정:</span> <b class="transit-clock-time" style="color:#0369a1; font-weight:900;">${nextArrClock}</b></span>` : ''}
          </div>
        </div>
      `;

      // --- 🔵 다다음 버스 UI ---
      let next2Html = '';
      if (next2) {
        let next2TimeHtml = '';
        let next2SubText = '';

        if (next2.isWait) {
          next2TimeHtml = `<span style="color:#d97706; font-weight:700;">출발대기</span>`;
          next2SubText = '차고지 대기';
        } else if (next2.isEnd) {
          next2TimeHtml = `<span style="color:#64748b; font-weight:700;">운행종료</span>`;
          next2SubText = '종료';
        } else if (next2.targetTime) {
          const next2ArrTime = new Date(next2.targetTime);
          const next2Clock = next2.priorityTime || `${String(next2ArrTime.getHours()).padStart(2, '0')}:${String(next2ArrTime.getMinutes()).padStart(2, '0')}`;
          next2TimeHtml = `<span class="live-countdown next2-countdown" data-target-time="${next2.targetTime}">${this.formatSec(next2.sec)}</span>`;
          const priorityTag = next2.isPriority ? ` <span style="font-size:10px; color:#b45309; font-weight:700;">[시간표]</span>` : '';
          next2SubText = `<b class="transit-clock-time">${next2Clock}</b>${priorityTag}${next2.stopText ? ` · ${next2.stopText}` : ''}`;
        }

        const vehicleBadge2 = next2.plainNo ? `<span style="font-size:10.5px; color:#475569; font-weight:600; margin-left:4px;">(${this.formatPlateSmall(next2.plainNo)})</span>` : '';

        next2Html = `
          <div class="next2-transit-box">
            <span class="next2-tag-blue">
              <span>🔵 다다음 (${next2SubText}):${vehicleBadge2}</span>
            </span>
            ${next2TimeHtml}
          </div>
        `;
      }

      let next3Html = '';
      if (r.routeNum === '양천01') {
        const headwaySec = this.getRouteHeadwaySec('양천01', now);
        let baseTargetMs = null;
        if (next2 && next2.targetTime) {
          baseTargetMs = next2.targetTime;
        } else if (next && next.targetTime) {
          baseTargetMs = next.targetTime + headwaySec * 1000;
        } else {
          baseTargetMs = nowMs + headwaySec * 1000;
        }
        const next3TargetMs = baseTargetMs + headwaySec * 1000;
        const next3Sec = Math.max(0, Math.round((next3TargetMs - nowMs) / 1000));
        const next3ArrTime = new Date(next3TargetMs);
        const next3Clock = `${String(next3ArrTime.getHours()).padStart(2, '0')}:${String(next3ArrTime.getMinutes()).padStart(2, '0')}`;
        next3Html = `
          <div class="next2-transit-box next3-transit-box" style="margin-top:4px; opacity:0.95;">
            <span class="next2-tag-blue" style="color:#475569;">
              <span>🟣 다다다음 (<b class="transit-clock-time" style="font-size:14px; font-weight:800; color:#6366f1;">${next3Clock}</b> · 정규배차)</span>
            </span>
            <span class="live-countdown next2-countdown" data-target-time="${next3TargetMs}">${this.formatSec(next3Sec)}</span>
          </div>
        `;
      }

      return `
        <div class="bit-route-item">
          <div class="bit-route-top">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="${r.badgeClass}">${r.routeNum}</span>
              <span class="bit-route-type-label">${r.typeText}</span>
              ${nextScheduleBadge}
            </div>
          </div>
          ${nextHtml}
          ${next2Html}
          ${next3Html}
        </div>
      `;
    }).join('');

    busHtml = `
      <div class="bit-board-card">
        <div class="bit-header-row">
          <div class="bit-title-group">
            <span class="bit-ars-badge">ARS ${config.arsId}</span>
            <strong class="bit-station-name">${config.stationName}</strong>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="bit-status-live"><span class="bit-status-dot"></span> 서울시 버스실시간</span>
            <button type="button" class="btn-timetable-toggle" onclick="window.transitManager && window.transitManager.openTimetableModal('bus')" title="공식 버스 시간표 조회" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a; font-size:11px; font-weight:700; padding:2px 7px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">🗓️ 시간표</button>
          </div>
        </div>

        <div class="bit-desc-row">
          <span>📍 정류소 실시간 도착 현황</span>
          <span class="bit-dest-pill">${config.destNote}</span>
        </div>

        <div class="bit-route-list">
          ${routeItems}
        </div>

        <div class="bit-footer-info">
          <span>💡 서울시 버스도착정보 공식 API(TOPIS) 연동으로 실시간 버스 번호 및 초 단위 카운트다운을 제공합니다.</span>
        </div>
      </div>
    `;

    // ==========================================
    // 2. 9호선 지하철 도착 전광판 카드 (실시간 일반열차번호 최우선 연동 + 역사시간표 보조)
    // ==========================================
    const subwayStationName = isCommute ? '선유도역 9호선 [상행]' : '국회의사당역 9호선 [하행]';
    const subwayDir = isCommute ? '당산·중앙보훈병원 방면' : '당산·개화 방면 (선유도역 방향)';
    const subwayTargetStation = isCommute ? '선유도' : '국회의사당';
    const subwayUpdn = isCommute ? '상행' : '하행';

    const isHolidayToday = this.isWeekendOrHoliday(now);
    const dayTypeLabel = isHolidayToday ? '🌴 주말·공휴일 시간표' : '🗓️ 평일 시간표';

    const isTimetableMode = (this.subwaySourceMode === 'timetable');
    let isLiveTrain = false;
    let t1 = null;
    let t2 = null;

    if (!isTimetableMode) {
      // [1] 서울시 실시간 지하철 모드: 공공 API 실시간 일반열차 파싱 시도 (열차번호/실시간 위치)
      const realtimeSubway = this.parseRealtimeSubwayArrival(subwayTargetStation, subwayUpdn, subwayRawList, now, nowMs);
      if (realtimeSubway && realtimeSubway.nextTrain) {
        isLiveTrain = true;
        t1 = realtimeSubway.nextTrain;
        t2 = realtimeSubway.next2Train;
      }
    }

    // [2] 시간표 모드이거나 실시간 데이터 부재 시: 역사 고정 시간표로 도착시간 계산
    if (!t1) {
      const prioritizedTrains = this.getPrioritizedTrains(now, isCommute, 2);
      if (prioritizedTrains && prioritizedTrains.length > 0) {
        const pt1 = prioritizedTrains[0];
        const pt2 = prioritizedTrains.length > 1 ? prioritizedTrains[1] : null;
        t1 = {
          trainNo: '',
          sec: pt1.sec,
          rawSec: pt1.sec,
          destName: pt1.endStationName,
          curLocation: '',
          statusMsg: isTimetableMode ? '공식 시간표 정시 운행' : '역고정 공식 시간표 (실시간 대기)',
          clockStr: pt1.departureTime,
          targetTime: pt1.targetTime,
          isLive: false,
          isArrivingSoon: pt1.sec <= 30
        };
        if (pt2) {
          t2 = {
            trainNo: '',
            sec: pt2.sec,
            rawSec: pt2.sec,
            destName: pt2.endStationName,
            curLocation: '',
            statusMsg: isTimetableMode ? '공식 시간표 정시 운행' : '역고정 공식 시간표 (실시간 대기)',
            clockStr: pt2.departureTime,
            targetTime: pt2.targetTime,
            isLive: false,
            isArrivingSoon: pt2.sec <= 30
          };
        }
      }
    }

    this.isLiveSubway = isLiveTrain;

    let subwayTrainsHtml = '';
    if (t1) {
      let t2Html = '';
      if (t2) {
        const t2VehicleTag = t2.trainNo ? `<span class="next2-train-plate" style="font-size:11px; color:#1e40af; font-weight:700; margin-left:4px;">(${this.formatPlateSmall(t2.trainNo)})</span>` : '';
        const t2TimeHtml = (t2.isArrivingSoon || t2.sec <= 30)
          ? `<span style="color:#dc2626; font-weight:800; font-size:12px;">⚡ 곧 도착</span>`
          : `<span class="live-countdown next2-countdown" data-target-time="${t2.targetTime}">${this.formatSec(t2.sec)}</span>`;
        t2Html = `
          <div class="next2-transit-box">
            <span class="next2-tag-blue">
              <span>🔵 다다음 (<b class="transit-clock-time subway-clock-time-next2" style="font-size:16.5px; font-weight:900;">${t2.clockStr}</b>)${t2VehicleTag}</span>
            </span>
            ${t2TimeHtml}
          </div>
        `;
      }

      const trainBadge = t1.trainNo
        ? `<span class="badge-bus-plate badge-train-plate" style="display:inline-flex; align-items:center; background:#dbeafe; color:#1e3a8a; font-size:11px; padding:2px 7px; border-radius:5px; font-weight:800; margin-left:6px; border:1.5px solid #93c5fd;">${this.formatPlateWithBigDigits(t1.trainNo, '🚇')}</span>`
        : `<span class="badge-low-bus" style="background:#fef3c7; color:#b45309; border-color:#fde68a;">${isTimetableMode ? '🗓️ 정시시간표' : '역고정(공식)'}</span>`;

      // 위치 문구 간결화 (뒤의 도착 시각이 잘 보이도록 불필요한 '9호선 공식 시간표 기준' 완전 제거)
      let subLoc = '';
      if (isTimetableMode) {
        subLoc = isCommute ? '선유도역 탑승' : '국회의사당역 탑승';
      } else {
        if (t1.curLocation) {
          subLoc = `${t1.curLocation} ${t1.statusMsg || ''}`.trim();
        } else {
          subLoc = isCommute ? '선유도역 탑승' : '국회의사당역 탑승';
        }
      }
      subLoc = subLoc.replace(/9호선\s*공식\s*시간표\s*기준/g, '')
                     .replace(/공식\s*시간표\s*정시\s*운행/g, '')
                     .replace(/공식\s*시간표/g, '')
                     .replace(/시간표\s*기준/g, '')
                     .replace(/역고정\s*\(공식\)/g, '')
                     .trim();
      if (!subLoc) {
        subLoc = isCommute ? '선유도역 탑승' : '국회의사당역 탑승';
      }

      const t1TimeHtml = (t1.isArrivingSoon || t1.sec <= 30)
        ? `<span style="color:#dc2626; font-weight:900; font-size:13.5px;">⚡ 곧 도착</span>`
        : `<span class="next-time-big live-countdown" data-target-time="${t1.targetTime}">${this.formatSec(t1.sec)}</span>`;

      const arrivalLabel = isTimetableMode ? '시간표 도착:' : '도착 예정:';

      // 어디행 제거 및 시각 폰트 18.5px / 고대비 컬러로 크게 노출
      subwayTrainsHtml = `
        <div class="next-transit-box">
          <div class="next-transit-header">
            <span class="next-tag-red">
              <span>🔴</span>
              <span>다음 열차</span>
              ${trainBadge}
            </span>
            ${t1TimeHtml}
          </div>
          <div class="next-transit-sub">
            <span class="transit-sub-pos">위치: <b>${subLoc}</b></span>
            <span class="transit-sub-time"><span class="transit-arr-label" style="font-size:13px; font-weight:800;">${arrivalLabel}</span> <b class="transit-clock-time subway-clock-time" style="font-size:18.5px; font-weight:900; margin-left:4px;">${t1.clockStr}</b></span>
          </div>
        </div>
        ${t2Html}
      `;
    } else {
      subwayTrainsHtml = `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; font-size:12.5px; color:#64748b;">
          9호선 실시간 열차 및 공식 시간표 운행 준비 중
        </div>
      `;
    }

    const infoTipText = isTimetableMode
      ? '💡 <b>[시간표 모드]</b> 9호선 공식 역사 시간표 기준으로 도착시각 및 남은 시간을 계산합니다. 실시간 열차번호를 보시려면 상단 [⚡ 서울시 실시간]을 누르세요.'
      : '💡 <b>[실시간 모드]</b> 서울시 공식 지하철 공공API로 열차번호 및 실시간 위치를 연동합니다. 시간표 시각으로 계산하시려면 상단 [🗓️ 시간표]를 누르세요.';

    subwayHtml = `
      <div class="bit-board-card subway-9-card">
        <div class="bit-header-row">
          <div class="bit-title-group">
            <span class="badge-seoul-subway">9호선</span>
            <strong class="bit-station-name">${subwayStationName}</strong>
          </div>
          <div class="subway-source-toggle-group">
            <button type="button" 
                    id="btnSubwayRealtimeWidget"
                    class="subway-mode-btn ${!isTimetableMode ? 'active-realtime' : ''}" 
                    onclick="window.transitManager && window.transitManager.setSubwaySourceMode('realtime')" 
                    title="서울시 지하철 실시간 도착정보 및 열차번호 연동">
              <span class="bit-status-dot" style="${!isTimetableMode && isLiveTrain ? 'background:#ffffff;' : 'background:#94a3b8;'}"></span>
              <span>${!isTimetableMode && isLiveTrain ? '서울시 실시간' : '실시간'}</span>
            </button>
            <button type="button" 
                    id="btnSubwayTimetableWidget"
                    class="subway-mode-btn ${isTimetableMode ? 'active-timetable' : ''}" 
                    onclick="window.transitManager && window.transitManager.setSubwaySourceMode('timetable')" 
                    title="9호선 공식 역사 시간표 기준 도착시간으로 계산">
              <span>🗓️ 시간표</span>
            </button>
            <button type="button" 
                    class="btn-timetable-popup" 
                    onclick="window.transitManager && window.transitManager.openTimetableModal('subway')" 
                    title="9호선 전체 운행 시간표 조회">
              <span>📋 전체</span>
            </button>
          </div>
        </div>

        <div class="bit-desc-row">
          <span>방면: <b>${subwayDir}</b></span>
          <span class="bit-dest-pill">${isCommute ? '선유도역 탑승' : '국회의사당역 탑승'}</span>
        </div>

        <div style="margin-top:6px;">
          ${subwayTrainsHtml}
        </div>

        <div class="bit-footer-info" style="margin-top:8px;">
          <span>${infoTipText}</span>
        </div>
      </div>
    `;

    // 출근 모드: 1단계 버스(목동6단지앞) ➔ 2단계 지하철(선유도역)
    // 퇴근 모드: 1단계 지하철(국회의사당역) ➔ 2단계 버스(선유도역1번출구)
    if (isCommute) {
      this.cardsContainer.innerHTML = busHtml + subwayHtml;
    } else {
      this.cardsContainer.innerHTML = subwayHtml + busHtml;
    }

    // 도착예정시각 및 총소요시간 그래픽 전광판 카드 렌더링 (출근/퇴근 탭 바로 아래)
    this.renderCommuteEstimation(busDataMap, t1);
  }

  // ==========================================
  // 3. 시간표 모달 시스템 (9호선 / 버스 공식 시간표 팝업)
  // ==========================================
  openTimetableModal(tabType = 'subway') {
    const isCommute = (this.currentMode === 'commute');
    if (tabType === 'subway') {
      this.activeTimetableTab = isCommute ? 'seonyudo' : 'national';
    } else {
      this.activeTimetableTab = 'bus603';
    }
    this.ensureTimetableModal();
    this.renderTimetableModal();
    const modal = document.getElementById('transitTimetableModal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  closeTimetableModal() {
    const modal = document.getElementById('transitTimetableModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  }

  switchTimetableTab(tabKey) {
    this.activeTimetableTab = tabKey;
    this.renderTimetableModal();
  }

  ensureTimetableModal() {
    if (document.getElementById('transitTimetableModal')) return;

    const modalHtml = `
      <div class="modal-overlay" id="transitTimetableModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.65); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); z-index:99999; justify-content:center; align-items:center; padding:16px;">
        <div class="modal-container" style="background:#ffffff; width:100%; max-width:440px; max-height:88vh; border-radius:18px; box-shadow:0 20px 40px rgba(0,0,0,0.25); display:flex; flex-direction:column; overflow:hidden; border:1px solid #e2e8f0;">
          <div class="modal-header" style="background:linear-gradient(135deg, #0f172a, #1e293b); color:#ffffff; padding:14px 16px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:16px;">🗓️</span>
              <strong style="font-size:15px; font-weight:800;">대중교통 공식 운행 시간표</strong>
            </div>
            <button type="button" class="modal-close-btn" onclick="window.transitManager && window.transitManager.closeTimetableModal()" style="background:rgba(255,255,255,0.15); border:none; color:#ffffff; font-size:16px; width:28px; height:28px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
          </div>

          <div style="display:flex; background:#f1f5f9; border-bottom:1px solid #cbd5e1; padding:4px 6px; gap:4px; overflow-x:auto;" id="ttTabContainer">
            <!-- 탭 버튼들 -->
          </div>

          <div class="modal-body" id="ttBodyContainer" style="padding:14px; overflow-y:auto; flex:1; font-size:12.5px; color:#334155;">
            <!-- 시간표 내용 -->
          </div>

          <div class="modal-footer" style="padding:10px 14px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#64748b;">💡 현재 시각 시간대는 노란색으로 강조됩니다.</span>
            <button type="button" class="btn-primary" onclick="window.transitManager && window.transitManager.closeTimetableModal()" style="background:#0284c7; color:#ffffff; border:none; padding:7px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:12px;">닫기</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 모달 바깥 터치 시 닫기
    const modalEl = document.getElementById('transitTimetableModal');
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) this.closeTimetableModal();
      });
    }
  }

  renderTimetableModal() {
    const tabContainer = document.getElementById('ttTabContainer');
    const bodyContainer = document.getElementById('ttBodyContainer');
    if (!tabContainer || !bodyContainer) return;

    const currentTab = this.activeTimetableTab;
    const now = new Date();
    const curH = now.getHours();
    const isHoliday = this.isWeekendOrHoliday(now);

    const tabs = [
      { key: 'seonyudo', label: '🚇 9호선 선유도' },
      { key: 'national', label: '🚇 9호선 국회의사당' },
      { key: 'bus603', label: '🚌 603번 버스' },
      { key: 'bus6620', label: '🚌 6620번 버스' }
    ];

    tabContainer.innerHTML = tabs.map(t => {
      const active = (t.key === currentTab);
      return `
        <button type="button" onclick="window.transitManager && window.transitManager.switchTimetableTab('${t.key}')"
          style="flex:1; white-space:nowrap; padding:6px 8px; border-radius:6px; font-size:11px; font-weight:${active ? '800' : '600'}; border:none; background:${active ? '#0284c7' : 'transparent'}; color:${active ? '#ffffff' : '#475569'}; cursor:pointer; transition:all 0.15s;">
          ${t.label}
        </button>
      `;
    }).join('');

    // 내용 렌더링
    let contentHtml = '';
    const schedules = this.getStationSchedules();

    if (currentTab === 'seonyudo' || currentTab === 'national') {
      const isSeonyu = (currentTab === 'seonyudo');
      const title = isSeonyu ? '9호선 선유도역 (상행 당산·중앙보훈병원 방면 일반열차)' : '9호선 국회의사당역 (하행 당산·개화 방면 일반열차)';
      const sched = isSeonyu
        ? (isHoliday ? schedules.SEONYUDO_WEEKEND : schedules.SEONYUDO_WEEKDAY)
        : (isHoliday ? schedules.NATIONAL_ASSEMBLY_WEEKEND : schedules.NATIONAL_ASSEMBLY_WEEKDAY);

      const hours = Object.keys(sched).map(Number).sort((a, b) => a - b);

      contentHtml = `
        <div style="margin-bottom:10px; padding:8px 10px; background:#eff6ff; border-radius:8px; border:1px solid #bfdbfe; font-size:11.5px; color:#1e40af;">
          <strong>${title}</strong><br>
          <span style="font-size:11px; color:#3b82f6;">운행 구분: ${isHoliday ? '🌴 주말·공휴일 시간표' : '🗓️ 평일 시간표'} (1분 앞당김 정밀 보정판)</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${hours.map(h => {
            const mins = sched[h];
            const isCurHour = (h === curH || (h === 24 && curH === 0));
            return `
              <div style="display:flex; align-items:center; padding:5px 8px; border-radius:6px; background:${isCurHour ? '#fef3c7' : '#f8fafc'}; border:1px solid ${isCurHour ? '#fde68a' : '#e2e8f0'};">
                <span style="width:50px; font-weight:800; color:${isCurHour ? '#b45309' : '#0f172a'}; font-size:12px;">${h === 24 ? '00' : String(h).padStart(2,'0')}시</span>
                <div style="display:flex; flex-wrap:wrap; gap:4px; flex:1;">
                  ${mins.map(m => `
                    <span style="padding:1px 5px; border-radius:4px; background:${isCurHour ? '#ffffff' : '#ffffff'}; border:1px solid ${isCurHour ? '#f59e0b' : '#cbd5e1'}; font-weight:700; font-size:11px; color:#1e293b;">
                      ${String(m).padStart(2,'0')}분
                    </span>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      // 버스 시간표 (603, 6620)
      const routeNum = (currentTab === 'bus603') ? '603' : '6620';
      const routeTitle = (currentTab === 'bus603') ? '간선 603번 (이대목동병원 15154)' : '지선 6620번 (이대목동병원 15154)';
      const ttData = (typeof BUS_TIMETABLE_15154 !== 'undefined') ? BUS_TIMETABLE_15154[routeNum] : null;

      if (ttData) {
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayKey = dayNames[now.getDay()];
        const dayKo = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];

        const morningSched = ttData.morning?.schedules?.[dayKey] || [];
        const afternoonSched = ttData.afternoon?.schedules?.[dayKey] || [];

        contentHtml = `
          <div style="margin-bottom:10px; padding:8px 10px; background:#f0fdf4; border-radius:8px; border:1px solid #bbf7d0; font-size:11.5px; color:#166534;">
            <strong>${routeTitle}</strong><br>
            <span style="font-size:11px; color:#15803d;">기준: 오늘(${dayKo}요일) 정시 기준 운행표</span>
          </div>

          <div style="margin-bottom:10px;">
            <div style="font-weight:800; font-size:12px; margin-bottom:4px; color:#0f172a;">🌅 아침 출근 시간대</div>
            <div style="display:flex; flex-wrap:wrap; gap:4px;">
              ${morningSched.length > 0 ? morningSched.map(item => `
                <span style="padding:3px 7px; border-radius:5px; background:#f8fafc; border:1px solid #cbd5e1; font-weight:700; font-size:11.5px;">${item.time}</span>
              `).join('') : '<span style="color:#94a3b8;">시간표 정보 없음</span>'}
            </div>
          </div>

          <div>
            <div style="font-weight:800; font-size:12px; margin-bottom:4px; color:#0f172a;">🌆 오후/저녁 시간대</div>
            <div style="display:flex; flex-wrap:wrap; gap:4px;">
              ${afternoonSched.length > 0 ? afternoonSched.map(item => `
                <span style="padding:3px 7px; border-radius:5px; background:#f8fafc; border:1px solid #cbd5e1; font-weight:700; font-size:11.5px;">${item.time}</span>
              `).join('') : '<span style="color:#94a3b8;">시간표 정보 없음</span>'}
            </div>
          </div>
        `;
      } else {
        contentHtml = `<div style="padding:16px; text-align:center; color:#94a3b8;">시간표 데이터 준비 중</div>`;
      }
    }

    bodyContainer.innerHTML = contentHtml;
  }

  /**
   * 3대 버스(양천01, 603, 6620) 중 특정 도보 도착시각 이후 가장 빨리 탈 수 있는 최적 버스 선정
   */
  findFastestBusForCommute(routes, busDataMap, reachTimeMs, now, nowMs) {
    const routeBestList = [];

    routes.forEach(r => {
      const item = busDataMap ? busDataMap[r.routeNum] : null;
      const { next, next2, next3 } = this.parseSeoulBusArrival(r, item, now, nowMs);
      const headway = this.getRouteHeadwaySec ? this.getRouteHeadwaySec(r.routeNum, now) : 360;

      // 노선의 실시간/시간표 버스 목록 수집
      const busList = [];
      if (next && next.targetTime && !next.isWait && !next.isEnd) {
        busList.push({ targetTime: next.targetTime, label: '다음', plainNo: next.plainNo || '' });
      }
      if (next2 && next2.targetTime && !next2.isWait && !next2.isEnd) {
        busList.push({ targetTime: next2.targetTime, label: '다다음', plainNo: next2.plainNo || '' });
      }
      if (next3 && next3.targetTime) {
        busList.push({ targetTime: next3.targetTime, label: '다다다음', plainNo: '' });
      }

      // 1. reachTimeMs 이후에 오는 버스가 이미 목록에 있다면 그 중 가장 이른 버스 찾기
      let candidate = busList.find(b => b.targetTime >= reachTimeMs);

      // 2. 만약 목록의 버스들이 모두 reachTimeMs 전에 지나가 버렸다면,
      // 마지막 버스 시간 기준으로 headway(배차간격)를 더해 reachTimeMs 이후 첫 버스 시각 투영
      if (!candidate) {
        let baseTimeMs = (busList.length > 0)
          ? busList[busList.length - 1].targetTime
          : nowMs;
        
        let count = 0;
        while (baseTimeMs < reachTimeMs && count < 20) {
          baseTimeMs += headway * 1000;
          count++;
        }

        candidate = {
          targetTime: baseTimeMs,
          label: count > 1 ? `차기 ${count}회차` : '차기 배차',
          plainNo: ''
        };
      }

      routeBestList.push({
        routeNum: r.routeNum,
        badgeClass: r.badgeClass,
        label: candidate.label,
        targetTime: candidate.targetTime,
        plainNo: candidate.plainNo || '',
        waitMin: Math.max(0, Math.round((candidate.targetTime - reachTimeMs) / 60000))
      });
    });

    // 3개 노선(양천01, 603, 6620) 중 정류장 도착 후 가장 빨리 오는(targetTime 최소) 버스 선택!
    routeBestList.sort((a, b) => a.targetTime - b.targetTime);

    return routeBestList[0];
  }

  /**
   * 실시간 도보/버스/지하철 연계 출퇴근 예상 소요시간 및 도착예정시각 계산 엔진
   */
  calculateCommuteEstimation(busDataMap, liveSubwayTrain = null) {
    const isCommute = (this.currentMode === 'commute');
    const now = new Date();
    const nowMs = now.getTime();

    const WALK_HOME_BUS = 8;             // 집 ↔ 6단지 버스정류장 (도보 8분)
    const WALK_BUS_SUBWAY_COMMUTE = 3;   // 선유도역 버스정류장 ➔ 선유도역 승차장 (도보 3분)
    const WALK_SEONYU_SUB_TO_BUS = 2.5;  // 선유도역 하차 ➔ 선유도역1번출구 버스정류장 (도보 2.5~3분 이내)
    const WALK_SUBWAY_OFFICE = 9;        // 국회의사당역 ↔ 회사 (도보 9분)
    const RIDE_BUS = 5;                  // 버스 이동 (5분)
    const RIDE_SUBWAY_COMMUTE = 3.5;     // 출근 9호선 승차 (선유도역 ➔ 국회의사당역: 약 3.5분)
    const RIDE_SUBWAY_OFFWORK = 2.5;     // 퇴근 9호선 승차 (국회의사당역 ➔ 선유도역: 약 2~2.5분 소요)

    if (isCommute) {
      // -------------------------------------------------------------
      // [출근] 집 ➔ 6단지 버스정류장 ➔ 선유도역 ➔ 국회의사당역 ➔ 회사
      // -------------------------------------------------------------
      const t0 = new Date(nowMs);
      const t_reach_bus = new Date(nowMs + WALK_HOME_BUS * 60 * 1000);
      const config = this.busConfigs.commute;

      // 3대 버스 중 6단지 도착 후 가장 빠른 버스 선택
      const chosenBus = this.findFastestBusForCommute(config.routes, busDataMap, t_reach_bus.getTime(), now, nowMs);
      const t_bus_board = new Date(chosenBus.targetTime);
      const busWaitMin = Math.max(0, Math.round((t_bus_board.getTime() - t_reach_bus.getTime()) / 60000));

      const t_reach_seonyu_bus = new Date(t_bus_board.getTime() + RIDE_BUS * 60 * 1000);
      const t_reach_seonyu_sub = new Date(t_reach_seonyu_bus.getTime() + WALK_BUS_SUBWAY_COMMUTE * 60 * 1000);

      let chosenTrain = null;
      let subBoardTimeMs = null;

      // 실시간 열차가 있고 탑승 가능 시간대라면 최우선 적용
      if (liveSubwayTrain && liveSubwayTrain.targetTime && liveSubwayTrain.targetTime >= t_reach_seonyu_sub.getTime()) {
        chosenTrain = { departureTime: liveSubwayTrain.clockStr, trainNo: liveSubwayTrain.trainNo, targetTime: liveSubwayTrain.targetTime };
        subBoardTimeMs = liveSubwayTrain.targetTime;
      } else {
        const subwayTrains = this.getPrioritizedTrains(t_reach_seonyu_sub, true, 10);
        if (subwayTrains && subwayTrains.length > 0) {
          for (const tr of subwayTrains) {
            if (tr.targetTime >= t_reach_seonyu_sub.getTime()) {
              chosenTrain = tr;
              subBoardTimeMs = tr.targetTime;
              break;
            }
          }
        }
      }

      if (!subBoardTimeMs) {
        subBoardTimeMs = t_reach_seonyu_sub.getTime() + 4 * 60 * 1000;
      }

      const t_sub_board = new Date(subBoardTimeMs);
      const subWaitMin = Math.max(0, Math.round((t_sub_board.getTime() - t_reach_seonyu_sub.getTime()) / 60000));

      const t_reach_national_sub = new Date(t_sub_board.getTime() + RIDE_SUBWAY_COMMUTE * 60 * 1000);
      const t_final = new Date(t_reach_national_sub.getTime() + WALK_SUBWAY_OFFICE * 60 * 1000);

      const totalMinutes = Math.max(1, Math.round((t_final.getTime() - nowMs) / 60000));

      return {
        mode: 'commute',
        startTime: t0,
        t_reach_bus,
        chosenBus,
        t_bus_board,
        busWaitMin,
        t_reach_seonyu_bus,
        t_reach_seonyu_sub,
        chosenTrain,
        t_sub_board,
        subWaitMin,
        t_reach_national_sub,
        t_final,
        totalMinutes
      };
    } else {
      // -------------------------------------------------------------
      // [퇴근] 회사 ➔ 국회의사당역 ➔ 선유도역 (지하철 2분여) ➔ 버스정류장 (도보 3분 이내) ➔ 3대 버스 중 최속 버스 연계 ➔ 집
      // -------------------------------------------------------------
      const t0 = new Date(nowMs);
      const t_reach_national_sub = new Date(nowMs + WALK_SUBWAY_OFFICE * 60 * 1000);

      let chosenTrain = null;
      let subBoardTimeMs = null;

      if (liveSubwayTrain && liveSubwayTrain.targetTime && liveSubwayTrain.targetTime >= t_reach_national_sub.getTime()) {
        chosenTrain = { departureTime: liveSubwayTrain.clockStr, trainNo: liveSubwayTrain.trainNo, targetTime: liveSubwayTrain.targetTime };
        subBoardTimeMs = liveSubwayTrain.targetTime;
      } else {
        const subwayTrains = this.getPrioritizedTrains(t_reach_national_sub, false, 10);
        if (subwayTrains && subwayTrains.length > 0) {
          for (const tr of subwayTrains) {
            if (tr.targetTime >= t_reach_national_sub.getTime()) {
              chosenTrain = tr;
              subBoardTimeMs = tr.targetTime;
              break;
            }
          }
        }
      }

      if (!subBoardTimeMs) {
        subBoardTimeMs = t_reach_national_sub.getTime() + 4 * 60 * 1000;
      }

      const t_sub_board = new Date(subBoardTimeMs);
      const subWaitMin = Math.max(0, Math.round((t_sub_board.getTime() - t_reach_national_sub.getTime()) / 60000));

      // 국회의사당역 탑승 ➔ 선유도역 하차 (약 2.5분)
      const t_reach_seonyu_sub = new Date(t_sub_board.getTime() + RIDE_SUBWAY_OFFWORK * 60 * 1000);
      // 선유도역 하차 ➔ 선유도역1번출구 버스정류장 도착 (도보 약 2.5분 이내) => 지하철 탑승 후 총 5분 시점
      const t_reach_seonyu_bus = new Date(t_reach_seonyu_sub.getTime() + WALK_SEONYU_SUB_TO_BUS * 60 * 1000);

      const config = this.busConfigs.offwork;

      // 선유도역 버스정류장 도착 시점(t_reach_seonyu_bus) 이후에 오는 양천01, 603, 6620 중 가장 빨리 오는 버스 배정
      const chosenBus = this.findFastestBusForCommute(config.routes, busDataMap, t_reach_seonyu_bus.getTime(), now, nowMs);
      const t_bus_board = new Date(chosenBus.targetTime);
      const busWaitMin = Math.max(0, Math.round((t_bus_board.getTime() - t_reach_seonyu_bus.getTime()) / 60000));

      const t_reach_bus = new Date(t_bus_board.getTime() + RIDE_BUS * 60 * 1000);
      const t_final = new Date(t_reach_bus.getTime() + WALK_HOME_BUS * 60 * 1000);

      const totalMinutes = Math.max(1, Math.round((t_final.getTime() - nowMs) / 60000));

      return {
        mode: 'offwork',
        startTime: t0,
        t_reach_national_sub,
        chosenTrain,
        t_sub_board,
        subWaitMin,
        t_reach_seonyu_sub,
        t_reach_seonyu_bus,
        chosenBus,
        t_bus_board,
        busWaitMin,
        t_reach_bus,
        t_final,
        totalMinutes
      };
    }
  }

  renderCommuteEstimation(busDataMap) {
    if (!this.commuteSummaryContainer) {
      this.commuteSummaryContainer = document.getElementById('commuteEstimationSummaryBox') || document.getElementById('estimationSummaryBox');
    }
    if (!this.commuteSummaryContainer) return;

    const est = this.calculateCommuteEstimation(busDataMap);
    if (!est) return;

    const isCommute = (est.mode === 'commute');
    const destName = isCommute ? '회사' : '집';

    const fmtTime = (d) => {
      if (!d) return '--:--';
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };

    const fmtClockFull = (d) => {
      if (!d) return '--:--';
      const h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? '오후' : '오전';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const mStr = String(m).padStart(2, '0');
      return `${ampm} ${h12}시 ${mStr}분`;
    };

    const stepsHtml = isCommute ? `
      <!-- Step 1: 집 출발 -->
      <div class="est-timeline-step">
        <div class="est-step-node start">🏠</div>
        <div class="est-step-content">
          <span class="est-step-name">집 출발</span>
          <span class="est-step-clock">${fmtTime(est.startTime)}</span>
        </div>
      </div>
      <div class="est-timeline-line"><span class="est-timeline-line-label">🚶 도보 8분 이동</span></div>

      <!-- Step 2: 6단지 버스정류장 -->
      <div class="est-timeline-step">
        <div class="est-step-node">🚌</div>
        <div class="est-step-content">
          <div>
            <div class="est-step-name">6단지 버스정류장</div>
            <div class="est-step-detail">🚌 ${est.chosenBus?.routeNum || '버스'} (대기 ${est.busWaitMin}분 + 승차 5분)</div>
          </div>
          <span class="est-step-clock">${fmtTime(est.t_reach_bus)}</span>
        </div>
      </div>
      <div class="est-timeline-line"><span class="est-timeline-line-label">🚍 버스 승차 (선유도역 방면)</span></div>

      <!-- Step 3: 선유도역 환승 -->
      <div class="est-timeline-step">
        <div class="est-step-node">🔄</div>
        <div class="est-step-content">
          <div>
            <div class="est-step-name">선유도역 버스정류장 ➔ 승차장</div>
            <div class="est-step-detail">🚶 환승 도보 3분</div>
          </div>
          <span class="est-step-clock">${fmtTime(est.t_reach_seonyu_bus)}</span>
        </div>
      </div>
      <div class="est-timeline-line"><span class="est-timeline-line-label">🚶 도보 3분 환승</span></div>

      <!-- Step 4: 선유도역 9호선 탑승 -->
      <div class="est-timeline-step">
        <div class="est-step-node">🚇</div>
        <div class="est-step-content">
          <div>
            <div class="est-step-name">선유도역 9호선 승차장</div>
            <div class="est-step-detail">🚇 ${est.chosenTrain?.departureTime || fmtTime(est.t_sub_board)} 열차 (대기 ${est.subWaitMin}분 + 승차 4분)</div>
          </div>
          <span class="est-step-clock">${fmtTime(est.t_reach_seonyu_sub)}</span>
        </div>
      </div>
      <div class="est-timeline-line"><span class="est-timeline-line-label">🚆 9호선 승차 (국회의사당역 방면)</span></div>

      <!-- Step 5: 국회의사당역 하차 -->
      <div class="est-timeline-step">
        <div class="est-step-node">🏢</div>
        <div class="est-step-content">
          <div>
            <div class="est-step-name">국회의사당역 ➔ 회사</div>
            <div class="est-step-detail">🚶 회사까지 도보 9분</div>
          </div>
          <span class="est-step-clock">${fmtTime(est.t_reach_national_sub)}</span>
        </div>
      </div>
      <div class="est-timeline-line"><span class="est-timeline-line-label">🚶 도보 9분 이동</span></div>

      <!-- Step 6: 회사 도착 -->
      <div class="est-timeline-step">
        <div class="est-step-node end">🎯</div>
        <div class="est-step-content est-final-step">
          <span class="est-step-name est-final-name">🏢 회사 도착 예정</span>
          <span class="est-step-clock highlight-arr-clock">${fmtClockFull(est.t_final)}</span>
        </div>
      </div>
    ` : `
      <!-- Step 1: 회사 출발 -->
      <div class="est-timeline-step">
        <div class="est-step-node start">🏢</div>
        <div class="est-step-content">
          <span class="est-step-name">회사 출발</span>
          <span class="est-step-clock">${fmtTime(est.startTime)}</span>
        </div>
      </div>
      <div class="est-timeline-line"><span class="est-timeline-line-label">🚶 도보 9분 이동</span></div>

      <!-- Step 2: 국회의사당역 탑승 -->
      <div class="est-timeline-step">
        <div class="est-step-node">🚇</div>
        <div class="est-step-content">
          <div>
            <div class="est-step-name">국회의사당역 9호선 승차장</div>
            <div class="est-step-detail">🚇 ${est.chosenTrain?.departureTime || fmtTime(est.t_sub_board)} 열차 (대기 약 ${est.subWaitMin}분 / 2분여 이동)</div>
          </div>
          <span class="est-step-clock">${fmtTime(est.t_sub_board)} 탑승</span>
        </div>
      </div>
      <div class="est-timeline-line"><span class="est-timeline-line-label">🚆 9호선 승차 ➔ 선유도역 하차 (2분여 소요)</span></div>

      <!-- Step 3: 선유도역 환승 -->
      <div class="est-timeline-step">
        <div class="est-step-node">🔄</div>
        <div class="est-step-content">
          <div>
            <div class="est-step-name">선유도역 승차장 ➔ 1번출구 버스정류장</div>
            <div class="est-step-detail">🚶 환승 도보 약 2.5분 (3분 이내)</div>
          </div>
          <span class="est-step-clock">${fmtTime(est.t_reach_seonyu_sub)} 하차</span>
        </div>
      </div>
      <div class="est-timeline-line"><span class="est-timeline-line-label">🚶 도보 2.5분 환승 (정류장 도착: ${fmtTime(est.t_reach_seonyu_bus)})</span></div>

      <!-- Step 4: 선유도역 버스정류장 탑승 -->
      <div class="est-timeline-step">
        <div class="est-step-node">🚌</div>
        <div class="est-step-content">
          <div>
            <div class="est-step-name">선유도역 버스정류장 (19210)</div>
            <div class="est-step-detail">🚌 ${est.chosenBus?.routeNum || '버스'} (대기 ${est.busWaitMin}분 + 승차 5분)</div>
          </div>
          <span class="est-step-clock">${fmtTime(est.t_reach_seonyu_bus)}</span>
        </div>
      </div>
      <div class="est-timeline-line"><span class="est-timeline-line-label">🚍 버스 승차 (6단지 방면)</span></div>

      <!-- Step 5: 6단지 버스정류장 하차 -->
      <div class="est-timeline-step">
        <div class="est-step-node">🏠</div>
        <div class="est-step-content">
          <div>
            <div class="est-step-name">6단지 버스정류장 ➔ 집</div>
            <div class="est-step-detail">🚶 집까지 도보 8분</div>
          </div>
          <span class="est-step-clock">${fmtTime(est.t_reach_bus)}</span>
        </div>
      </div>
      <div class="est-timeline-line"><span class="est-timeline-line-label">🚶 도보 8분 이동</span></div>

      <!-- Step 6: 집 도착 -->
      <div class="est-timeline-step">
        <div class="est-step-node end">🎯</div>
        <div class="est-step-content est-final-step">
          <span class="est-step-name est-final-name">🏠 집 도착 예정</span>
          <span class="est-step-clock highlight-arr-clock">${fmtClockFull(est.t_final)}</span>
        </div>
      </div>
    `;

    if (!this.commuteDetailContainer) {
      this.commuteDetailContainer = document.getElementById('commuteEstimationDetailBox');
    }

    this.commuteSummaryContainer.innerHTML = `
      <div class="est-summary-card est-header-only-card">
        <div class="est-main-header">
          <div class="est-dest-title">
            <span class="est-dest-icon">${isCommute ? '🏢' : '🏠'}</span>
            <div class="est-dest-text">
              <div class="est-dep-time">지금(${fmtTime(est.startTime)}) 출발 기준</div>
              <div class="est-dest-label"><span class="est-total-min">${est.totalMinutes}분</span> 소요 예상</div>
            </div>
          </div>
          <div class="est-arr-box">
            <span class="est-arr-sub">도착 예정 시각</span>
            <span class="est-arr-time">${fmtClockFull(est.t_final)}</span>
          </div>
        </div>
      </div>
    `;

    const detailHtml = `
      <div class="est-summary-card est-detail-timeline-card">
        <div class="est-detail-title-bar">
          <span>🧭 <b>${isCommute ? '출근' : '퇴근'} 이동 경로 및 순차 시각표</b></span>
          <span class="est-detail-badge">도보·환승 연계</span>
        </div>
        <div class="est-timeline-flow">
          ${stepsHtml}
        </div>
        <div class="est-breakdown-bar">
          <span>💡 소요시간 구성: 🚶 도보 20분 + 🚏 대기 ${est.busWaitMin + est.subWaitMin}분 + 🚍 승차 9분 = <b>총 ${est.totalMinutes}분 소요</b></span>
        </div>
      </div>
    `;

    if (this.commuteDetailContainer) {
      this.commuteDetailContainer.innerHTML = detailHtml;
    } else {
      this.commuteSummaryContainer.querySelector('.est-summary-card').insertAdjacentHTML('beforeend', detailHtml);
    }
  }

  triggerManualRefresh(btn = null) {
    this.refreshCountdown = this.REFRESH_INTERVAL;
    if (btn) {
      btn.classList.add('spinning');
      const originalText = btn.innerHTML;
      btn.innerHTML = '🔄 수신중';
      this.loadAllData(true).finally(() => {
        btn.innerHTML = '✅ 완료';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('spinning');
        }, 700);
      });
    } else {
      this.loadAllData(true);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.transitManager = new TransitManager();
});
