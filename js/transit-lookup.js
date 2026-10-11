// ==========================================================================
// 실시간 정류장 ID(5자리) 및 정류소·지하철역 실시간 도착정보 조회 엔진
// - 서울시 버스 TOPIS (getStationByUid, getStationByName) 직결
// - 서울교통공사/서울시 지하철 실시간 도착정보 (realtimeStationArrival) 직결
// - 숫자 5자리 입력 즉시 해당 정류소 다음·다다음 버스 실시간 카운트다운
// - '선유' 검색 시 '선유도역(9호선)' 및 버스정류소 실시간 추천
// - 낮 모드(애플 라이트) 및 밤 모드(옵시디언 다크) 완벽 일체화 디자인
// ==========================================================================

(function() {
  'use strict';

  // 수도권 주요 지하철역 및 호선 데이터베이스
  const SUBWAY_STATIONS = [
    { name: '선유도', lines: ['9호선'] },
    { name: '당산', lines: ['2호선', '9호선'] },
    { name: '영등포구청', lines: ['2호선', '5호선'] },
    { name: '신목동', lines: ['9호선'] },
    { name: '목동', lines: ['5호선'] },
    { name: '오목교', lines: ['5호선'] },
    { name: '여의도', lines: ['5호선', '9호선'] },
    { name: '국회의사당', lines: ['9호선'] },
    { name: '샛강', lines: ['9호선', '신림선'] },
    { name: '노량진', lines: ['1호선', '9호선'] },
    { name: '신길', lines: ['1호선', '5호선'] },
    { name: '영등포', lines: ['1호선'] },
    { name: '영등포시장', lines: ['5호선'] },
    { name: '문래', lines: ['2호선'] },
    { name: '신도림', lines: ['1호선', '2호선'] },
    { name: '대림', lines: ['2호선', '7호선'] },
    { name: '구로', lines: ['1호선'] },
    { name: '합정', lines: ['2호선', '6호선'] },
    { name: '홍대입구', lines: ['2호선', '공항철도', '경의중앙선'] },
    { name: '신촌', lines: ['2호선'] },
    { name: '이대', lines: ['2호선'] },
    { name: '아현', lines: ['2호선'] },
    { name: '충정로', lines: ['2호선', '5호선'] },
    { name: '시청', lines: ['1호선', '2호선'] },
    { name: '서울역', lines: ['1호선', '4호선', '공항철도', '경의중앙선'] },
    { name: '용산', lines: ['1호선', '경의중앙선'] },
    { name: '마포', lines: ['5호선'] },
    { name: '공덕', lines: ['5호선', '6호선', '공항철도', '경의중앙선'] },
    { name: '여의나루', lines: ['5호선'] },
    { name: '마포구청', lines: ['6호선'] },
    { name: '망원', lines: ['6호선'] },
    { name: '상수', lines: ['6호선'] },
    { name: '광흥창', lines: ['6호선'] },
    { name: '염창', lines: ['9호선'] },
    { name: '등촌', lines: ['9호선'] },
    { name: '증미', lines: ['9호선'] },
    { name: '가양', lines: ['9호선'] },
    { name: '양천향교', lines: ['9호선'] },
    { name: '마곡나루', lines: ['9호선', '공항철도'] },
    { name: '신방화', lines: ['9호선'] },
    { name: '공항시장', lines: ['9호선'] },
    { name: '김포공항', lines: ['5호선', '9호선', '공항철도', '김포골드', '서해선'] },
    { name: '개화', lines: ['9호선'] },
    { name: '노들', lines: ['9호선'] },
    { name: '흑석', lines: ['9호선'] },
    { name: '동작', lines: ['4호선', '9호선'] },
    { name: '구반포', lines: ['9호선'] },
    { name: '신반포', lines: ['9호선'] },
    { name: '고속터미널', lines: ['3호선', '7호선', '9호선'] },
    { name: '사평', lines: ['9호선'] },
    { name: '신논현', lines: ['9호선', '신분당선'] },
    { name: '언주', lines: ['9호선'] },
    { name: '선정릉', lines: ['9호선', '수인분당선'] },
    { name: '삼성중앙', lines: ['9호선'] },
    { name: '봉은사', lines: ['9호선'] },
    { name: '종합운동장', lines: ['2호선', '9호선'] },
    { name: '삼전', lines: ['9호선'] },
    { name: '석촌고분', lines: ['9호선'] },
    { name: '석촌', lines: ['8호선', '9호선'] },
    { name: '송파나루', lines: ['9호선'] },
    { name: '한성백제', lines: ['9호선'] },
    { name: '올림픽공원', lines: ['5호선', '9호선'] },
    { name: '둔촌오륜', lines: ['9호선'] },
    { name: '중앙보훈병원', lines: ['9호선'] },
    { name: '강남', lines: ['2호선', '신분당선'] },
    { name: '역삼', lines: ['2호선'] },
    { name: '선릉', lines: ['2호선', '수인분당선'] },
    { name: '삼성', lines: ['2호선'] },
    { name: '잠실', lines: ['2호선', '8호선'] },
    { name: '서초', lines: ['2호선'] },
    { name: '교대', lines: ['2호선', '3호선'] },
    { name: '방배', lines: ['2호선'] },
    { name: '사당', lines: ['2호선', '4호선'] },
    { name: '낙성대', lines: ['2호선'] },
    { name: '서울대입구', lines: ['2호선'] },
    { name: '봉천', lines: ['2호선'] },
    { name: '신림', lines: ['2호선', '신림선'] },
    { name: '신대방', lines: ['2호선'] },
    { name: '구로디지털단지', lines: ['2호선'] },
    { name: '을지로입구', lines: ['2호선'] },
    { name: '을지로3가', lines: ['2호선', '3호선'] },
    { name: '을지로4가', lines: ['2호선', '5호선'] },
    { name: '동대문역사문화공원', lines: ['2호선', '4호선', '5호선'] },
    { name: '왕십리', lines: ['2호선', '5호선', '수인분당선', '경의중앙선'] },
    { name: '성수', lines: ['2호선'] },
    { name: '건대입구', lines: ['2호선', '7호선'] },
    { name: '종로3가', lines: ['1호선', '3호선', '5호선'] },
    { name: '광화문', lines: ['5호선'] },
    { name: '서대문', lines: ['5호선'] },
    { name: '까치산', lines: ['2호선', '5호선'] },
    { name: '화곡', lines: ['5호선'] },
    { name: '우장산', lines: ['5호선'] },
    { name: '발산', lines: ['5호선'] },
    { name: '마곡', lines: ['5호선'] },
    { name: '송정', lines: ['5호선'] },
    { name: '신정', lines: ['5호선'] },
    { name: '신정네거리', lines: ['2호선'] },
    { name: '양천구청', lines: ['2호선'] },
    { name: '도림천', lines: ['2호선'] }
  ];

  class TransitLookupController {
    constructor() {
      this.busApiKey = '0f40f3c7a3220ef7d0f45825f4364e47d05d10fa087632a03db7c8c2222aae63';
      this.subwayApiKey = '476a79484b6a6f6e3833504f4f6d4e';

      this.currentType = null; // 'bus' | 'subway'
      this.currentId = null;   // arsId or stationName
      this.currentName = '';
      this.lastBusData = null;
      this.lastSubwayData = null;

      this.filterType = 'all'; // 'all' | 'town' | 'blue' | 'green' | 'red'
      this.sortType = 'arrival'; // 'arrival' | 'number'

      this.autoRefreshInterval = 15;
      this.refreshCountdown = 15;
      this.tickerTimer = null;
      this.debounceTimer = null;
      this.isFetching = false;

      this.cache = {
        bus: {},
        subway: {}
      };

      this.initDom();
      this.initEvents();
      this.renderQuickChips();

      // 디폴트로 버스 정류장 6637 전용 정류소 15158(양정고등학교) 자동 로딩!
      this.loadDefaultStation();
    }

    loadDefaultStation() {
      // 1순위 기본값: 15158 (양정고등학교, 6637 단독 정차)
      setTimeout(() => {
        this.lookupBusByArs('15158', '양정고등학교');
      }, 60);
    }

    initDom() {
      this.section = document.getElementById('transitLookupSection');
      this.inputQuery = document.getElementById('inputTransitQuery');
      this.btnClearQuery = document.getElementById('btnClearLookupQuery');
      this.btnSearch = document.getElementById('btnExecLookupSearch');
      this.dropdown = document.getElementById('lookupSuggestionsDropdown');
      this.chipsContainer = document.getElementById('quickChipsContainer');
      this.resultContainer = document.getElementById('lookupResultContainer');
      this.btnRefresh = document.getElementById('btnLookupRefresh');
      this.liveBadge = document.getElementById('transitLookupLiveBadge');
    }

    initEvents() {
      if (!this.inputQuery) return;

      // 실시간 입력 감지
      this.inputQuery.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (this.btnClearQuery) {
          this.btnClearQuery.style.display = val ? 'flex' : 'none';
        }

        // 5자리 숫자 입력 시 즉시 자동 조회
        const cleanDigits = val.replace(/[^0-9]/g, '');
        if (cleanDigits.length === 5 && val === cleanDigits) {
          this.hideSuggestions();
          this.lookupBusByArs(cleanDigits);
          return;
        }

        // 텍스트 검색 시 자동완성 디바운스
        clearTimeout(this.debounceTimer);
        if (val.length >= 1) {
          this.debounceTimer = setTimeout(() => {
            this.handleAutocomplete(val);
          }, 180);
        } else {
          this.hideSuggestions();
        }
      });

      // 엔터 키 입력 시 조회
      this.inputQuery.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.executeSearch();
        } else if (e.key === 'Escape') {
          this.hideSuggestions();
        }
      });

      // 검색 버튼 클릭
      if (this.btnSearch) {
        this.btnSearch.addEventListener('click', () => {
          this.executeSearch();
        });
      }

      // 입력 지우기 버튼
      if (this.btnClearQuery) {
        this.btnClearQuery.addEventListener('click', () => {
          this.inputQuery.value = '';
          this.btnClearQuery.style.display = 'none';
          this.hideSuggestions();
          this.inputQuery.focus();
        });
      }

      // 상단 새로고침 버튼
      if (this.btnRefresh) {
        this.btnRefresh.addEventListener('click', () => {
          this.refreshCurrent();
        });
      }

      // 외부 클릭 시 드롭다운 닫기
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.lookup-search-container')) {
          this.hideSuggestions();
        }
      });
    }

    executeSearch() {
      const val = this.inputQuery.value.trim();
      if (!val) {
        this.inputQuery.focus();
        return;
      }

      this.hideSuggestions();

      // 1. 숫자 5자리인 경우 -> 버스 ARS 조회
      const cleanDigits = val.replace(/[^0-9]/g, '');
      if (cleanDigits.length === 5) {
        this.lookupBusByArs(cleanDigits);
        return;
      }

      // 2. 지하철역 매칭 우선 검사
      const cleanSubwayName = val.replace(/역$/, '').trim();
      const matchedSubway = SUBWAY_STATIONS.find(s => s.name === cleanSubwayName || s.name === val);
      if (matchedSubway) {
        this.lookupSubway(matchedSubway.name);
        return;
      }

      // 3. 일반 검색어인 경우 버스 정류소명 검색 또는 지하철 검색 수행
      this.searchByNameAndLoadFirst(val);
    }

    async searchByNameAndLoadFirst(query) {
      this.showLoading(`'${query}' 검색 중...`);
      try {
        const cleanSubway = query.replace(/역$/, '').trim();
        const subwayMatches = SUBWAY_STATIONS.filter(s => s.name.includes(cleanSubway));
        if (subwayMatches.length > 0 && (query.endsWith('역') || subwayMatches.some(s => s.name === cleanSubway))) {
          const target = subwayMatches.find(s => s.name === cleanSubway) || subwayMatches[0];
          await this.lookupSubway(target.name);
          return;
        }

        // 버스 정류소명 검색
        const stations = await this.fetchStationsByName(query);
        if (stations && stations.length > 0) {
          const first = stations[0];
          if (first.arsId && first.arsId !== '0') {
            await this.lookupBusByArs(first.arsId, first.stNm);
            return;
          }
        }

        if (subwayMatches.length > 0) {
          await this.lookupSubway(subwayMatches[0].name);
          return;
        }

        this.showError(`'${query}'에 해당하는 버스 정류소나 지하철역을 찾을 수 없습니다. 정류장 5자리 번호나 정확한 역명을 입력해 주세요.`);
      } catch (err) {
        this.showError('검색 중 오류가 발생했습니다: ' + err.message);
      }
    }

    // ==========================================
    // 실시간 자동완성 (추천 목록) 드롭다운
    // ==========================================
    async handleAutocomplete(query) {
      if (!this.dropdown) return;
      const cleanSubway = query.replace(/역$/, '').trim();

      // 1. 지하철역 추천 필터링 (최대 4개)
      const subways = SUBWAY_STATIONS.filter(s => s.name.includes(cleanSubway)).slice(0, 4);

      // 2. 6637 전용 정류소 (15158, 15156) 우선 매칭 검사
      const priority6637Stops = [
        { arsId: '15158', stNm: '양정고등학교 (6637 단독)', keywords: ['15158', '6637', '양정', '양정고', '목동'] },
        { arsId: '15156', stNm: '경인초교.목동아파트5.6단지사잇길 (6637 단독)', keywords: ['15156', '6637', '경인', '경인초', '목동'] }
      ];
      const matchedPriority = priority6637Stops.filter(p => p.keywords.some(k => k.includes(query) || query.includes(k)));

      // 3. 버스 정류소명 실시간 API 검색 (비동기)
      let busStations = [];
      try {
        const fetched = await this.fetchStationsByName(query);
        busStations = fetched.filter(b => b.arsId && b.arsId !== '0');
      } catch (e) {
        // 네트워크 지연 시 조용히 스킵
      }

      // 최우선 6637 정류소를 맨 앞에 배치 (중복 제거)
      matchedPriority.forEach(p => {
        busStations = busStations.filter(b => b.arsId !== p.arsId);
        busStations.unshift({ arsId: p.arsId, stNm: p.stNm });
      });
      busStations = busStations.slice(0, 7);

      if (subways.length === 0 && busStations.length === 0) {
        this.hideSuggestions();
        return;
      }

      let html = '';

      // 지하철역 섹션
      if (subways.length > 0) {
        html += `<div class="suggestion-group-title">🚇 지하철역 (${subways.length})</div>`;
        subways.forEach(s => {
          const lineBadges = s.lines.map(line => `<span class="badge-subway-line badge-${this.getSubwayLineClass(line)}">${line}</span>`).join(' ');
          html += `
            <div class="suggestion-item suggestion-subway" data-type="subway" data-name="${s.name}">
              <div class="sugg-left">
                <span class="sugg-icon">🚇</span>
                <span class="sugg-name"><strong>${s.name}역</strong></span>
              </div>
              <div class="sugg-right">${lineBadges}</div>
            </div>
          `;
        });
      }

      // 버스 정류소 섹션
      if (busStations.length > 0) {
        html += `<div class="suggestion-group-title">🚏 버스 정류소 (${busStations.length})</div>`;
        busStations.forEach(b => {
          const formattedArs = this.formatArsId(b.arsId);
          html += `
            <div class="suggestion-item suggestion-bus" data-type="bus" data-ars="${b.arsId}" data-name="${this.escapeHtml(b.stNm)}">
              <div class="sugg-left">
                <span class="sugg-icon">🚏</span>
                <div class="sugg-bus-info">
                  <span class="sugg-name">${this.escapeHtml(b.stNm)}</span>
                  <span class="sugg-ars">ARS ${formattedArs}</span>
                </div>
              </div>
              <div class="sugg-right">
                <span class="sugg-badge-ars">${b.arsId}</span>
              </div>
            </div>
          `;
        });
      }

      this.dropdown.innerHTML = html;
      this.dropdown.style.display = 'block';

      // 드롭다운 클릭 이벤트 바인딩
      this.dropdown.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          const type = item.getAttribute('data-type');
          if (type === 'subway') {
            const name = item.getAttribute('data-name');
            this.inputQuery.value = name + '역';
            this.hideSuggestions();
            this.lookupSubway(name);
          } else if (type === 'bus') {
            const ars = item.getAttribute('data-ars');
            const name = item.getAttribute('data-name');
            this.inputQuery.value = ars;
            this.hideSuggestions();
            this.lookupBusByArs(ars, name);
          }
        });
      });
    }

    hideSuggestions() {
      if (this.dropdown) {
        this.dropdown.style.display = 'none';
        this.dropdown.innerHTML = '';
      }
    }

    // ==========================================
    // 버스 실시간 도착정보 조회 (ARS 5자리)
    // ==========================================
    async lookupBusByArs(arsId, customName = '') {
      const cleanArs = String(arsId).replace(/[^0-9]/g, '');
      if (cleanArs.length !== 5) {
        this.showError('올바른 5자리 정류장 번호를 입력해 주세요 (예: 15154)');
        return;
      }

      this.currentType = 'bus';
      this.currentId = cleanArs;
      this.refreshCountdown = this.autoRefreshInterval;
      this.showLoading(`🚏 ARS [${cleanArs}] 실시간 버스 도착정보 수신 중...`);

      try {
        const busItems = await this.fetchBusArrivalByUid(cleanArs);
        this.lastBusData = busItems;

        if (!busItems || busItems.length === 0) {
          this.showEmptyBus(cleanArs, customName);
          return;
        }

        const stationName = customName || busItems[0].stNm || `정류소 (${this.formatArsId(cleanArs)})`;
        this.currentName = stationName;

        // 최근 기록 저장
        this.saveRecentHistory('bus', cleanArs, stationName);
        this.renderQuickChips();

        // 버스 전광판 렌더링
        this.renderBusBoard(cleanArs, stationName, busItems);
        this.startTicker();
      } catch (err) {
        this.showError(`버스 도착 정보를 불러오지 못했습니다: ${err.message}`);
      }
    }

    // ==========================================
    // 지하철 실시간 도착정보 조회 (역 이름)
    // ==========================================
    async lookupSubway(stationName) {
      const cleanName = stationName.replace(/역$/, '').trim();
      if (!cleanName) return;

      this.currentType = 'subway';
      this.currentId = cleanName;
      this.currentName = cleanName + '역';
      this.refreshCountdown = this.autoRefreshInterval;
      this.showLoading(`🚇 [${cleanName}역] 실시간 열차 운행정보 수신 중...`);

      try {
        const arrivals = await this.fetchSubwayRealtime(cleanName);
        this.lastSubwayData = arrivals;

        if (!arrivals || arrivals.length === 0) {
          this.showEmptySubway(cleanName);
          return;
        }

        // 최근 기록 저장
        this.saveRecentHistory('subway', cleanName, cleanName + '역');
        this.renderQuickChips();

        // 지하철 전광판 렌더링
        this.renderSubwayBoard(cleanName, arrivals);
        this.startTicker();
      } catch (err) {
        this.showError(`지하철 도착 정보를 불러오지 못했습니다: ${err.message}`);
      }
    }

    // ==========================================
    // 실시간 갱신 & 티커
    // ==========================================
    refreshCurrent() {
      if (this.btnRefresh) this.btnRefresh.classList.add('spinning');
      const finish = () => {
        if (this.btnRefresh) {
          setTimeout(() => this.btnRefresh.classList.remove('spinning'), 500);
        }
      };

      if (this.currentType === 'bus' && this.currentId) {
        this.lookupBusByArs(this.currentId, this.currentName).finally(finish);
      } else if (this.currentType === 'subway' && this.currentId) {
        this.lookupSubway(this.currentId).finally(finish);
      } else {
        finish();
      }
    }

    startTicker() {
      if (this.tickerTimer) clearInterval(this.tickerTimer);
      this.tickerTimer = setInterval(() => {
        this.tickCountdowns();
      }, 1000);
    }

    stopTicker() {
      if (this.tickerTimer) {
        clearInterval(this.tickerTimer);
        this.tickerTimer = null;
      }
    }

    tickCountdowns() {
      const now = Date.now();

      // 초 단위 실시간 카운트다운 엘리먼트들 갱신
      const liveEls = document.querySelectorAll('#lookupResultContainer .live-bus-sec');
      liveEls.forEach(el => {
        const targetTime = parseInt(el.getAttribute('data-target-time'), 10);
        if (!targetTime || isNaN(targetTime)) return;

        const remainSec = Math.max(0, Math.floor((targetTime - now) / 1000));
        if (remainSec <= 0) {
          el.innerHTML = `<span class="tag-arrive-now">⚡ 곧 도착</span>`;
        } else if (remainSec < 60) {
          el.innerHTML = `<span class="tag-arrive-imminent">${remainSec}초 후</span>`;
        } else {
          const m = Math.floor(remainSec / 60);
          const s = remainSec % 60;
          const sStr = s < 10 ? '0' + s : s;
          el.innerHTML = `<span class="time-min">${m}분</span> <span class="time-sec">${sStr}초 후</span>`;
        }
      });

      // 자동 새로고침 카운트다운
      if (this.refreshCountdown > 0) {
        this.refreshCountdown--;
      }

      const countdownEl = document.getElementById('lookupAutoRefreshCountdown');
      if (countdownEl) {
        countdownEl.textContent = `${this.refreshCountdown}초`;
      }

      if (this.refreshCountdown <= 0) {
        this.refreshCountdown = this.autoRefreshInterval;
        if (!document.hidden && !this.isFetching) {
          this.silentRefresh();
        }
      }
    }

    async silentRefresh() {
      if (this.isFetching) return;
      this.isFetching = true;
      try {
        if (this.currentType === 'bus' && this.currentId) {
          const items = await this.fetchBusArrivalByUid(this.currentId);
          if (items && items.length > 0) {
            this.lastBusData = items;
            this.renderBusBoard(this.currentId, this.currentName, items, true);
          }
        } else if (this.currentType === 'subway' && this.currentId) {
          const arrivals = await this.fetchSubwayRealtime(this.currentId);
          if (arrivals && arrivals.length > 0) {
            this.lastSubwayData = arrivals;
            this.renderSubwayBoard(this.currentId, arrivals, true);
          }
        }
      } catch (e) {
        // 조용히 대기
      } finally {
        this.isFetching = false;
      }
    }

    // ==========================================
    // 렌더링: 버스 도착 전광판
    // ==========================================
    renderBusBoard(arsId, stationName, busList, isSilent = false) {
      if (!this.resultContainer) return;

      const formattedArs = this.formatArsId(arsId);
      const currentTimeStr = new Date().toLocaleTimeString('ko-KR', { hour12: false });
      const nowMs = Date.now();

      // 필터링 적용
      let filtered = [...busList];
      if (this.filterType === 'town') {
        filtered = filtered.filter(b => b.routeType === '마을' || (b.rtNm && b.rtNm.includes('마을')) || (b.rtNm && b.rtNm.startsWith('양천')));
      } else if (this.filterType === 'blue') {
        filtered = filtered.filter(b => b.routeType === '간선' || (b.routeType && b.routeType.includes('간선')));
      } else if (this.filterType === 'green') {
        filtered = filtered.filter(b => b.routeType === '지선' || (b.routeType && b.routeType.includes('지선')));
      } else if (this.filterType === 'red') {
        filtered = filtered.filter(b => b.routeType === '광역' || b.routeType === '직행' || (b.routeType && b.routeType.includes('광역')));
      }

      // 정렬 적용
      if (this.sortType === 'arrival') {
        filtered.sort((a, b) => {
          const tA = parseInt(a.traTime1, 10) || 999999;
          const tB = parseInt(b.traTime1, 10) || 999999;
          return tA - tB;
        });
      } else {
        filtered.sort((a, b) => (a.rtNm || '').localeCompare(b.rtNm || '', undefined, { numeric: true }));
      }

      // 버스 카드 목록 생성
      let cardsHtml = '';
      if (filtered.length === 0) {
        cardsHtml = `
          <div class="lookup-no-results">
            <span>선택한 필터에 해당하는 운행 버스가 없습니다.</span>
          </div>
        `;
      } else {
        cardsHtml = filtered.map(bus => {
          const badgeClass = this.getBusBadgeClass(bus.routeType, bus.rtNm);
          const typeName = bus.routeType || this.guessRouteType(bus.rtNm);
          const nextStop = bus.nxtStn ? `${bus.nxtStn} 방면` : '운행 노선';

          // 첫 번째 버스 도착정보
          const tra1 = parseInt(bus.traTime1, 10);
          const targetTime1 = (!isNaN(tra1) && tra1 > 0) ? (nowMs + tra1 * 1000) : null;
          const busMsg1 = bus.arrmsg1 || '운행 정보 없음';
          const plate1 = this.formatPlateHighlight(bus.plainNo1);
          const isTerm1 = busMsg1.includes('종료') || busMsg1.includes('대기') || busMsg1.includes('출발');

          // 두 번째 버스 도착정보
          const tra2 = parseInt(bus.traTime2, 10);
          const targetTime2 = (!isNaN(tra2) && tra2 > 0) ? (nowMs + tra2 * 1000) : null;
          const busMsg2 = bus.arrmsg2 || '도착 예정 없음';
          const plate2 = this.formatPlateHighlight(bus.plainNo2);

          return `
            <div class="lookup-bus-card">
              <div class="bus-card-left">
                <div class="bus-route-header">
                  <span class="bus-badge ${badgeClass}">${bus.rtNm}</span>
                  <span class="bus-type-tag">${typeName}</span>
                </div>
                <div class="bus-direction-text">${nextStop}</div>
              </div>

              <div class="bus-card-right">
                <!-- 다음 버스 (첫 번째 버스) -->
                <div class="bus-arrival-row first-bus">
                  <div class="arr-label-wrap">
                    <span class="arr-badge arr-first">다음</span>
                    ${targetTime1 ? `
                      <span class="live-bus-sec" data-target-time="${targetTime1}">
                        ${this.formatSecondsHtml(tra1)}
                      </span>
                    ` : `
                      <span class="arr-text-raw ${isTerm1 ? 'arr-status-ended' : ''}">${this.cleanArrivalMsg(busMsg1)}</span>
                    `}
                  </div>
                  <div class="arr-sub-info">
                    ${this.extractStationCount(busMsg1) ? `<span class="arr-stops-cnt">${this.extractStationCount(busMsg1)}</span>` : ''}
                    ${plate1 ? `<span class="arr-plate-no">${plate1}</span>` : ''}
                    ${bus.reride_Num1 === '1' || bus.busType1 === '1' ? `<span class="badge-low-bus">저상</span>` : ''}
                  </div>
                </div>

                <!-- 다다음 버스 (두 번째 버스) -->
                <div class="bus-arrival-row second-bus">
                  <div class="arr-label-wrap">
                    <span class="arr-badge arr-second">다다음</span>
                    ${targetTime2 ? `
                      <span class="live-bus-sec" data-target-time="${targetTime2}">
                        ${this.formatSecondsHtml(tra2)}
                      </span>
                    ` : `
                      <span class="arr-text-raw secondary">${this.cleanArrivalMsg(busMsg2)}</span>
                    `}
                  </div>
                  <div class="arr-sub-info">
                    ${this.extractStationCount(busMsg2) ? `<span class="arr-stops-cnt">${this.extractStationCount(busMsg2)}</span>` : ''}
                    ${plate2 ? `<span class="arr-plate-no">${plate2}</span>` : ''}
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      const cleanArs = String(arsId).replace(/[^0-9]/g, '');

      const boardHtml = `
        <div class="lookup-board-wrap">
          <!-- 6637 전용 정류소 최상위 빠른 전환 탭 (15158 양정고 ↔ 15156 경인초교) -->
          <div class="dedicated-6637-switch-bar">
            <span class="dedicated-tag">🚌 6637 전용</span>
            <div class="dedicated-tab-group">
              <button type="button" class="btn-6637-tab ${cleanArs === '15158' ? 'active' : ''}" data-ars="15158" data-name="양정고등학교">
                <span class="tab-ars-num">15158</span> 양정고교 (당산방면)
              </button>
              <button type="button" class="btn-6637-tab ${cleanArs === '15156' ? 'active' : ''}" data-ars="15156" data-name="경인초교.목동아파트5.6단지">
                <span class="tab-ars-num">15156</span> 경인초교 (목동방면)
              </button>
            </div>
          </div>

          <!-- 상단 정류소 정보 헤더 -->
          <div class="lookup-board-header">
            <div class="station-meta-info">
              <div class="station-name-row">
                <span class="station-icon">🚏</span>
                <h4 class="station-title">${this.escapeHtml(stationName)}</h4>
                <span class="station-ars-badge">ARS ${formattedArs}</span>
                ${cleanArs === '15158' || cleanArs === '15156' ? `<span class="badge-only-6637">6637 전용 정류소</span>` : ''}
              </div>
              <div class="station-sub-row">
                <span class="station-route-count">정차 노선 <strong>${busList.length}개</strong></span>
                <span class="station-update-time">수신: ${currentTimeStr}</span>
                <span class="station-auto-ticker">🔄 <strong id="lookupAutoRefreshCountdown">${this.refreshCountdown}초</strong> 갱신</span>
              </div>
            </div>
          </div>

          <!-- 필터 및 정렬 바 -->
          <div class="lookup-filter-bar">
            <div class="filter-btn-group">
              <button type="button" class="btn-filter ${this.filterType === 'all' ? 'active' : ''}" data-filter="all">전체 (${busList.length})</button>
              <button type="button" class="btn-filter ${this.filterType === 'town' ? 'active' : ''}" data-filter="town">마을</button>
              <button type="button" class="btn-filter ${this.filterType === 'blue' ? 'active' : ''}" data-filter="blue">간선</button>
              <button type="button" class="btn-filter ${this.filterType === 'green' ? 'active' : ''}" data-filter="green">지선</button>
              <button type="button" class="btn-filter ${this.filterType === 'red' ? 'active' : ''}" data-filter="red">광역</button>
            </div>
            <div class="sort-btn-group">
              <button type="button" class="btn-sort" id="btnToggleSort" title="도착순 / 노선순 정렬">
                ${this.sortType === 'arrival' ? '⚡ 도착임박순' : '🔢 노선번호순'}
              </button>
            </div>
          </div>

          <!-- 버스 카드 목록 -->
          <div class="lookup-cards-container">
            ${cardsHtml}
          </div>
        </div>
      `;

      this.resultContainer.innerHTML = boardHtml;

      // 6637 전용 정류소 탭 클릭 이벤트
      this.resultContainer.querySelectorAll('.btn-6637-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetArs = btn.getAttribute('data-ars');
          const targetName = btn.getAttribute('data-name');
          if (this.inputQuery) this.inputQuery.value = targetArs;
          this.lookupBusByArs(targetArs, targetName);
        });
      });

      // 필터 버튼 이벤트 바인딩
      this.resultContainer.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          this.filterType = btn.getAttribute('data-filter');
          this.renderBusBoard(arsId, stationName, busList);
        });
      });

      // 정렬 토글 이벤트 바인딩
      const btnSort = document.getElementById('btnToggleSort');
      if (btnSort) {
        btnSort.addEventListener('click', () => {
          this.sortType = (this.sortType === 'arrival') ? 'number' : 'arrival';
          this.renderBusBoard(arsId, stationName, busList);
        });
      }
    }

    // ==========================================
    // 렌더링: 지하철 실시간 운행 전광판
    // ==========================================
    renderSubwayBoard(stationName, arrivals, isSilent = false) {
      if (!this.resultContainer) return;

      const currentTimeStr = new Date().toLocaleTimeString('ko-KR', { hour12: false });

      // 상행(내선)과 하행(외선)으로 그룹화
      const upTrains = arrivals.filter(a => a.updnLine === '상행' || a.updnLine === '내선');
      const downTrains = arrivals.filter(a => a.updnLine === '하행' || a.updnLine === '외선');

      const renderTrainGroup = (title, list, icon) => {
        if (!list || list.length === 0) {
          return `
            <div class="subway-direction-box">
              <div class="subway-dir-header">
                <span class="dir-icon">${icon}</span>
                <span class="dir-title">${title}</span>
              </div>
              <div class="subway-empty-msg">실시간 운행 중인 열차가 없습니다.</div>
            </div>
          `;
        }

        const trainsHtml = list.slice(0, 3).map((item, idx) => {
          const isExpress = item.btrainSttus === '급행' || (item.trainLineNm && item.trainLineNm.includes('급행'));
          const isFirst = (idx === 0);
          const arriveMsg = item.arvlMsg2 || item.arvlMsg3 || '도착 대기';
          const lineNm = item.trainLineNm || (item.bstatnNm ? `${item.bstatnNm}행` : '열차');

          return `
            <div class="subway-train-item ${isFirst ? 'is-next-train' : ''}">
              <div class="train-seq-badge ${isFirst ? 'seq-first' : 'seq-second'}">
                ${isFirst ? '다음 열차' : '다다음 열차'}
              </div>
              <div class="train-destination">
                <span class="train-head">${this.escapeHtml(lineNm)}</span>
                ${isExpress ? `<span class="badge-express-train">⚡ 급행</span>` : `<span class="badge-normal-train">일반</span>`}
              </div>
              <div class="train-arrival-status">
                <span class="train-msg ${this.isImminentSubway(arriveMsg) ? 'status-imminent' : ''}">${this.escapeHtml(arriveMsg)}</span>
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="subway-direction-box">
            <div class="subway-dir-header">
              <span class="dir-icon">${icon}</span>
              <span class="dir-title">${title}</span>
              <span class="dir-count">${list.length}대 운행중</span>
            </div>
            <div class="subway-train-list">
              ${trainsHtml}
            </div>
          </div>
        `;
      };

      const boardHtml = `
        <div class="lookup-board-wrap">
          <!-- 지하철역 정보 헤더 -->
          <div class="lookup-board-header subway-theme-header">
            <div class="station-meta-info">
              <div class="station-name-row">
                <span class="station-icon">🚇</span>
                <h4 class="station-title">${this.escapeHtml(stationName)}역</h4>
                <span class="station-ars-badge subway-badge-tag">실시간 열차 운행정보</span>
              </div>
              <div class="station-sub-row">
                <span class="station-route-count">실시간 열차 <strong>${arrivals.length}대 감지</strong></span>
                <span class="station-update-time">수신: ${currentTimeStr}</span>
                <span class="station-auto-ticker">🔄 <strong id="lookupAutoRefreshCountdown">${this.refreshCountdown}초</strong> 갱신</span>
              </div>
            </div>
          </div>

          <!-- 상행/하행 방향별 열차 도착 안내 -->
          <div class="subway-board-grid">
            ${renderTrainGroup('상행 / 내선 방면', upTrains, '⬆️')}
            ${renderTrainGroup('하행 / 외선 방면', downTrains, '⬇️')}
          </div>
        </div>
      `;

      this.resultContainer.innerHTML = boardHtml;
    }

    // ==========================================
    // 최근 검색 / 빠른 선택 칩
    // ==========================================
    renderQuickChips() {
      if (!this.chipsContainer) return;

      const history = this.getRecentHistory();
      
      // 최상위 1순위 & 2순위: 6637 단독 정차 정류소 (15158 양정고, 15156 경인초교)
      const topPriorityChips = [
        { type: 'bus', id: '15158', name: '양정고 (6637)', isTop: true },
        { type: 'bus', id: '15156', name: '경인초교 (6637)', isTop: true }
      ];

      const otherDefaultChips = [
        { type: 'bus', id: '15154', name: '이대목동병원' },
        { type: 'bus', id: '19210', name: '선유도역1번' },
        { type: 'bus', id: '19212', name: '선유도역' },
        { type: 'subway', id: '선유도', name: '선유도역(9)' },
        { type: 'subway', id: '당산', name: '당산역(2·9)' }
      ];

      // 최상위 2개는 무조건 맨 앞(1번, 2번) 고정, 그 뒤로 최근 기록 및 기본값 연결
      const filteredHistory = history.filter(h => h.id !== '15158' && h.id !== '15156');
      const merged = [...topPriorityChips, ...filteredHistory];
      otherDefaultChips.forEach(def => {
        if (!merged.some(m => m.type === def.type && m.id === def.id)) {
          merged.push(def);
        }
      });

      const chipsHtml = merged.slice(0, 8).map(chip => {
        const isBus = (chip.type === 'bus');
        const icon = isBus ? '🚏' : '🚇';
        const label = isBus ? `[${chip.id}] ${chip.name}` : `${chip.name}`;
        const topClass = chip.isTop ? 'chip-top-6637' : '';
        return `
          <button type="button" class="quick-chip-btn ${isBus ? 'chip-bus' : 'chip-subway'} ${topClass}" 
                  data-type="${chip.type}" data-id="${chip.id}" data-name="${this.escapeHtml(chip.name)}">
            <span class="chip-icon">${icon}</span>
            <span class="chip-text">${label}</span>
          </button>
        `;
      }).join('');

      this.chipsContainer.innerHTML = chipsHtml;

      // 칩 클릭 이벤트
      this.chipsContainer.querySelectorAll('.quick-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-type');
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          if (type === 'bus') {
            this.inputQuery.value = id;
            if (this.btnClearQuery) this.btnClearQuery.style.display = 'flex';
            this.lookupBusByArs(id, name);
          } else {
            this.inputQuery.value = name;
            if (this.btnClearQuery) this.btnClearQuery.style.display = 'flex';
            this.lookupSubway(id);
          }
        });
      });
    }

    getRecentHistory() {
      try {
        const raw = localStorage.getItem('shift_recent_transits');
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    saveRecentHistory(type, id, name) {
      try {
        let history = this.getRecentHistory();
        history = history.filter(h => !(h.type === type && h.id === id));
        history.unshift({ type, id, name });
        if (history.length > 8) history = history.slice(0, 8);
        localStorage.setItem('shift_recent_transits', JSON.stringify(history));
      } catch (e) {}
    }

    // ==========================================
    // API 통신 레이어 (직결 + 프록시 안전 fallback)
    // ==========================================

    // 1. 서울시 정류소명 검색 API
    async fetchStationsByName(name) {
      const cleanName = String(name).trim();
      const directUrl = `http://ws.bus.go.kr/api/rest/stationinfo/getStationByName?serviceKey=${this.busApiKey}&stSrch=${encodeURIComponent(cleanName)}&resultType=json`;

      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(directUrl, { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          const items = data?.msgBody?.itemList;
          if (Array.isArray(items)) return items;
        }
      } catch (e) {}

      // CORS fallback
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
        const res = await fetch(proxyUrl, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const items = data?.msgBody?.itemList;
          if (Array.isArray(items)) return items;
        }
      } catch (e) {}

      return [];
    }

    // 2. ARS별 전체 버스 도착정보 API (getStationByUid)
    async fetchBusArrivalByUid(arsId) {
      const cleanArs = String(arsId).replace(/[^0-9]/g, '');
      const directUrl = `http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?serviceKey=${this.busApiKey}&arsId=${cleanArs}&resultType=json`;

      // 1차 Direct
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(directUrl, { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          const items = data?.msgBody?.itemList;
          if (Array.isArray(items)) {
            this.cache.bus[cleanArs] = items;
            return items;
          }
        }
      } catch (e) {}

      // 2차 CORS 프록시
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
        const res = await fetch(proxyUrl, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const items = data?.msgBody?.itemList;
          if (Array.isArray(items)) {
            this.cache.bus[cleanArs] = items;
            return items;
          }
        }
      } catch (e) {}

      return this.cache.bus[cleanArs] || [];
    }

    // 3. 지하철 실시간 도착정보 API (realtimeStationArrival)
    async fetchSubwayRealtime(stationName) {
      const cleanName = stationName.replace(/역$/, '').trim();
      const directUrl = `http://swopenAPI.seoul.go.kr/api/subway/${this.subwayApiKey}/json/realtimeStationArrival/0/10/${encodeURIComponent(cleanName)}`;

      // 1차 Direct
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(directUrl, { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          if (data && data.realtimeArrivalList) {
            this.cache.subway[cleanName] = data.realtimeArrivalList;
            return data.realtimeArrivalList;
          }
        }
      } catch (e) {}

      // 2차 CORS 프록시
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
        const res = await fetch(proxyUrl, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.realtimeArrivalList) {
            this.cache.subway[cleanName] = data.realtimeArrivalList;
            return data.realtimeArrivalList;
          }
        }
      } catch (e) {}

      return this.cache.subway[cleanName] || [];
    }

    // ==========================================
    // UI 상태 헬퍼 함수들
    // ==========================================
    showLoading(text) {
      if (!this.resultContainer) return;
      this.resultContainer.innerHTML = `
        <div class="lookup-state-box">
          <div class="lookup-spinner"></div>
          <div class="lookup-state-text">${this.escapeHtml(text)}</div>
        </div>
      `;
    }

    showError(text) {
      if (!this.resultContainer) return;
      this.resultContainer.innerHTML = `
        <div class="lookup-state-box lookup-error-state">
          <div class="state-icon">⚠️</div>
          <div class="lookup-state-text error-msg">${this.escapeHtml(text)}</div>
          <button type="button" class="btn-state-retry" onclick="window.transitLookup && window.transitLookup.executeSearch()">다시 시도</button>
        </div>
      `;
    }

    showEmptyBus(arsId, customName) {
      if (!this.resultContainer) return;
      const formattedArs = this.formatArsId(arsId);
      this.resultContainer.innerHTML = `
        <div class="lookup-state-box">
          <div class="state-icon">🚏</div>
          <div class="lookup-state-title">ARS [${formattedArs}] 정류소 정보</div>
          <div class="lookup-state-text">현재 운행 중인 버스가 없거나 정류장 번호를 다시 확인해 주세요.</div>
        </div>
      `;
    }

    showEmptySubway(stationName) {
      if (!this.resultContainer) return;
      this.resultContainer.innerHTML = `
        <div class="lookup-state-box">
          <div class="state-icon">🚇</div>
          <div class="lookup-state-title">${this.escapeHtml(stationName)}역 운행 정보</div>
          <div class="lookup-state-text">현재 실시간 운행 중인 열차 도착 정보를 수신할 수 없습니다 (심야 시간 등).</div>
        </div>
      `;
    }

    // ==========================================
    // 유틸리티 및 포맷터
    // ==========================================
    formatArsId(ars) {
      const s = String(ars).replace(/[^0-9]/g, '');
      if (s.length === 5) return `${s.slice(0, 2)}-${s.slice(2)}`;
      return s;
    }

    formatSecondsHtml(sec) {
      if (!sec || isNaN(sec) || sec <= 0) return `<span class="tag-arrive-now">⚡ 곧 도착</span>`;
      if (sec < 60) return `<span class="tag-arrive-imminent">${sec}초 후</span>`;
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      const sStr = s < 10 ? '0' + s : s;
      return `<span class="time-min">${m}분</span> <span class="time-sec">${sStr}초 후</span>`;
    }

    formatPlateHighlight(plate) {
      if (!plate) return '';
      const str = String(plate).trim();
      const m = str.match(/^(.*?)(\d{4})$/);
      if (m) {
        return `🚌 <strong class="plate-digit">${m[2]}</strong>`;
      }
      return `🚌 ${str}`;
    }

    cleanArrivalMsg(msg) {
      if (!msg) return '정보 없음';
      return msg.replace(/\[\d+번째\s*전\]/g, '').trim();
    }

    extractStationCount(msg) {
      if (!msg) return '';
      const m = msg.match(/\[(\d+번째\s*전)\]/);
      return m ? m[1] : '';
    }

    getBusBadgeClass(routeType, rtNm) {
      const t = routeType || '';
      const n = rtNm || '';
      if (t.includes('마을') || n.startsWith('양천') || n.includes('마을')) return 'badge-town';
      if (t.includes('간선') || (!t && n.length === 3 && (n.startsWith('1') || n.startsWith('2') || n.startsWith('3') || n.startsWith('4') || n.startsWith('5') || n.startsWith('6') || n.startsWith('7')))) return 'badge-blue';
      if (t.includes('지선') || (!t && n.length === 4)) return 'badge-green';
      if (t.includes('광역') || t.includes('직행') || (!t && n.length === 4 && n.startsWith('9'))) return 'badge-red';
      if (t.includes('공항') || n.startsWith('60')) return 'badge-sky';
      return 'badge-blue';
    }

    guessRouteType(rtNm) {
      if (!rtNm) return '일반';
      if (rtNm.startsWith('양천') || rtNm.includes('마을')) return '마을버스';
      if (rtNm.length === 3) return '간선버스';
      if (rtNm.length === 4) return '지선버스';
      if (rtNm.startsWith('60')) return '공항버스';
      return '일반버스';
    }

    getSubwayLineClass(lineName) {
      if (lineName.includes('1호선')) return 'line-1';
      if (lineName.includes('2호선')) return 'line-2';
      if (lineName.includes('3호선')) return 'line-3';
      if (lineName.includes('4호선')) return 'line-4';
      if (lineName.includes('5호선')) return 'line-5';
      if (lineName.includes('6호선')) return 'line-6';
      if (lineName.includes('7호선')) return 'line-7';
      if (lineName.includes('8호선')) return 'line-8';
      if (lineName.includes('9호선')) return 'line-9';
      if (lineName.includes('신분당')) return 'line-sinbundang';
      if (lineName.includes('공항')) return 'line-airport';
      return 'line-default';
    }

    isImminentSubway(msg) {
      if (!msg) return false;
      return msg.includes('진입') || msg.includes('도착') || msg.includes('출발') || msg.includes('곧');
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  // DOM 로드 완료 시 인스턴스 초기화
  document.addEventListener('DOMContentLoaded', () => {
    window.transitLookup = new TransitLookupController();
  });

})();
