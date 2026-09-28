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
            typeText: '마을버스 (배차 6~7분)',
            headway: 390
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
            typeText: '마을버스 (배차 6~7분)',
            headway: 390
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
    // 시간대별 자동 출/퇴근 모드 초기화
    // - 05:00 ~ 13:00 : 출근 모드 (이대목동병원 ➔ 선유도역 방면)
    // - 13:00 ~ 04:59 : 퇴근 모드 (선유도역1번출구 ➔ 목동단지 방면)
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 13) {
      this.currentMode = 'commute';
    } else {
      this.currentMode = 'offwork';
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

  updateRefreshStatus() {
    if (!this.lastUpdated) return;
    const timeStr = this.lastLoadedTimeStr || new Date().toLocaleTimeString('ko-KR');
    const busStatusText = this.isLiveBus ? '서울시 실시간 버스' : '서울시 정규배차';
    this.lastUpdated.innerHTML = `전광판 갱신: ${timeStr} <span style="color:#059669; font-weight:700;">(${busStatusText} · 9호선 역사시간표 우선)</span> <span style="margin-left:6px; color:#2563eb; font-weight:700;">🔄 ${this.REFRESH_INTERVAL}초 자동 갱신 (${this.refreshCountdown}초 전)</span>`;
  }

  formatSec(sec) {
    if (sec <= 0) return `<span class="transit-time-arrive">⚡ 곧 도착</span>`;
    if (sec < 60) return `<span class="transit-time-imminent">${sec}초 후</span>`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const sStr = s < 10 ? '0' + s : s;
    return `<span class="transit-time-min">${m}분</span> <span class="transit-time-sec">${sStr}초 후</span>`;
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

  async loadAllData(showLoading = true) {
    if (!this.cardsContainer) return;
    if (this.isFetching) return;
    this.isFetching = true;

    if (showLoading) {
      this.cardsContainer.innerHTML = `
        <div class="transit-loading-box">
          <div style="font-size:26px; margin-bottom:8px; display:inline-block; animation:spin 1s infinite linear;">🔄</div>
          <div style="font-size:14.5px; font-weight:800; color:#0284c7;">실시간 대중교통 최신 정보 수신 중...</div>
          <p style="font-size:11.5px; color:#64748b; margin-top:4px;">서울시 버스(TOPIS) 및 9호선 역사 고정 시간표를 실시간 갱신하고 있습니다.</p>
        </div>
      `;
      if (this.lastUpdated) {
        this.lastUpdated.innerHTML = `<span style="color:#0284c7; font-weight:800;">🔄 서울시 실시간 교통정보 수신 중...</span>`;
      }
    }

    const startTime = Date.now();
    const config = this.busConfigs[this.currentMode];

    try {
      // 3개 대상 노선 병렬 호출 (양천01, 603, 6620)
      const busPromises = config.routes.map(r =>
        this.fetchBusArrival(r.busRouteId, r.stId, r.ord)
          .catch(() => null)
      );

      const busResults = await Promise.all(busPromises);

      const busDataMap = {};
      config.routes.forEach((r, idx) => {
        busDataMap[r.routeNum] = busResults[idx];
      });

      // 사용자가 새로고침 애니메이션을 인지할 수 있도록 최소 250ms 보장
      const elapsed = Date.now() - startTime;
      if (showLoading && elapsed < 250) {
        await new Promise(r => setTimeout(r, 250 - elapsed));
      }

      this.renderResult(busDataMap);

      this.lastLoadedTimeStr = new Date().toLocaleTimeString('ko-KR');
      this.isLiveBus = busResults.some(item => item && (parseInt(item.traTime1, 10) > 0 || item.arrmsg1));
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

    // 15154 정류소(이대목동병원) 6620 / 603번 버스 최우선 운행 시간표 데이터 확인
    const prioritySchedule = (typeof getPriorityBusSchedule === 'function')
      ? getPriorityBusSchedule(routeConfig.routeNum, (routeConfig.stId === '114000052' || routeConfig.arsId === '15-154') ? '15154' : '', now)
      : null;

    if (prioritySchedule && prioritySchedule.next) {
      const pNext = prioritySchedule.next;
      const pNext2 = prioritySchedule.next2;

      // 9호선 역사 고정시간표와 100% 동일하게, 시간표 예정 시각 기준으로 실시간 카운팅
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

    return { next, next2 };
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

  // ==========================================
  // 9호선 역사 공식 고정 시간표 배차 엔진
  // ==========================================
  getStationSchedules() {
    return {
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

  renderResult(busDataMap) {
    const isCommute = (this.currentMode === 'commute');
    const now = new Date();
    const nowMs = now.getTime();
    const config = this.busConfigs[this.currentMode];

    let busHtml = '';
    let subwayHtml = '';

    // ==========================================
    // 1. 서울시 공공 버스 도착 전광판 카드
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

      const vehicleBadge1 = next.plainNo ? `<span class="badge-bus-plate" style="display:inline-flex; align-items:center; background:#f1f5f9; color:#334155; font-size:11px; padding:1px 6px; border-radius:4px; font-weight:700; margin-left:6px; border:1px solid #cbd5e1;">🚌 ${next.plainNo}</span>` : '';

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

        const vehicleBadge2 = next2.plainNo ? `<span style="font-size:10.5px; color:#475569; font-weight:600; margin-left:4px;">(${next2.plainNo})</span>` : '';

        next2Html = `
          <div class="next2-transit-box">
            <span class="next2-tag-blue">
              <span>🔵 다다음 (${next2SubText}):${vehicleBadge2}</span>
            </span>
            ${next2TimeHtml}
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
          <span class="bit-status-live"><span class="bit-status-dot"></span> 서울시 버스실시간</span>
        </div>

        <div class="bit-desc-row">
          <span>📍 정류소 실시간 도착 현황</span>
          <span class="bit-dest-pill">${config.destNote}</span>
        </div>

        <div class="bit-route-list">
          ${routeItems}
        </div>

        <div class="bit-footer-info">
          <span>💡 서울시 버스도착정보 공식 API(TOPIS) 연동으로 실시간 카운트다운됩니다.</span>
        </div>
      </div>
    `;

    // ==========================================
    // 2. 9호선 지하철 도착 전광판 카드 (역사 고정시간표 100% 반영)
    // ==========================================
    const subwayStationName = isCommute ? '선유도역 9호선 [상행]' : '국회의사당역 9호선 [하행]';
    const subwayDir = isCommute ? '당산·중앙보훈병원 방면' : '당산·개화 방면 (선유도역 방향)';

    let subwayTrainsHtml = '';
    const isHolidayToday = this.isWeekendOrHoliday(now);
    const dayTypeLabel = isHolidayToday ? '🌴 주말·공휴일 시간표' : '🗓️ 평일 시간표';

    const prioritizedTrains = this.getPrioritizedTrains(now, isCommute, 2);

    if (prioritizedTrains && prioritizedTrains.length > 0) {
      const t1 = prioritizedTrains[0];
      const t2 = prioritizedTrains.length > 1 ? prioritizedTrains[1] : null;

      let t2Html = '';
      if (t2) {
        t2Html = `
          <div class="next2-transit-box">
            <span class="next2-tag-blue">
              <span>🔵 다다음 (<b class="transit-clock-time">${t2.departureTime}</b> · ${t2.endStationName}행):</span>
            </span>
            <span class="live-countdown next2-countdown" data-target-time="${t2.targetTime}">
              ${this.formatSec(t2.sec)}
            </span>
          </div>
        `;
      }

      subwayTrainsHtml = `
        <div class="next-transit-box">
          <div class="next-transit-header">
            <span class="next-tag-red">
              <span>🔴</span>
              <span>다음 열차</span>
              <span class="badge-low-bus" style="background:#fef3c7; color:#b45309; border-color:#fde68a;">역고정(공식)</span>
            </span>
            <span class="next-time-big live-countdown" data-target-time="${t1.targetTime}">
              ${this.formatSec(t1.sec)}
            </span>
          </div>
          <div class="next-transit-sub">
            <span class="transit-sub-time"><span class="transit-arr-label">출발:</span> <b class="transit-clock-time">${t1.departureTime}</b> <span class="transit-dest-sub">(${t1.endStationName}행)</span></span>
            <span class="transit-sub-station">${isCommute ? '선유도역 탑승' : '국회의사당역 탑승'} · 고정시간표</span>
          </div>
        </div>
        ${t2Html}
      `;
    } else {
      subwayTrainsHtml = `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; font-size:12.5px; color:#64748b;">
          9호선 역사 공식 시간표 운행 준비 중
        </div>
      `;
    }

    subwayHtml = `
      <div class="bit-board-card subway-9-card">
        <div class="bit-header-row">
          <div class="bit-title-group">
            <span class="badge-seoul-subway">9호선</span>
            <strong class="bit-station-name">${subwayStationName}</strong>
          </div>
          <div style="display:flex; align-items:center; gap:5px;">
            <span class="bit-status-live" style="background:#ecfdf5; color:#047857; border-color:#a7f3d0;"><span class="bit-status-dot" style="background:#10b981;"></span> 역사시간표 정밀연동</span>
            <span class="subway-day-type-badge">${dayTypeLabel}</span>
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
          <span>💡 9호선 일반열차는 역사 공식 고정 시간표를 100% 반영하여 초 단위로 정확히 카운트다운합니다.</span>
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
