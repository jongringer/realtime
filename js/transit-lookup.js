// ==========================================================================
// 실시간 버스 정류장 · 버스 노선번호 · 지하철역 통합 조회 엔진 (realtime)
// - 정류장 ID(5자리), 정류장명, 버스번호 단독, [정류장 + 버스번호] 동시 검색 지원
// - 지하철역 전 호선 상·하행 실시간 열차 도착 카운트다운 지원
// - 서울시 TOPIS / m.bus.go.kr / 서울시 실시간 지하철 API 직결 + CORS 프록시 백업
// ==========================================================================

(function() {
  'use strict';

  const SUBWAY_ID_MAP = {
    '1001': { name: '1호선', cls: 'line-1' },
    '1002': { name: '2호선', cls: 'line-2' },
    '1003': { name: '3호선', cls: 'line-3' },
    '1004': { name: '4호선', cls: 'line-4' },
    '1005': { name: '5호선', cls: 'line-5' },
    '1006': { name: '6호선', cls: 'line-6' },
    '1007': { name: '7호선', cls: 'line-7' },
    '1008': { name: '8호선', cls: 'line-8' },
    '1009': { name: '9호선', cls: 'line-9' },
    '1032': { name: 'GTX-A', cls: 'line-default' },
    '1063': { name: '경의중앙선', cls: 'line-default' },
    '1065': { name: '공항철도', cls: 'line-airport' },
    '1067': { name: '경춘선', cls: 'line-default' },
    '1075': { name: '수인분당선', cls: 'line-default' },
    '1077': { name: '신분당선', cls: 'line-sinbundang' },
    '1092': { name: '우이신설선', cls: 'line-default' },
    '1093': { name: '서해선', cls: 'line-default' },
    '1094': { name: '신림선', cls: 'line-default' }
  };

  // 수도권 주요 지하철역 및 호선 데이터베이스
  const SUBWAY_STATIONS = [
    { name: '국회의사당', lines: ['9호선'] },
    { name: '여의도', lines: ['5호선', '9호선'] },
    { name: '샛강', lines: ['9호선', '신림선'] },
    { name: '여의나루', lines: ['5호선'] },
    { name: '당산', lines: ['2호선', '9호선'] },
    { name: '선유도', lines: ['9호선'] },
    { name: '영등포구청', lines: ['2호선', '5호선'] },
    { name: '영등포시장', lines: ['5호선'] },
    { name: '영등포', lines: ['1호선'] },
    { name: '신길', lines: ['1호선', '5호선'] },
    { name: '대방', lines: ['1호선', '신림선'] },
    { name: '노량진', lines: ['1호선', '9호선'] },
    { name: '신목동', lines: ['9호선'] },
    { name: '목동', lines: ['5호선'] },
    { name: '오목교', lines: ['5호선'] },
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
    { name: '마곡', lines: ['5호선'] }
  ];

  // 추가 보강 버스 노선 (마을·경기버스 등)
  const EXTRA_BUS_ROUTES = [
    {
      routeNo: '10부천',
      aliases: ['10', '10번', '10부천', '부천10'],
      routeType: '경기일반',
      badgeClass: 'badge-sky',
      summary: '부천 옥길·역곡 ↔ 개봉·영등포 ↔ KBS(19130) ↔ 국회의사당역',
      stops: [
        { arsId: '19130', stNm: 'KBS', dir: '영등포·부천 방면' },
        { arsId: '19133', stNm: '국회의사당역5번출구', dir: 'KBS·회차 방면' },
        { arsId: '19161', stNm: '한국경제인협회', dir: '영등포역 방면' },
        { arsId: '19102', stNm: '영등포역 (1호선)', dir: '신도림·개봉 방면' }
      ]
    },
    {
      routeNo: '영등포10',
      aliases: ['영등포10', '영등포10번'],
      routeType: '마을버스',
      badgeClass: 'badge-town',
      summary: '여의도 KBS ↔ 국회의사당역 ↔ 여의도역 ↔ 샛강역 순환',
      stops: [
        { arsId: '19130', stNm: 'KBS', dir: '여의도역 방면' },
        { arsId: '19132', stNm: '국회의사당역', dir: 'KBS 방면' },
        { arsId: '19156', stNm: '여의도역5번출구', dir: '샛강역 방면' },
        { arsId: '19155', stNm: '여의도역6번출구', dir: '국회의사당 방면' }
      ]
    },
    {
      routeNo: '영등포11',
      aliases: ['영등포11', '영등포11번'],
      routeType: '마을버스',
      badgeClass: 'badge-town',
      summary: '여의도 시범아파트 ↔ 여의나루역 ↔ 여의도역 ↔ 대방역',
      stops: [
        { arsId: '19156', stNm: '여의도역5번출구', dir: '시범아파트 방면' },
        { arsId: '19155', stNm: '여의도역6번출구', dir: '대방역 방면' },
        { arsId: '19139', stNm: '여의나루역1번출구', dir: '시범아파트 방면' }
      ]
    },
    {
      routeNo: '양천01',
      aliases: ['양천01', '양천01번'],
      routeType: '마을버스',
      badgeClass: 'badge-town',
      summary: '당산역 ↔ 선유도역 ↔ 이대목동병원 ↔ 오목교역 ↔ 목동역',
      stops: [
        { arsId: '19176', stNm: '당산역삼성래미안아파트', dir: '목동역 방면' },
        { arsId: '19210', stNm: '선유도역1번출구', dir: '목동 방면' },
        { arsId: '15154', stNm: '이대목동병원.목동6단지앞', dir: '당산역/목동 방면' },
        { arsId: '15155', stNm: '오목교역 (5호선)', dir: '목동역 방면' },
        { arsId: '15161', stNm: '목동역 (5호선)', dir: '종점' }
      ]
    },
    {
      routeNo: '양천02',
      aliases: ['양천02', '양천02번'],
      routeType: '마을버스',
      badgeClass: 'badge-town',
      summary: '오목교역 ↔ 경인초교 ↔ 양정고 ↔ 이대목동병원',
      stops: [
        { arsId: '15155', stNm: '오목교역 (5호선)', dir: '기점' },
        { arsId: '15156', stNm: '경인초교.목동5·6단지사잇길', dir: '오목교역 방면' },
        { arsId: '15158', stNm: '양정고등학교', dir: '목동단지 방면' },
        { arsId: '15154', stNm: '이대목동병원.목동6단지앞', dir: '종점' }
      ]
    },
    {
      routeNo: '700',
      aliases: ['700', '700부천', '부천700'],
      routeType: '부천버스',
      badgeClass: 'badge-sky',
      summary: '부천 상동 ↔ 목동 ↔ 당산역 ↔ 여의도환승센터',
      stops: [
        { arsId: '19007', stNm: '여의도환승센터', dir: '당산·부천 방면' },
        { arsId: '19175', stNm: '당산역', dir: '여의도 방면' },
        { arsId: '19176', stNm: '당산역삼성래미안아파트', dir: '부천 방면' },
        { arsId: '15154', stNm: '이대목동병원.목동6단지앞', dir: '당산역 방면' }
      ]
    }
  ];

  // 여의도·KBS·국회의사당 및 서울 주요 환승 거점 정류소 DB (즉시 자동완성 백업)
  const LOCAL_POPULAR_STATIONS = [
    { arsId: '19130', stNm: 'KBS', keywords: ['kbs', 'KBS', '한국방송', '본관', '19130', '162', '5615', '5618', '10부천', '70-2'] },
    { arsId: '19152', stNm: '여의도공원1번출입구', keywords: ['여의도공원', '여의도공원1번출입구', 'kbs', 'KBS인근', '19152', '160', '260', '360', '600', '662', '5012', '5713', '700'] },
    { arsId: '19150', stNm: 'KBS별관', keywords: ['kbs', 'KBS별관', '별관', '19150', '162', '261', '262'] },
    { arsId: '19151', stNm: '샛강역3번출구.KBS별관', keywords: ['kbs', 'KBS별관', '샛강역', '19151'] },
    { arsId: '19132', stNm: '국회의사당역.KB국민은행', keywords: ['국회', '국회의사당', '국회의사당역', '국민은행', '19132', '9호선'] },
    { arsId: '19133', stNm: '국회의사당역5번출구', keywords: ['국회', '국회의사당', '국회의사당역', '5번출구', '19133', '162', '260', '461'] },
    { arsId: '19131', stNm: '국회의사당', keywords: ['국회', '국회의사당', '국회의사당역', '1번출구', '19131'] },
    { arsId: '19134', stNm: '국회의사당', keywords: ['국회', '국회의사당', '19134'] },
    { arsId: '19007', stNm: '여의도환승센터 (1~2번승강장)', keywords: ['여의도', '여의도환승센터', '환승센터', '19007', '260', '262', '360'] },
    { arsId: '19008', stNm: '여의도환승센터 (3~4번승강장)', keywords: ['여의도', '여의도환승센터', '환승센터', '19008', '260', '360', '662'] },
    { arsId: '19017', stNm: '여의도환승센터', keywords: ['여의도', '여의도환승센터', '환승센터', '19017', '261'] },
    { arsId: '19156', stNm: '여의도역5번출구', keywords: ['여의도', '여의도역', '5번출구', '19156', '162', '261', '262', '461'] },
    { arsId: '19155', stNm: '여의도역6번출구', keywords: ['여의도', '여의도역', '6번출구', '19155', '162', '5615', '5618'] },
    { arsId: '19161', stNm: '한국경제인협회 (전경련회관)', keywords: ['전경련', '한국경제인협회', '여의도', '19161', '162', '360'] },
    { arsId: '19282', stNm: '더현대서울', keywords: ['더현대', '더현대서울', '여의도', '19282'] },
    { arsId: '19284', stNm: '파크원타워.LG트윈타워', keywords: ['파크원', 'lg트윈타워', '여의도', '19284'] },
    { arsId: '19139', stNm: '여의나루역1번출구', keywords: ['여의나루', '여의나루역', '한강공원', '19139'] },
    { arsId: '19140', stNm: '여의나루역2번출구', keywords: ['여의나루', '여의나루역', '19140'] },
    { arsId: '19175', stNm: '당산역', keywords: ['당산', '당산역', '19175', '2호선', '9호선'] },
    { arsId: '19176', stNm: '당산역삼성래미안아파트', keywords: ['당산', '당산역', '19176', '603', '6620'] },
    { arsId: '19102', stNm: '영등포역', keywords: ['영등포', '영등포역', '19102'] },
    { arsId: '02004', stNm: '서울역버스환승센터', keywords: ['서울역', '서울역환승센터', '02004'] },
    { arsId: '02007', stNm: '서울역버스환승센터', keywords: ['서울역', '서울역환승센터', '02007'] }
  ];

  // 9호선 선유도역 시간표 백업
  const SEONYUDO_WEEKDAY_TIMETABLE = {
    5: [34, 48, 59], 6: [11, 23, 35, 43, 50, 59], 7: [5, 11, 18, 24, 30, 37, 43, 49, 56],
    8: [2, 8, 15, 21, 27, 34, 40, 46, 53], 9: [2, 11, 22, 33, 44, 55], 10: [6, 17, 28, 39, 50],
    11: [1, 13, 25, 36, 47, 58], 12: [9, 20, 31, 42, 53], 13: [4, 15, 26, 38, 50],
    14: [1, 12, 23, 34, 45, 56], 15: [7, 18, 29, 40, 51], 16: [2, 10, 14, 26, 37, 39, 49, 59],
    17: [5, 12, 19, 26, 33, 40, 46, 53], 18: [0, 7, 14, 21, 27, 34, 41, 48, 55],
    19: [2, 8, 15, 22, 31, 40, 49, 58], 20: [7, 18, 29, 40, 51], 21: [2, 13, 24, 35, 46, 57],
    22: [8, 19, 30, 41, 52], 23: [3, 14, 25, 36, 47, 57], 24: [7, 18, 30, 43, 56]
  };
  const SEONYUDO_WEEKEND_TIMETABLE = {
    5: [36, 47, 57], 6: [9, 21, 33, 45, 57], 7: [9, 21, 33, 45, 57], 8: [9, 21, 33, 45, 57],
    9: [9, 21, 32, 42, 53], 10: [4, 15, 26, 37, 48, 59], 11: [10, 21, 32, 43, 54],
    12: [5, 16, 27, 38, 49], 13: [0, 11, 22, 33, 44, 55], 14: [6, 17, 28, 39, 50],
    15: [1, 12, 23, 34, 45, 56], 16: [7, 18, 29, 40, 51], 17: [2, 13, 24, 35, 46, 57],
    18: [8, 19, 30, 41, 52], 19: [3, 14, 25, 36, 47, 58], 20: [9, 20, 31, 42, 53],
    21: [4, 15, 26, 37, 50], 22: [3, 16, 30, 44, 56], 23: [11, 27, 41, 55]
  };

  function mapRouteBadgeClass(typeStr, busNo) {
    const t = String(typeStr || '');
    const n = String(busNo || '');
    if (t.includes('공항') || /^60\d{2}$/.test(n)) return 'badge-airport';
    if (t.includes('마을')) return 'badge-town';
    if (t.includes('광역') || t.includes('직행') || /^9\d{3}$/.test(n)) return 'badge-red';
    if (t.includes('경기') || t.includes('부천') || n.includes('부천') || n.startsWith('70-2')) return 'badge-sky';
    if (t.includes('지선') || /^[1-8]\d{3}$/.test(n)) return 'badge-green';
    if (t.includes('간선') || /^\d{3}$/.test(n)) return 'badge-blue';
    return 'badge-green';
  }

  function buildMergedBusRoutes() {
    const list = [];
    const seen = new Set();

    const preloaded = (typeof window !== 'undefined' && window.BUS_ROUTES_PRELOADED_DB) ? window.BUS_ROUTES_PRELOADED_DB : {};
    Object.keys(preloaded).forEach(key => {
      const item = preloaded[key];
      if (!item || !Array.isArray(item.stops)) return;
      const shortNo = String(item.busNo || key).replace(/\(.*\)$/, '').trim();
      const aliases = [shortNo, String(key).trim(), `${shortNo}번`];
      if (shortNo === '70-2') aliases.push('70-2부천', '부천70-2');
      list.push({
        routeNo: shortNo,
        busRouteId: item.busRouteId || '',
        routeType: item.type ? `${item.type}버스` : '노선버스',
        badgeClass: mapRouteBadgeClass(item.type, shortNo),
        summary: item.desc || '',
        aliases,
        stops: item.stops.map(s => ({
          arsId: String(s.arsId || '').trim(),
          stNm: String(s.name || s.stNm || '').trim(),
          dir: String(s.dir || '운행 방면').trim()
        })).filter(s => s.arsId && s.arsId !== '0' && s.arsId !== '~')
      });
      seen.add(shortNo);
    });

    EXTRA_BUS_ROUTES.forEach(r => {
      if (!seen.has(r.routeNo)) {
        list.push({
          ...r,
          aliases: r.aliases || [r.routeNo, `${r.routeNo}번`]
        });
        seen.add(r.routeNo);
      }
    });

    return list;
  }

  class TransitLookupController {
    constructor() {
      this.busApiKey = '0f40f3c7a3220ef7d0f45825f4364e47d05d10fa087632a03db7c8c2222aae63';
      this.subwayApiKey = '476a79484b6a6f6e3833504f4f6d4e';

      this.busRoutes = buildMergedBusRoutes();
      this.currentType = 'bus';
      this.currentId = '19130';
      this.currentName = 'KBS';
      this.highlightBusNo = '';
      this.lastBusData = null;
      this.lastSubwayData = null;
      this.userInitiatedScroll = false;

      this.filterType = 'all';
      this.sortType = 'arrival';

      this.autoRefreshInterval = 15;
      this.refreshCountdown = 15;
      this.tickerTimer = null;
      this.debounceTimer = null;
      this.isFetching = false;
      this.currentModalRoute = null;

      this.cache = {
        bus: {},
        subway: {},
        dynamicRoute: {}
      };
      window.transitLookupInstance = this;

      this.initDom();
      this.initEvents();
      this.renderQuickChips();
      this.loadDefaultStation();
    }

    loadDefaultStation() {
      this.userInitiatedScroll = false;
      setTimeout(() => {
        this.lookupBusByArs('19130', 'KBS');
      }, 80);
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

      this.inputQuery.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (this.btnClearQuery) {
          this.btnClearQuery.style.display = val ? 'flex' : 'none';
        }

        // 순수 5자리 숫자(또는 19-130 형식) 단독 입력 시 즉시 조회
        if (/^\d{2}-?\d{3}$/.test(val)) {
          const cleanDigits = val.replace(/[^0-9]/g, '');
          this.hideSuggestions();
          this.highlightBusNo = '';
          this.lookupBusByArs(cleanDigits);
          return;
        }

        clearTimeout(this.debounceTimer);
        if (val.length >= 1) {
          this.debounceTimer = setTimeout(() => {
            this.handleAutocomplete(val);
          }, 180);
        } else {
          this.hideSuggestions();
        }
      });

      this.inputQuery.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.executeSearch();
        } else if (e.key === 'Escape') {
          this.hideSuggestions();
        }
      });

      if (this.btnSearch) {
        this.btnSearch.addEventListener('click', () => {
          this.executeSearch();
        });
      }

      if (this.btnClearQuery) {
        this.btnClearQuery.addEventListener('click', () => {
          this.inputQuery.value = '';
          this.btnClearQuery.style.display = 'none';
          this.hideSuggestions();
          this.inputQuery.focus();
        });
      }

      if (this.btnRefresh) {
        this.btnRefresh.addEventListener('click', () => {
          this.refreshCurrent();
        });
      }

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.lookup-search-container')) {
          this.hideSuggestions();
        }
      });
    }

    scrollToResult(smooth = true) {
      setTimeout(() => {
        const target = document.querySelector('.lookup-board-wrap') ||
                       document.getElementById('lookupResultContainer');
        if (target) {
          const rect = target.getBoundingClientRect();
          const targetY = window.pageYOffset + rect.top - 14;
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: smooth ? 'smooth' : 'auto'
          });
        }
      }, 30);
    }

    // ==========================================
    // 버스 노선 매칭 & 실시간 노선 조회
    // ==========================================
    cleanBusToken(raw) {
      return String(raw || '').replace(/번$|버스$/g, '').trim();
    }

    isLikelyBusRouteToken(token) {
      const clean = this.cleanBusToken(token);
      if (!clean) return false;
      // 5자리 정류장 번호는 제외 (단, 5자리 버스번호는 서울에 없음; 4자리 이하 숫자 또는 지역마을/70-2/10부천 등)
      if (/^\d{5}$/.test(clean) || /^\d{2}-\d{3}$/.test(clean)) return false;
      if (/^\d{1,4}(-\d{1,2})?$/.test(clean)) return true;
      if (/^(양천|영등포|마포|강서|구로|관악|동작|서초|종로|용산|성북|서대문|은평)\d{1,2}$/.test(clean)) return true;
      if (/^\d{1,3}(부천|인천|김포|광명|안양|고양)$/.test(clean)) return true;
      if (/^[MNmnGg]\d{3,4}$/.test(clean)) return true;
      return this.busRoutes.some(r => this.routeMatchesExact(r, clean));
    }

    routeMatchesExact(route, q) {
      const clean = this.cleanBusToken(q).toLowerCase();
      if (!clean) return false;
      if (route.routeNo.toLowerCase() === clean) return true;
      return (route.aliases || []).some(a => a.toLowerCase() === clean);
    }

    findRoutesByQuery(q) {
      const clean = this.cleanBusToken(q).toLowerCase();
      if (!clean) return [];
      return this.busRoutes.filter(r => {
        if (this.routeMatchesExact(r, clean)) return true;
        return r.routeNo.toLowerCase().startsWith(clean);
      });
    }

    busItemMatchesHighlight(busRtNm, targetRouteNo) {
      if (!targetRouteNo || !busRtNm) return false;
      const a = String(busRtNm).replace(/\s+/g, '').toLowerCase();
      const b = this.cleanBusToken(targetRouteNo).replace(/\s+/g, '').toLowerCase();
      if (a === b) return true;
      const aDigits = a.replace(/\(.*\)/, '');
      const bDigits = b.replace(/\(.*\)/, '');
      if (aDigits === bDigits) return true;
      // 예: '10부천' vs '10' 또는 '70-2부천' vs '70-2'
      if (a.replace(/부천|경기/g, '') === b.replace(/부천|경기/g, '')) return true;
      return false;
    }

    // [정류장 + 버스번호] 공백/쉼표 구분 복합 검색어 파서
    parseCombinedStopAndRoute(rawVal) {
      const normalized = String(rawVal || '').replace(/[,/·]+/g, ' ').trim();
      const parts = normalized.split(/\s+/).filter(Boolean);
      if (parts.length < 2) return null;

      // 토큰 중 버스번호 후보와 정류장 후보 분리
      for (let i = parts.length - 1; i >= 0; i--) {
        const candidate = parts[i];
        if (this.isLikelyBusRouteToken(candidate)) {
          const otherTokens = parts.filter((_, idx) => idx !== i).join(' ').trim();
          if (otherTokens) {
            return {
              stopQuery: otherTokens,
              routeQuery: this.cleanBusToken(candidate)
            };
          }
        }
      }
      return null;
    }

    // m.bus.go.kr 실시간 버스노선 정류장 동적 조회 (APK 및 직결 환경에서 전국/서울 모든 버스번호 대응)
    async fetchBusRouteDynamic(routeQuery) {
      const cleanNo = this.cleanBusToken(routeQuery);
      if (!cleanNo) return null;
      if (this.cache.dynamicRoute[cleanNo]) return this.cache.dynamicRoute[cleanNo];

      try {
        const listUrl = `http://m.bus.go.kr/mBus/bus/getBusRouteList.bms?strSrch=${encodeURIComponent(cleanNo)}`;
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(listUrl, { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (!res.ok) return null;
        const data = await res.json();
        const list = data && data.resultList;
        if (!Array.isArray(list) || list.length === 0) return null;

        const exact = list.find(it => String(it.busRouteNm || '').trim() === cleanNo)
          || list.find(it => String(it.busRouteNm || '').replace(/\(.*\)/, '').trim() === cleanNo)
          || list[0];
        if (!exact || !exact.busRouteId) return null;

        const posUrl = `http://m.bus.go.kr/mBus/bus/getRouteAndPos.bms?busRouteId=${encodeURIComponent(exact.busRouteId)}`;
        const controller2 = new AbortController();
        const tid2 = setTimeout(() => controller2.abort(), 4000);
        const posRes = await fetch(posUrl, { cache: 'no-store', signal: controller2.signal });
        clearTimeout(tid2);
        if (!posRes.ok) return null;
        const posData = await posRes.json();
        const rawStops = posData && posData.resultList;
        if (!Array.isArray(rawStops) || rawStops.length === 0) return null;

        const typeMap = { '1': '공항버스', '2': '마을버스', '3': '간선버스', '4': '지선버스', '5': '순환버스', '6': '광역버스', '7': '인천버스', '8': '경기버스' };
        const rType = typeMap[String(exact.routeType)] || '노선버스';
        const routeObj = {
          routeNo: String(exact.busRouteNm || cleanNo).trim(),
          busRouteId: String(exact.busRouteId),
          routeType: rType,
          badgeClass: mapRouteBadgeClass(rType, exact.busRouteNm || cleanNo),
          summary: `${exact.stStationNm || ''} ↔ ${exact.edStationNm || ''}`,
          aliases: [cleanNo, String(exact.busRouteNm || '').trim()],
          stops: rawStops
            .filter(s => s.arsId && s.arsId !== '0' && s.arsId !== '~')
            .map(s => ({
              arsId: String(s.arsId).replace(/[^0-9]/g, ''),
              stNm: String(s.stationNm || '').trim(),
              dir: s.sectNm ? String(s.sectNm).trim() : (s.direction ? `${s.direction} 방면` : '운행 방면')
            }))
            .filter(s => s.arsId.length === 5)
        };

        this.cache.dynamicRoute[cleanNo] = routeObj;
        if (!this.busRoutes.some(r => r.routeNo === routeObj.routeNo)) {
          this.busRoutes.push(routeObj);
        }
        return routeObj;
      } catch (e) {
        return null;
      }
    }

    // ==========================================
    // 버스 노선 전체 정류장 모달 (정류장 즉시 필터 포함)
    // ==========================================
    ensureBusRouteModal() {
      if (document.getElementById('modalBusRouteStops')) return;

      const modalHtml = `
        <div class="modal-overlay modal-bus-route-overlay" id="modalBusRouteStops" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.76); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); z-index:100000; justify-content:center; align-items:center; padding:12px;">
          <div class="modal-container bus-route-stops-modal" style="background:#ffffff; width:100%; max-width:480px; max-height:86vh; border-radius:22px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.45); display:flex; flex-direction:column; overflow:hidden; border:1px solid #cbd5e1;">
            <div class="modal-header" style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color:#ffffff; padding:15px 16px; display:flex; justify-content:space-between; align-items:center;">
              <div style="min-width:0; flex:1;">
                <h4 id="modalBusRouteTitle" style="font-size:17px; font-weight:900; margin:0; display:flex; align-items:center; gap:8px; flex-wrap:wrap;"></h4>
                <p id="modalBusRouteSummary" style="font-size:12.5px; color:#cbd5e1; margin:4px 0 0 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></p>
              </div>
              <button type="button" class="modal-close-btn" onclick="window.transitLookupInstance.closeBusRouteModal()" style="background:rgba(255,255,255,0.16); border:none; color:#ffffff; font-size:17px; width:34px; height:34px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;">✕</button>
            </div>

            <div style="padding:10px 14px; background:#f1f5f9; border-bottom:1px solid #e2e8f0; display:flex; flex-direction:column; gap:7px;">
              <div style="font-size:12.5px; color:#334155; font-weight:800;">
                💡 탑승할 정류장을 누르면 해당 정류장의 실시간 버스 도착정보가 열립니다.
              </div>
              <input type="text" id="inputRouteStopFilter" placeholder="정류장 이름 또는 5자리 번호로 빠른 필터 (예: KBS, 여의도, 19130)"
                     style="width:100%; height:40px; padding:0 12px; border-radius:10px; border:1.5px solid #cbd5e1; font-size:14.5px; font-weight:700; color:#0f172a; background:#ffffff; box-sizing:border-box;">
            </div>

            <div class="modal-body" id="modalBusRouteStopsList" style="padding:12px 14px; overflow-y:auto; flex:1; max-height:54vh; display:flex; flex-direction:column; gap:8px; background:#f8fafc;">
            </div>

            <div class="modal-footer" style="padding:11px 16px; background:#ffffff; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12px; color:#64748b; font-weight:700;">서울시 TOPIS 실시간 도착 연동</span>
              <button type="button" class="btn-primary" onclick="window.transitLookupInstance.closeBusRouteModal()" style="background:#0284c7; color:#ffffff; border:none; padding:8px 20px; border-radius:10px; font-weight:800; font-size:14px; cursor:pointer;">닫기</button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);

      const modalEl = document.getElementById('modalBusRouteStops');
      if (modalEl) {
        modalEl.addEventListener('click', (e) => {
          if (e.target === modalEl) this.closeBusRouteModal();
        });
      }

      const filterInput = document.getElementById('inputRouteStopFilter');
      if (filterInput) {
        filterInput.addEventListener('input', (e) => {
          this.renderModalStopsList(e.target.value.trim());
        });
      }
    }

    renderModalStopsList(filterKeyword = '') {
      const stopsContainer = document.getElementById('modalBusRouteStopsList');
      const route = this.currentModalRoute;
      if (!stopsContainer || !route) return;

      const kw = String(filterKeyword || '').toLowerCase();
      const filteredStops = kw
        ? route.stops.filter(s => s.stNm.toLowerCase().includes(kw) || s.arsId.includes(kw) || (s.dir || '').toLowerCase().includes(kw))
        : route.stops;

      if (filteredStops.length === 0) {
        stopsContainer.innerHTML = `<div style="padding:24px 12px; text-align:center; color:#64748b; font-size:14px; font-weight:700;">'${this.escapeHtml(filterKeyword)}' 조건에 맞는 경유 정류장이 없습니다.</div>`;
        return;
      }

      stopsContainer.innerHTML = filteredStops.map((stop, idx) => {
        const isYeouidoFav = stop.arsId === '19130' || stop.arsId === '19132' || stop.arsId === '19133' || stop.arsId === '19007' || stop.arsId === '19008' || stop.arsId === '19156';
        return `
          <div class="route-stop-timeline-item ${isYeouidoFav ? 'stop-highlight' : ''}"
               onclick="window.transitLookupInstance.selectStopFromModal('${stop.arsId}', '${this.escapeHtml(stop.stNm)}', '${this.escapeHtml(route.routeNo)}')">
            <div class="stop-node-wrap">
              <span class="stop-node-seq">${idx + 1}</span>
            </div>
            <div class="stop-info-body">
              <div class="stop-name-row">
                <strong class="stop-name">${this.escapeHtml(stop.stNm)}</strong>
                <span class="stop-ars-pill">ARS ${stop.arsId}</span>
              </div>
              <div class="stop-dir-row">
                <span class="stop-dir-tag">${this.escapeHtml(stop.dir || '운행 방면')} 방면</span>
                <span class="stop-action-btn">${this.escapeHtml(route.routeNo)}번 도착보기 ➔</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    async openBusRouteModal(routeNo, initialStopFilter = '') {
      const cleanNo = this.cleanBusToken(routeNo);
      let route = this.busRoutes.find(r => this.routeMatchesExact(r, cleanNo));
      if (!route) {
        this.showLoading(`🚍 [${cleanNo}번] 버스 노선 및 경유 정류장 조회 중...`);
        route = await this.fetchBusRouteDynamic(cleanNo);
      }
      if (!route) {
        this.searchByNameAndShowResults(routeNo);
        return;
      }

      this.currentModalRoute = route;
      this.ensureBusRouteModal();
      const modal = document.getElementById('modalBusRouteStops');
      if (!modal) return;

      const headerTitle = document.getElementById('modalBusRouteTitle');
      const headerSummary = document.getElementById('modalBusRouteSummary');
      const filterInput = document.getElementById('inputRouteStopFilter');

      if (headerTitle) {
        headerTitle.innerHTML = `<span class="modal-bus-route-badge ${route.badgeClass}">${this.escapeHtml(route.routeNo)}번</span> ${this.escapeHtml(route.routeType)} 정류장 선택`;
      }
      if (headerSummary) {
        headerSummary.textContent = `${route.summary} (총 ${route.stops.length}개 정류소)`;
      }
      if (filterInput) {
        filterInput.value = initialStopFilter || '';
      }

      this.renderModalStopsList(initialStopFilter || '');

      modal.style.display = 'flex';
      modal.classList.add('active');
    }

    closeBusRouteModal() {
      const modal = document.getElementById('modalBusRouteStops');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    }

    selectStopFromModal(arsId, stNm, routeNo = '') {
      this.closeBusRouteModal();
      this.userInitiatedScroll = true;
      this.highlightBusNo = routeNo || '';
      setTimeout(() => {
        this.lookupBusByArs(arsId, stNm, routeNo || '');
        this.scrollToResult();
      }, 40);
    }

    // ==========================================
    // 통합 검색 실행 라우터 (정류장 / 버스번호 / 정류장+버스번호 / 지하철역)
    // ==========================================
    async executeSearch() {
      const val = this.inputQuery.value.trim();
      if (!val) {
        this.inputQuery.focus();
        return;
      }

      this.userInitiatedScroll = true;
      this.hideSuggestions();

      // 1. [정류장 + 버스번호] 복합 검색어 처리 (예: "19130 162", "KBS 5618", "여의도환승센터 260")
      const combined = this.parseCombinedStopAndRoute(val);
      if (combined) {
        await this.executeCombinedStopAndRouteSearch(combined.stopQuery, combined.routeQuery);
        return;
      }

      // 2. 순수 5자리 정류장 번호 (예: "19130", "19-130")
      if (/^\d{2}-?\d{3}$/.test(val)) {
        const cleanDigits = val.replace(/[^0-9]/g, '');
        this.highlightBusNo = '';
        await this.lookupBusByArs(cleanDigits);
        this.scrollToResult();
        return;
      }

      // 3. 버스 노선번호 단독 매칭 (예: "162", "5618", "70-2", "10부천", "603번")
      const cleanRouteCandidate = this.cleanBusToken(val);
      const exactRoute = this.busRoutes.find(r => this.routeMatchesExact(r, cleanRouteCandidate));
      if (exactRoute) {
        await this.openBusRouteModal(exactRoute.routeNo);
        return;
      }
      if (this.isLikelyBusRouteToken(val)) {
        const dynamicRoute = await this.fetchBusRouteDynamic(cleanRouteCandidate);
        if (dynamicRoute) {
          await this.openBusRouteModal(dynamicRoute.routeNo);
          return;
        }
      }

      // 4. 지하철역 단독 정확 매칭 (예: "국회의사당역", "여의도역", "당산")
      const cleanSubwayName = val.replace(/역$/, '').trim();
      const exactSubway = SUBWAY_STATIONS.find(s => s.name === cleanSubwayName || s.name === val);
      if (exactSubway && (val.endsWith('역') || val === exactSubway.name)) {
        // 단, 'KBS'처럼 버스정류장 전용 키워드가 아닌 지하철역인 경우
        await this.lookupSubway(exactSubway.name);
        this.scrollToResult();
        return;
      }

      // 5. 정류소명 / 키워드 통합 검색
      await this.searchByNameAndShowResults(val);
    }

    async executeCombinedStopAndRouteSearch(stopQuery, routeQuery) {
      const cleanRoute = this.cleanBusToken(routeQuery);
      const stopDigits = stopQuery.replace(/[^0-9]/g, '');

      // 정류장 파트가 5자리 ARS 번호인 경우 즉시 해당 정류장 + 버스번호 하이라이트 조회!
      if (/^\d{2}-?\d{3}$/.test(stopQuery) && stopDigits.length === 5) {
        this.highlightBusNo = cleanRoute;
        await this.lookupBusByArs(stopDigits, '', cleanRoute);
        this.scrollToResult();
        return;
      }

      this.showLoading(`🚏 '${stopQuery}' 정류장의 [${cleanRoute}번] 버스 실시간 도착정보 검색 중...`);
      this.scrollToResult();

      // 1) 노선 DB(내장 + 동적)에서 해당 정류장명을 포함하는 경유 정류소 탐색
      let route = this.busRoutes.find(r => this.routeMatchesExact(r, cleanRoute));
      if (!route) {
        route = await this.fetchBusRouteDynamic(cleanRoute);
      }

      const stopKw = stopQuery.replace(/정류장$|정류소$/g, '').trim().toLowerCase();
      let candidateStops = [];

      if (route && Array.isArray(route.stops)) {
        candidateStops = route.stops.filter(s =>
          s.stNm.toLowerCase().includes(stopKw) || stopKw.includes(s.stNm.toLowerCase()) || s.arsId.includes(stopKw)
        );
      }

      // 2) 노선 DB에 없거나 못 찾았으면 로컬/TOPIS 정류소 검색 후 실제 도착정보에 해당 노선이 있는지 확인
      if (candidateStops.length === 0) {
        const localHits = LOCAL_POPULAR_STATIONS.filter(p =>
          p.stNm.toLowerCase().includes(stopKw) || p.keywords.some(k => k.toLowerCase().includes(stopKw))
        );
        const onlineHits = await this.fetchStationsByName(stopKw);
        const merged = [...localHits];
        (onlineHits || []).forEach(ob => {
          if (ob.arsId && ob.arsId !== '0' && !merged.some(m => m.arsId === ob.arsId)) {
            merged.push({ arsId: String(ob.arsId).replace(/[^0-9]/g, ''), stNm: ob.stNm });
          }
        });

        // 상위 5개 정류소에 대해 병렬로 도착정보를 조회해 cleanRoute 버스가 정차하는 정류소 필터링
        const probeTargets = merged.slice(0, 5);
        const probed = await Promise.all(probeTargets.map(async (st) => {
          const items = await this.fetchBusArrivalByUid(st.arsId);
          const matchedBus = (items || []).find(b => this.busItemMatchesHighlight(b.rtNm, cleanRoute));
          if (matchedBus) {
            return {
              arsId: st.arsId,
              stNm: st.stNm,
              dir: matchedBus.adirection || matchedBus.nxtStn || '운행 방면',
              items
            };
          }
          return null;
        }));
        candidateStops = probed.filter(Boolean);
      }

      if (candidateStops.length === 1) {
        const target = candidateStops[0];
        this.highlightBusNo = cleanRoute;
        await this.lookupBusByArs(target.arsId, target.stNm, cleanRoute);
        return;
      }

      if (candidateStops.length > 1) {
        // 상·하행 등 여러 정류장이 매칭된 경우 방향 선택 리스트 노출 (클릭 즉시 해당 버스 우선 표시)
        this.renderCombinedStopChoices(stopQuery, cleanRoute, candidateStops);
        return;
      }

      // 못 찾은 경우 노선 모달이 있으면 필터와 함께 열어주거나 일반 검색으로 전환
      if (route) {
        await this.openBusRouteModal(route.routeNo, stopKw);
      } else {
        await this.searchByNameAndShowResults(`${stopQuery}`);
      }
    }

    renderCombinedStopChoices(stopQuery, routeNo, stops) {
      if (!this.resultContainer) return;
      const cards = stops.slice(0, 10).map(st => {
        const formattedArs = this.formatArsId(st.arsId);
        return `
          <button type="button" class="search-item-card card-bus-type" data-ars="${st.arsId}" data-name="${this.escapeHtml(st.stNm)}" data-route="${this.escapeHtml(routeNo)}">
            <div class="card-left">
              <span class="card-type-badge badge-bus">🚍 ${this.escapeHtml(routeNo)}번 정차</span>
              <div class="card-title-group">
                <span class="card-title"><strong>${this.escapeHtml(st.stNm)}</strong></span>
                <span class="card-ars-label">ARS ${formattedArs} · ${this.escapeHtml(st.dir || '운행 방면')} 방면</span>
              </div>
            </div>
            <div class="card-right">
              <span class="station-ars-badge station-ars-badge-blue">${st.arsId}</span>
              <span class="card-arrow">›</span>
            </div>
          </button>
        `;
      }).join('');

      this.resultContainer.innerHTML = `
        <div class="lookup-board-wrap">
          <div class="lookup-board-header search-results-header">
            <div class="station-meta-info">
              <div class="station-name-row">
                <span class="station-icon">🎯</span>
                <h4 class="station-title">'${this.escapeHtml(stopQuery)}' · ${this.escapeHtml(routeNo)}번 정차 정류소</h4>
                <span class="station-ars-badge station-ars-badge-blue">${stops.length}곳</span>
              </div>
              <p class="search-result-desc">원하시는 진행 방향의 정류장을 선택하면 <strong>${this.escapeHtml(routeNo)}번</strong> 실시간 도착정보가 최상단에 표시됩니다.</p>
            </div>
          </div>
          <div class="search-results-grid">${cards}</div>
        </div>
      `;

      this.resultContainer.querySelectorAll('.search-item-card').forEach(btn => {
        btn.addEventListener('click', () => {
          this.userInitiatedScroll = true;
          const ars = btn.getAttribute('data-ars');
          const nm = btn.getAttribute('data-name');
          const rt = btn.getAttribute('data-route');
          this.highlightBusNo = rt || '';
          this.lookupBusByArs(ars, nm, rt || '');
          this.scrollToResult();
        });
      });
    }

    async searchByNameAndShowResults(query) {
      this.showLoading(`'${query}' 관련 정류장, 버스 노선 및 지하철역 검색 중...`);
      this.scrollToResult();

      try {
        const cleanQuery = query.trim();
        const lowerQuery = cleanQuery.toLowerCase();
        const cleanSubway = cleanQuery.replace(/역$/, '').trim();

        const matchedRoutes = this.findRoutesByQuery(cleanQuery);
        const subwayMatches = SUBWAY_STATIONS.filter(s =>
          s.name.includes(cleanSubway) || (cleanSubway.length >= 2 && cleanSubway.includes(s.name))
        );

        const localMatches = LOCAL_POPULAR_STATIONS.filter(p =>
          p.keywords.some(k => k.toLowerCase().includes(lowerQuery) || lowerQuery.includes(k.toLowerCase())) ||
          p.stNm.toLowerCase().includes(lowerQuery) || p.arsId.includes(cleanQuery)
        );

        let onlineBusMatches = [];
        try {
          const fetched = await this.fetchStationsByName(cleanQuery);
          if (Array.isArray(fetched)) {
            onlineBusMatches = fetched.filter(b => b.arsId && b.arsId !== '0');
          }
        } catch (e) {}

        const mergedBusList = [...localMatches];
        onlineBusMatches.forEach(ob => {
          const cleanArs = String(ob.arsId).replace(/[^0-9]/g, '');
          if (cleanArs && !mergedBusList.some(m => m.arsId === cleanArs)) {
            mergedBusList.push({ arsId: cleanArs, stNm: ob.stNm });
          }
        });

        const totalResultsCount = matchedRoutes.length + subwayMatches.length + mergedBusList.length;
        if (totalResultsCount === 0) {
          this.showError(`'${query}'에 해당하는 정류장, 버스번호 또는 지하철역을 찾지 못했습니다. (예: 19130, KBS 162, 5618, 여의도역)`);
          return;
        }

        if (subwayMatches.length === 1 && mergedBusList.length === 0 && matchedRoutes.length === 0) {
          await this.lookupSubway(subwayMatches[0].name);
          this.scrollToResult();
          return;
        }
        if (subwayMatches.length === 0 && mergedBusList.length === 1 && matchedRoutes.length === 0) {
          const single = mergedBusList[0];
          this.highlightBusNo = '';
          await this.lookupBusByArs(single.arsId, single.stNm);
          this.scrollToResult();
          return;
        }

        this.renderSearchResultsList(query, subwayMatches, mergedBusList.slice(0, 20), matchedRoutes.slice(0, 8));
        this.scrollToResult();
      } catch (err) {
        this.showError('검색 중 오류가 발생했습니다: ' + err.message);
      }
    }

    renderSearchResultsList(query, subways, busStations, matchedRoutes = []) {
      if (!this.resultContainer) return;
      const totalCount = matchedRoutes.length + subways.length + busStations.length;

      let html = `
        <div class="lookup-board-wrap">
          <div class="lookup-board-header search-results-header">
            <div class="station-meta-info">
              <div class="station-name-row">
                <span class="station-icon">🔍</span>
                <h4 class="station-title">'${this.escapeHtml(query)}' 검색 결과</h4>
                <span class="station-ars-badge station-ars-badge-blue">${totalCount}건</span>
              </div>
              <p class="search-result-desc">확인할 버스 노선, 정류소 또는 지하철역을 누르면 실시간 도착정보가 표시됩니다.</p>
            </div>
          </div>
          <div class="search-results-grid">
      `;

      matchedRoutes.forEach(r => {
        html += `
          <div class="search-item-card card-route-highlight" style="cursor:pointer;" onclick="window.transitLookupInstance.openBusRouteModal('${this.escapeHtml(r.routeNo)}')">
            <div class="card-left">
              <span class="card-type-badge ${r.badgeClass}">🚍 ${this.escapeHtml(r.routeNo)}번</span>
              <div class="card-title-group">
                <span class="card-title"><strong>${this.escapeHtml(r.routeNo)}번 ${this.escapeHtml(r.routeType)}</strong></span>
                <span class="badge-sub-highlight">${this.escapeHtml(r.summary)}</span>
              </div>
            </div>
            <div class="card-right">
              <button type="button" class="btn-primary" style="background:#0284c7; color:#fff; border:none; padding:5px 11px; border-radius:8px; font-size:12px; font-weight:800; pointer-events:none;">정류장 선택 ➔</button>
            </div>
          </div>
        `;
      });

      subways.forEach(s => {
        const lineBadges = s.lines.map(line => `<span class="badge-subway-line badge-${this.getSubwayLineClass(line)}">${line}</span>`).join(' ');
        html += `
          <button type="button" class="search-item-card card-subway-type" data-type="subway" data-name="${this.escapeHtml(s.name)}">
            <div class="card-left">
              <span class="card-type-badge badge-subway">🚇 지하철</span>
              <div class="card-title-group">
                <span class="card-title"><strong>${this.escapeHtml(s.name)}역</strong></span>
              </div>
            </div>
            <div class="card-right">
              ${lineBadges}
              <span class="card-arrow">›</span>
            </div>
          </button>
        `;
      });

      busStations.forEach(b => {
        const formattedArs = this.formatArsId(b.arsId);
        html += `
          <button type="button" class="search-item-card card-bus-type" data-type="bus" data-ars="${b.arsId}" data-name="${this.escapeHtml(b.stNm)}">
            <div class="card-left">
              <span class="card-type-badge badge-bus">🚏 정류소</span>
              <div class="card-title-group">
                <span class="card-title">${this.escapeHtml(b.stNm)}</span>
                <span class="card-ars-label">ARS ${formattedArs}</span>
              </div>
            </div>
            <div class="card-right">
              <span class="station-ars-badge station-ars-badge-blue">${b.arsId}</span>
              <span class="card-arrow">›</span>
            </div>
          </button>
        `;
      });

      html += `</div></div>`;
      this.resultContainer.innerHTML = html;

      this.resultContainer.querySelectorAll('.search-item-card[data-type]').forEach(card => {
        card.addEventListener('click', () => {
          this.userInitiatedScroll = true;
          const type = card.getAttribute('data-type');
          if (type === 'subway') {
            const name = card.getAttribute('data-name');
            this.inputQuery.value = name + '역';
            this.lookupSubway(name);
          } else if (type === 'bus') {
            const ars = card.getAttribute('data-ars');
            const name = card.getAttribute('data-name');
            this.inputQuery.value = ars;
            this.highlightBusNo = '';
            this.lookupBusByArs(ars, name);
          }
          this.scrollToResult();
        });
      });
    }

    // ==========================================
    // 실시간 자동완성 드롭다운
    // ==========================================
    async handleAutocomplete(query) {
      if (!this.dropdown) return;
      const cleanQuery = query.trim();
      const lowerQuery = cleanQuery.toLowerCase();

      // 복합 입력 (예: "KBS 162", "19130 5618") 시 안내 아이템 최상단 제공
      const combined = this.parseCombinedStopAndRoute(cleanQuery);
      if (combined) {
        this.dropdown.innerHTML = `
          <div class="suggestion-group-title">🎯 정류장 + 버스번호 동시 조회</div>
          <div class="suggestion-item suggestion-route" id="suggCombinedDirect">
            <div class="sugg-left">
              <span class="sugg-icon">🚍</span>
              <div class="sugg-subway-info">
                <span class="sugg-name"><strong>[${this.escapeHtml(combined.stopQuery)}] 정류장의 ${this.escapeHtml(combined.routeQuery)}번 버스</strong></span>
                <span class="sugg-tag-highlight">누르면 해당 정류장의 ${this.escapeHtml(combined.routeQuery)}번 실시간 도착정보로 직행합니다</span>
              </div>
            </div>
            <div class="sugg-right"><span class="bus-badge badge-blue">실시간 조회</span></div>
          </div>
        `;
        this.dropdown.style.display = 'block';
        const btn = document.getElementById('suggCombinedDirect');
        if (btn) {
          btn.addEventListener('click', () => {
            this.hideSuggestions();
            this.userInitiatedScroll = true;
            this.executeCombinedStopAndRouteSearch(combined.stopQuery, combined.routeQuery);
          });
        }
        return;
      }

      const cleanSubway = cleanQuery.replace(/역$/, '').trim();
      const matchedRoutes = this.findRoutesByQuery(cleanQuery).slice(0, 5);
      const subways = SUBWAY_STATIONS.filter(s =>
        s.name.includes(cleanSubway) || (cleanSubway.length >= 2 && cleanSubway.includes(s.name))
      ).slice(0, 4);

      const localMatches = LOCAL_POPULAR_STATIONS.filter(p =>
        p.keywords.some(k => k.toLowerCase().includes(lowerQuery) || lowerQuery.includes(k.toLowerCase())) ||
        p.stNm.toLowerCase().includes(lowerQuery) || p.arsId.includes(cleanQuery)
      );

      let onlineBusStations = [];
      if (!/^\d+$/.test(cleanQuery) || cleanQuery.length >= 4) {
        try {
          const fetched = await this.fetchStationsByName(cleanQuery);
          if (Array.isArray(fetched)) {
            onlineBusStations = fetched.filter(b => b.arsId && b.arsId !== '0');
          }
        } catch (e) {}
      }

      const mergedBuses = [...localMatches];
      onlineBusStations.forEach(ob => {
        const cleanArs = String(ob.arsId).replace(/[^0-9]/g, '');
        if (cleanArs && !mergedBuses.some(m => m.arsId === cleanArs)) {
          mergedBuses.push({ arsId: cleanArs, stNm: ob.stNm });
        }
      });
      const displayBuses = mergedBuses.slice(0, 7);

      if (matchedRoutes.length === 0 && subways.length === 0 && displayBuses.length === 0) {
        this.hideSuggestions();
        return;
      }

      let html = '';
      if (matchedRoutes.length > 0) {
        html += `<div class="suggestion-group-title">🚍 버스 노선 (${matchedRoutes.length})</div>`;
        matchedRoutes.forEach(r => {
          html += `
            <div class="suggestion-item suggestion-route" data-type="route" data-route="${this.escapeHtml(r.routeNo)}">
              <div class="sugg-left">
                <span class="sugg-icon">🚍</span>
                <div class="sugg-subway-info">
                  <span class="sugg-name"><strong>${this.escapeHtml(r.routeNo)}번 버스</strong></span>
                  <span class="sugg-tag-highlight">${this.escapeHtml(r.summary)}</span>
                </div>
              </div>
              <div class="sugg-right"><span class="bus-badge ${r.badgeClass}">${this.escapeHtml(r.routeType)}</span></div>
            </div>
          `;
        });
      }

      if (subways.length > 0) {
        html += `<div class="suggestion-group-title">🚇 지하철역 (${subways.length})</div>`;
        subways.forEach(s => {
          const lineBadges = s.lines.map(line => `<span class="badge-subway-line badge-${this.getSubwayLineClass(line)}">${line}</span>`).join(' ');
          html += `
            <div class="suggestion-item suggestion-subway" data-type="subway" data-name="${this.escapeHtml(s.name)}">
              <div class="sugg-left">
                <span class="sugg-icon">🚇</span>
                <div class="sugg-subway-info">
                  <span class="sugg-name"><strong>${this.escapeHtml(s.name)}역</strong></span>
                </div>
              </div>
              <div class="sugg-right">${lineBadges}</div>
            </div>
          `;
        });
      }

      if (displayBuses.length > 0) {
        html += `<div class="suggestion-group-title">🚏 버스 정류소 (${displayBuses.length})</div>`;
        displayBuses.forEach(b => {
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
              <div class="sugg-right"><span class="sugg-badge-ars">${b.arsId}</span></div>
            </div>
          `;
        });
      }

      this.dropdown.innerHTML = html;
      this.dropdown.style.display = 'block';

      this.dropdown.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          this.userInitiatedScroll = true;
          const type = item.getAttribute('data-type');
          if (type === 'route') {
            const routeNo = item.getAttribute('data-route');
            this.inputQuery.value = routeNo;
            this.hideSuggestions();
            this.openBusRouteModal(routeNo);
            return;
          } else if (type === 'subway') {
            const name = item.getAttribute('data-name');
            this.inputQuery.value = name + '역';
            this.hideSuggestions();
            this.lookupSubway(name);
          } else if (type === 'bus') {
            const ars = item.getAttribute('data-ars');
            const name = item.getAttribute('data-name');
            this.inputQuery.value = ars;
            this.hideSuggestions();
            this.highlightBusNo = '';
            this.lookupBusByArs(ars, name);
          }
          this.scrollToResult();
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
    // 버스 정류장 실시간 도착정보 조회
    // ==========================================
    async lookupBusByArs(arsId, customName = '', highlightRoute = undefined) {
      const cleanArs = String(arsId).replace(/[^0-9]/g, '');
      if (cleanArs.length !== 5) {
        this.showError('올바른 5자리 정류장 번호를 입력해 주세요 (예: 19130)');
        return;
      }

      if (highlightRoute !== undefined) {
        this.highlightBusNo = highlightRoute;
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

        const matchedLocal = LOCAL_POPULAR_STATIONS.find(s => s.arsId === cleanArs);
        const resolvedName = customName || (busItems[0] && busItems[0].stNm) || (matchedLocal && matchedLocal.stNm) || `정류소 (${this.formatArsId(cleanArs)})`;
        this.currentName = resolvedName;

        this.saveRecentHistory('bus', cleanArs, resolvedName);
        this.renderQuickChips();
        this.renderBusBoard(cleanArs, resolvedName, busItems);
        this.startTicker();
      } catch (err) {
        this.showError(`버스 도착 정보를 불러오지 못했습니다: ${err.message}`);
      }
    }

    // ==========================================
    // 지하철역 실시간 도착정보 조회
    // ==========================================
    async lookupSubway(stationName) {
      const cleanName = stationName.replace(/역$/, '').trim();
      if (!cleanName) return;

      this.currentType = 'subway';
      this.currentId = cleanName;
      this.currentName = cleanName + '역';
      this.refreshCountdown = this.autoRefreshInterval;

      if (cleanName === '선유도') {
        this.saveRecentHistory('subway', cleanName, '선유도역');
        this.renderQuickChips();
        this.renderSubwayBoard(cleanName, this.lastSubwayData || []);
        this.startTicker();
      } else {
        this.showLoading(`🚇 [${cleanName}역] 실시간 열차 운행정보 수신 중...`);
      }

      try {
        const arrivals = await this.fetchSubwayRealtime(cleanName);
        this.lastSubwayData = arrivals;

        if ((!arrivals || arrivals.length === 0) && cleanName !== '선유도') {
          this.showEmptySubway(cleanName);
          return;
        }

        this.saveRecentHistory('subway', cleanName, cleanName + '역');
        this.renderQuickChips();
        this.renderSubwayBoard(cleanName, arrivals || []);
        this.startTicker();
      } catch (err) {
        if (cleanName === '선유도') {
          this.renderSubwayBoard(cleanName, this.lastSubwayData || []);
          this.startTicker();
        } else {
          this.showError(`지하철 도착 정보를 불러오지 못했습니다: ${err.message}`);
        }
      }
    }

    isWeekendOrHoliday(date = new Date()) {
      if (typeof window !== 'undefined' && window.transitManager && typeof window.transitManager.isWeekendOrHoliday === 'function') {
        return window.transitManager.isWeekendOrHoliday(date);
      }
      const day = date.getDay();
      if (day === 0 || day === 6) return true;
      const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return ['01-01', '03-01', '05-05', '06-06', '08-15', '10-03', '10-09', '12-25'].includes(md);
    }

    getSeonyudoUpcomingTrains(now = new Date(), count = 2) {
      const isHoliday = this.isWeekendOrHoliday(now);
      const schedule = isHoliday ? SEONYUDO_WEEKEND_TIMETABLE : SEONYUDO_WEEKDAY_TIMETABLE;
      const rawH = now.getHours();
      const currentH = (rawH === 0) ? 24 : rawH;
      const currentMinutes = currentH * 60 + now.getMinutes();
      const currentSec = now.getSeconds();
      const nowMs = now.getTime();
      const results = [];
      const hours = Object.keys(schedule).map(Number).sort((a, b) => a - b);

      for (const h of hours) {
        for (const m of schedule[h]) {
          const diffSec = (h * 60 + m - currentMinutes) * 60 - currentSec;
          if (diffSec >= -30) {
            const displayH = (h === 24) ? '00' : String(h).padStart(2, '0');
            const displayM = String(m).padStart(2, '0');
            results.push({
              departureTime: `${displayH}:${displayM}`,
              endStationName: '중앙보훈병원',
              sec: Math.max(0, diffSec),
              targetTime: nowMs + Math.max(0, diffSec) * 1000
            });
            if (results.length >= count) break;
          }
        }
        if (results.length >= count) break;
      }
      return results;
    }

    // ==========================================
    // 실시간 갱신 & 1초 카운트다운 티커
    // ==========================================
    refreshCurrent() {
      this.userInitiatedScroll = false;
      if (this.btnRefresh) this.btnRefresh.classList.add('spinning');
      const finish = () => {
        if (this.btnRefresh) {
          setTimeout(() => this.btnRefresh.classList.remove('spinning'), 500);
        }
      };

      if (this.currentType === 'bus' && this.currentId) {
        this.lookupBusByArs(this.currentId, this.currentName, this.highlightBusNo).finally(finish);
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

    tickCountdowns() {
      const now = Date.now();
      const liveEls = document.querySelectorAll('#lookupResultContainer .live-bus-sec');
      liveEls.forEach(el => {
        const targetTime = parseInt(el.getAttribute('data-target-time'), 10);
        if (!targetTime || isNaN(targetTime)) return;
        const remainSec = Math.max(0, Math.floor((targetTime - now) / 1000));
        const catchClass = (remainSec >= 300) ? 'transit-catchable' : 'transit-uncatchable';
        if (remainSec <= 0) {
          el.innerHTML = `<span class="tag-arrive-now transit-uncatchable">⚡ 곧 도착</span>`;
        } else if (remainSec < 60) {
          el.innerHTML = `<span class="tag-arrive-imminent ${catchClass}">${remainSec}초 후</span>`;
        } else {
          const m = Math.floor(remainSec / 60);
          const s = remainSec % 60;
          const sStr = s < 10 ? '0' + s : s;
          el.innerHTML = `<span class="${catchClass}"><span class="transit-time-min">${m}분</span> <span class="transit-time-sec">${sStr}초 후</span></span>`;
        }
      });

      if (this.refreshCountdown > 0) this.refreshCountdown--;
      const countdownEl = document.getElementById('lookupAutoRefreshCountdown');
      if (countdownEl) countdownEl.textContent = `${this.refreshCountdown}초`;

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
      } catch (e) {} finally {
        this.isFetching = false;
      }
    }

    // ==========================================
    // 렌더링: 버스 도착 전광판 (모든 정류장 범용 + 검색 노선 하이라이트)
    // ==========================================
    renderBusBoard(arsId, stationName, busList) {
      if (!this.resultContainer) return;

      const formattedArs = this.formatArsId(arsId);
      const cleanArsKey = String(arsId || '').replace(/[^0-9]/g, '');
      const nowMs = Date.now();
      const targetHighlight = this.highlightBusNo || '';
      const hiddenRouteSet = new Set(this.getHiddenBusRoutesForStop(cleanArsKey));
      const hiddenRouteCount = busList.filter(b => hiddenRouteSet.has(String(b.rtNm || '').trim())).length;

      let filtered = busList.filter(b => !hiddenRouteSet.has(String(b.rtNm || '').trim()));
      if (this.filterType === 'town') {
        filtered = filtered.filter(b => String(b.routeType) === '2' || (b.rtNm && /(마을|양천|영등포|마포|강서|구로|관악|동작)/.test(b.rtNm)));
      } else if (this.filterType === 'blue') {
        filtered = filtered.filter(b => String(b.routeType) === '3' || this.getBusBadgeClass(b.routeType, b.rtNm) === 'badge-blue');
      } else if (this.filterType === 'green') {
        filtered = filtered.filter(b => String(b.routeType) === '4' || this.getBusBadgeClass(b.routeType, b.rtNm) === 'badge-green');
      } else if (this.filterType === 'red') {
        filtered = filtered.filter(b => String(b.routeType) === '6' || this.getBusBadgeClass(b.routeType, b.rtNm) === 'badge-red' || this.getBusBadgeClass(b.routeType, b.rtNm) === 'badge-sky');
      }

      filtered.sort((a, b) => {
        if (targetHighlight) {
          const hA = this.busItemMatchesHighlight(a.rtNm, targetHighlight) ? 0 : 1;
          const hB = this.busItemMatchesHighlight(b.rtNm, targetHighlight) ? 0 : 1;
          if (hA !== hB) return hA - hB;
        }
        if (this.sortType === 'arrival') {
          const tA = parseInt(a.traTime1, 10) || 999999;
          const tB = parseInt(b.traTime1, 10) || 999999;
          return tA - tB;
        }
        return (a.rtNm || '').localeCompare(b.rtNm || '', undefined, { numeric: true });
      });

      let cardsHtml = '';
      if (filtered.length === 0) {
        cardsHtml = hiddenRouteCount > 0
          ? `<div class="lookup-no-results" style="display:flex; flex-direction:column; align-items:center; gap:10px; padding:18px 12px;">
               <span>표시할 버스가 없습니다 (${hiddenRouteCount}개 노선 숨김 상태).</span>
               <button type="button" class="btn-show-all-pill has-hidden" id="btnRestoreHiddenBusInline">📋 전체조회 (모든 버스노선 다시 보기)</button>
             </div>`
          : `<div class="lookup-no-results"><span>선택한 필터에 해당하는 운행 버스가 없습니다.</span></div>`;
      } else {
        cardsHtml = filtered.map(bus => {
          const isHighlighted = targetHighlight && this.busItemMatchesHighlight(bus.rtNm, targetHighlight);
          const badgeClass = this.getBusBadgeClass(bus.routeType, bus.rtNm);
          const routeTypeMap = { '1': '공항버스', '2': '마을버스', '3': '간선버스', '4': '지선버스', '5': '순환버스', '6': '광역버스', '7': '인천버스', '8': '경기버스' };
          let typeName = routeTypeMap[bus.routeType] || bus.routeType;
          if (!typeName || /^\d+$/.test(String(typeName).trim())) {
            typeName = this.guessRouteType(bus.rtNm);
          }
          const dirText = bus.adirection ? `${bus.adirection} 방면` : (bus.nxtStn ? `${bus.nxtStn} 방면` : '');

          const tra1 = parseInt(bus.traTime1, 10);
          const targetTime1 = (!isNaN(tra1) && tra1 > 0) ? (nowMs + tra1 * 1000) : null;
          const busMsg1 = bus.arrmsg1 || '운행 정보 없음';
          const plate1 = this.formatPlateHighlight(bus.plainNo1);
          const isTerm1 = busMsg1.includes('종료') || busMsg1.includes('대기') || busMsg1.includes('출발');

          const tra2 = parseInt(bus.traTime2, 10);
          const targetTime2 = (!isNaN(tra2) && tra2 > 0) ? (nowMs + tra2 * 1000) : null;
          const busMsg2 = bus.arrmsg2 || '도착 예정 없음';
          const plate2 = this.formatPlateHighlight(bus.plainNo2);

          const busZoomKey = 'lookup_bus_' + bus.rtNm;
          const savedBoost = (typeof window !== 'undefined' && window.transitManager)
            ? window.transitManager.getFontBoostForKey(busZoomKey)
            : parseInt(localStorage.getItem('transit_time_boost_' + busZoomKey) || '0', 10);
          const styleBoost = (savedBoost > 0) ? `--time-font-boost:${savedBoost}px;` : '';

          return `
            <div class="lookup-bus-card ${isHighlighted ? 'is-highlighted-route' : ''}" data-zoom-key="${busZoomKey}" data-zoom-name="${this.escapeHtml(bus.rtNm)}번" style="${styleBoost}">
              <div class="bus-card-top-header">
                <div class="bus-route-main-info">
                  <span class="bus-badge ${badgeClass}">${this.escapeHtml(bus.rtNm)}</span>
                  <span class="bus-type-tag">${this.escapeHtml(typeName)}${dirText ? ` · ${this.escapeHtml(dirText)}` : ''}</span>
                  ${isHighlighted ? `<span class="highlight-target-pill">🎯 선택 노선</span>` : ''}
                </div>
                <div class="bus-time-zoom-ctrl" style="display:inline-flex; align-items:center; gap:5px;">
                  <button type="button" class="btn-time-zoom-btn btn-time-zoom-plus" onclick="window.transitManager && window.transitManager.increaseTimeFontSize(event, '${busZoomKey}')" title="${this.escapeHtml(bus.rtNm)}번 글씨 확대">
                    <span class="zoom-btn-icon">＋</span>
                  </button>
                  <button type="button" class="btn-time-zoom-btn btn-time-zoom-reset" onclick="window.transitManager && window.transitManager.resetTimeFontSize(event, '${busZoomKey}')" title="글씨 원래대로">
                    <span class="zoom-btn-icon">↺</span>
                  </button>
                  <button type="button" class="btn-card-hide-x" data-hide-bus-rt="${this.escapeHtml(bus.rtNm)}" title="${this.escapeHtml(bus.rtNm)}번 버스 숨기기 (전체조회로 복원 가능)" aria-label="${this.escapeHtml(bus.rtNm)}번 숨기기">✕</button>
                </div>
              </div>

              <div class="bus-card-arrival-list">
                <div class="bus-arrival-block first-bus-block">
                  <div class="arr-main-info">
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
                    <div class="arr-sub-left">
                      ${plate1 ? `<span class="arr-plate-no ${badgeClass === 'badge-green' ? 'arr-plate-green' : ''}">${plate1}</span>` : ''}
                      <span class="arr-stops-cnt">${this.extractStationCount(busMsg1) || '정류소 진입/운행중'}</span>
                      ${bus.reride_Num1 === '1' || bus.busType1 === '1' ? `<span class="badge-low-bus">저상</span>` : ''}
                    </div>
                    ${targetTime1 ? `<span class="arr-eta-time">도착 예정: <strong class="eta-clock">${this.formatEtaTime(targetTime1)}</strong></span>` : ''}
                  </div>
                </div>

                <div class="bus-arrival-block second-bus-block">
                  <div class="arr-main-info">
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
                    <div class="arr-sub-left">
                      ${plate2 ? `<span class="arr-plate-no ${badgeClass === 'badge-green' ? 'arr-plate-green' : ''}">${plate2}</span>` : ''}
                      <span class="arr-stops-cnt">${this.extractStationCount(busMsg2) || '차기 순번 운행중'}</span>
                    </div>
                    ${targetTime2 ? `<span class="arr-eta-time">도착 예정: <strong class="eta-clock">${this.formatEtaTime(targetTime2)}</strong></span>` : ''}
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      const boardHtml = `
        <div class="lookup-board-wrap lookup-selected-station-sector">
          <div class="lookup-bus-station-header">
            <div class="station-meta-left">
              <span class="station-ars-badge">🚏 ${formattedArs}</span>
              <h3 class="station-name-text">${this.escapeHtml(stationName)}</h3>
            </div>
            <div class="station-meta-right">
              ${targetHighlight ? `
                <button type="button" id="btnClearHighlightBus" class="btn-dangsan-view-toggle active" title="노선 고정 해제">
                  🎯 ${this.escapeHtml(targetHighlight)}번 우선 ✕
                </button>
              ` : `
                <span class="station-route-count"><strong>${busList.length}개</strong> 노선</span>
              `}
              <span class="station-auto-ticker">🔄 <strong id="lookupAutoRefreshCountdown">${this.refreshCountdown}초</strong></span>
            </div>
          </div>

          <div class="lookup-filter-toolbar" style="display:flex; justify-content:space-between; align-items:center; gap:6px; padding:8px 12px; flex-wrap:wrap;">
            <div style="display:flex; gap:5px; flex-wrap:wrap;">
              ${[
                { id: 'all', label: '전체' },
                { id: 'blue', label: '간선' },
                { id: 'green', label: '지선' },
                { id: 'red', label: '광역·경기' },
                { id: 'town', label: '마을' }
              ].map(f => `
                <button type="button" class="btn-filter ${this.filterType === f.id ? 'active' : ''}" data-filter="${f.id}"
                        style="padding:4px 10px; border-radius:999px; font-size:12px; font-weight:800; border:1px solid ${this.filterType === f.id ? '#0284c7' : '#cbd5e1'}; background:${this.filterType === f.id ? '#0284c7' : 'transparent'}; color:${this.filterType === f.id ? '#fff' : 'inherit'}; cursor:pointer;">
                  ${f.label}
                </button>
              `).join('')}
            </div>
            <div style="display:flex; gap:5px; align-items:center; flex-wrap:wrap;">
              ${hiddenRouteCount > 0 ? `
                <button type="button" class="btn-show-all-pill has-hidden" id="btnRestoreStopBusRoutes" title="이 정류장에서 숨긴 버스노선 전체 표시">
                  📋 전체조회 (${hiddenRouteCount}개 숨김)
                </button>
              ` : ''}
              <button type="button" id="btnToggleSort" style="padding:4px 10px; border-radius:8px; font-size:12px; font-weight:800; border:1px solid #cbd5e1; background:transparent; color:inherit; cursor:pointer;">
                ${this.sortType === 'arrival' ? '⏱️ 도착순' : '🔢 번호순'}
              </button>
            </div>
          </div>

          <div class="lookup-cards-container">
            ${cardsHtml}
          </div>
        </div>
      `;

      this.resultContainer.innerHTML = boardHtml;
      this.updateShowAllBusBadge();
      if (this.userInitiatedScroll) {
        this.scrollToResult();
        this.userInitiatedScroll = false;
      }

      const btnClearHl = document.getElementById('btnClearHighlightBus');
      if (btnClearHl) {
        btnClearHl.addEventListener('click', () => {
          this.highlightBusNo = '';
          this.renderBusBoard(arsId, stationName, busList);
        });
      }

      this.resultContainer.querySelectorAll('[data-hide-bus-rt]').forEach(xBtn => {
        xBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const rt = xBtn.getAttribute('data-hide-bus-rt');
          if (rt) {
            this.hideBusRouteAtStop(cleanArsKey, rt);
            this.renderBusBoard(arsId, stationName, busList);
          }
        });
      });

      const restoreStopHandler = () => {
        this.restoreStopHiddenBusRoutes(cleanArsKey);
        this.filterType = 'all';
        this.highlightBusNo = '';
        this.renderBusBoard(arsId, stationName, busList);
      };
      const btnRestoreStop = document.getElementById('btnRestoreStopBusRoutes');
      if (btnRestoreStop) btnRestoreStop.addEventListener('click', restoreStopHandler);
      const btnRestoreInline = document.getElementById('btnRestoreHiddenBusInline');
      if (btnRestoreInline) btnRestoreInline.addEventListener('click', restoreStopHandler);

      this.resultContainer.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          this.filterType = btn.getAttribute('data-filter');
          this.renderBusBoard(arsId, stationName, busList);
        });
      });

      const btnSort = document.getElementById('btnToggleSort');
      if (btnSort) {
        btnSort.addEventListener('click', () => {
          this.sortType = (this.sortType === 'arrival') ? 'number' : 'arrival';
          this.renderBusBoard(arsId, stationName, busList);
        });
      }
    }

    // ==========================================
    // 렌더링: 지하철 실시간 운행 전광판 (다중 호선 그룹화 + 초단위 카운트다운)
    // ==========================================
    renderSubwayBoard(stationName, arrivals) {
      if (!this.resultContainer) return;

      const currentTimeStr = new Date().toLocaleTimeString('ko-KR', { hour12: false });
      const safeArrivals = Array.isArray(arrivals) ? arrivals : [];
      const nowMs = Date.now();

      const subwayStationKey = 'lookup_subway_' + stationName;
      const savedStationBoost = (typeof window !== 'undefined' && window.transitManager)
        ? window.transitManager.getFontBoostForKey(subwayStationKey)
        : parseInt(localStorage.getItem('transit_time_boost_' + subwayStationKey) || '0', 10);
      const stationStyleBoost = (savedStationBoost > 0) ? `--time-font-boost:${savedStationBoost}px;` : '';

      // 호선별 그룹화 (예: 여의도역 -> 9호선 / 5호선, 당산역 -> 2호선 / 9호선)
      const lineGroups = new Map();
      safeArrivals.forEach(item => {
        const sid = String(item.subwayId || '1000');
        if (!lineGroups.has(sid)) lineGroups.set(sid, []);
        lineGroups.get(sid).push(item);
      });

      if (lineGroups.size === 0 && stationName === '선유도') {
        lineGroups.set('1009', []);
      }

      const renderTrainItems = (list, fallbackSchedule = []) => {
        const merged = [];
        list.slice(0, 2).forEach(item => {
          const isExpress = item.btrainSttus === '급행' || (item.trainLineNm && item.trainLineNm.includes('급행'));
          const rawSec = parseInt(item.barvlDt, 10);
          const targetTime = (!isNaN(rawSec) && rawSec > 0) ? (nowMs + rawSec * 1000) : null;
          const arriveMsg = item.arvlMsg2 || item.arvlMsg3 || '운행중';
          const lineNm = item.trainLineNm || (item.bstatnNm ? `${item.bstatnNm}행` : '열차');
          merged.push({ isExpress, rawSec, targetTime, arriveMsg, lineNm });
        });

        if (merged.length < 2 && fallbackSchedule.length > 0) {
          for (const sc of fallbackSchedule) {
            if (merged.length >= 2) break;
            merged.push({
              isExpress: false,
              rawSec: sc.sec,
              targetTime: sc.targetTime,
              arriveMsg: `${sc.departureTime} 출발`,
              lineNm: `${sc.endStationName}행 (${sc.departureTime})`
            });
          }
        }

        if (merged.length === 0) {
          return `<div class="subway-empty-msg">현재 수신된 실시간 열차 정보가 없습니다.</div>`;
        }

        return merged.map((tr, idx) => {
          const isFirst = (idx === 0);
          return `
            <div class="subway-train-item ${isFirst ? 'is-next-train' : ''}">
              <div class="train-seq-badge ${isFirst ? 'seq-first' : 'seq-second'}">
                ${isFirst ? '다음' : '다다음'}
              </div>
              <div class="train-destination">
                <span class="train-head">${this.escapeHtml(tr.lineNm)}</span>
                ${tr.isExpress ? `<span class="badge-express-train">⚡ 급행</span>` : `<span class="badge-normal-train">일반</span>`}
              </div>
              <div class="train-arrival-status">
                ${tr.targetTime ? `
                  <span class="live-bus-sec" data-target-time="${tr.targetTime}">
                    ${this.formatSecondsHtml(tr.rawSec)}
                  </span>
                ` : `
                  <span class="train-msg ${this.isImminentSubway(tr.arriveMsg) ? 'status-imminent' : ''}">${this.escapeHtml(tr.arriveMsg)}</span>
                `}
              </div>
            </div>
          `;
        }).join('');
      };

      let lineSectionsHtml = '';
      Array.from(lineGroups.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([sid, items]) => {
        const lineMeta = SUBWAY_ID_MAP[sid] || { name: '지하철', cls: 'line-default' };
        const upTrains = items.filter(a => a.updnLine === '상행' || a.updnLine === '내선');
        const downTrains = items.filter(a => a.updnLine === '하행' || a.updnLine === '외선');
        const upFallback = (stationName === '선유도' && sid === '1009') ? this.getSeonyudoUpcomingTrains(new Date(), 2) : [];

        lineSectionsHtml += `
          <div class="subway-line-section" style="margin-top:10px;">
            <div style="display:flex; align-items:center; gap:8px; padding:4px 4px 8px 4px;">
              <span class="badge-subway-line badge-${lineMeta.cls}" style="font-size:13px; padding:3px 10px;">${lineMeta.name}</span>
              <span style="font-size:13.5px; font-weight:800;">${this.escapeHtml(stationName)}역 상·하행 실시간 도착</span>
            </div>
            <div class="subway-board-grid">
              <div class="subway-direction-box">
                <div class="subway-dir-header">
                  <span class="dir-icon">⬆️</span>
                  <span class="dir-title">상행 / 내선 방면</span>
                </div>
                <div class="subway-train-list">
                  ${renderTrainItems(upTrains, upFallback)}
                </div>
              </div>
              <div class="subway-direction-box">
                <div class="subway-dir-header">
                  <span class="dir-icon">⬇️</span>
                  <span class="dir-title">하행 / 외선 방면</span>
                </div>
                <div class="subway-train-list">
                  ${renderTrainItems(downTrains)}
                </div>
              </div>
            </div>
          </div>
        `;
      });

      const boardHtml = `
        <div class="lookup-board-wrap" data-zoom-key="${subwayStationKey}" data-zoom-name="${this.escapeHtml(stationName)}역" style="${stationStyleBoost}">
          <div class="lookup-board-header subway-theme-header">
            <div class="station-meta-info">
              <div class="station-name-row">
                <span class="station-icon">🚇</span>
                <h4 class="station-title">${this.escapeHtml(stationName)}역</h4>
                <span class="station-ars-badge subway-badge-tag">실시간 열차</span>
                <div class="bus-time-zoom-ctrl" style="margin-left:auto;">
                  <button type="button" class="btn-time-zoom-btn btn-time-zoom-plus" onclick="window.transitManager && window.transitManager.increaseTimeFontSize(event, '${subwayStationKey}')" title="글씨 확대">
                    <span class="zoom-btn-icon">＋</span>
                  </button>
                  <button type="button" class="btn-time-zoom-btn btn-time-zoom-reset" onclick="window.transitManager && window.transitManager.resetTimeFontSize(event, '${subwayStationKey}')" title="글씨 복귀">
                    <span class="zoom-btn-icon">↺</span>
                  </button>
                </div>
              </div>
              <div class="station-sub-row">
                <span class="station-route-count">실시간 열차 <strong>${safeArrivals.length}대</strong></span>
                <span class="station-update-time">수신: ${currentTimeStr}</span>
                <span class="station-auto-ticker">🔄 <strong id="lookupAutoRefreshCountdown">${this.refreshCountdown}초</strong></span>
              </div>
            </div>
          </div>
          ${lineSectionsHtml}
        </div>
      `;

      this.resultContainer.innerHTML = boardHtml;
      if (this.userInitiatedScroll) {
        this.scrollToResult();
        this.userInitiatedScroll = false;
      }
    }

    // ==========================================
    // 빠른 선택 칩 & 최근 검색 기록
    // ==========================================
    getHiddenBusChips() {
      try {
        const raw = localStorage.getItem('realtime_hidden_bus_chips');
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        return [];
      }
    }

    saveHiddenBusChips(list) {
      try {
        localStorage.setItem('realtime_hidden_bus_chips', JSON.stringify(list));
      } catch (e) {}
    }

    removeBusChip(arsId) {
      const cleanId = String(arsId || '').trim();
      if (!cleanId) return;
      const hidden = this.getHiddenBusChips();
      if (!hidden.includes(cleanId)) {
        hidden.push(cleanId);
        this.saveHiddenBusChips(hidden);
      }
      try {
        const hist = this.getRecentHistory().filter(h => !(h.type === 'bus' && h.id === cleanId));
        localStorage.setItem('realtime_recent_transits', JSON.stringify(hist));
      } catch (e) {}
      this.renderQuickChips();
      this.updateShowAllBusBadge();
      if (window.transitManager) {
        window.transitManager.showTimeZoomToast(`정류장(${cleanId})을 빠른선택에서 제외했습니다 ([📋 전체조회]로 복원)`);
      }
    }

    unhideBusChip(arsId) {
      const cleanId = String(arsId || '').trim();
      const hidden = this.getHiddenBusChips().filter(x => x !== cleanId);
      this.saveHiddenBusChips(hidden);
    }

    getAllHiddenBusRoutesMap() {
      try {
        const raw = localStorage.getItem('realtime_hidden_bus_routes');
        const obj = raw ? JSON.parse(raw) : {};
        return (obj && typeof obj === 'object') ? obj : {};
      } catch (e) {
        return {};
      }
    }

    saveAllHiddenBusRoutesMap(obj) {
      try {
        localStorage.setItem('realtime_hidden_bus_routes', JSON.stringify(obj));
      } catch (e) {}
    }

    getHiddenBusRoutesForStop(arsId) {
      const cleanId = String(arsId || '').replace(/[^0-9]/g, '');
      const map = this.getAllHiddenBusRoutesMap();
      return Array.isArray(map[cleanId]) ? map[cleanId] : [];
    }

    hideBusRouteAtStop(arsId, rtNm) {
      const cleanId = String(arsId || '').replace(/[^0-9]/g, '');
      const cleanRt = String(rtNm || '').trim();
      if (!cleanId || !cleanRt) return;
      const map = this.getAllHiddenBusRoutesMap();
      if (!Array.isArray(map[cleanId])) map[cleanId] = [];
      if (!map[cleanId].includes(cleanRt)) {
        map[cleanId].push(cleanRt);
        this.saveAllHiddenBusRoutesMap(map);
      }
      if (window.transitManager) {
        window.transitManager.showTimeZoomToast(`${cleanRt}번 버스를 숨겼습니다 ([📋 전체조회]로 다시 표시)`);
      }
    }

    restoreStopHiddenBusRoutes(arsId) {
      const cleanId = String(arsId || '').replace(/[^0-9]/g, '');
      const map = this.getAllHiddenBusRoutesMap();
      delete map[cleanId];
      this.saveAllHiddenBusRoutesMap(map);
      if (window.transitManager) {
        window.transitManager.showTimeZoomToast('🚌 이 정류장의 전체 버스노선이 표시됩니다');
      }
    }

    restoreAllBusItems() {
      this.saveHiddenBusChips([]);
      this.saveAllHiddenBusRoutesMap({});
      this.filterType = 'all';
      this.highlightBusNo = '';
      this.renderQuickChips();
      if (this.currentType === 'bus' && this.currentId && this.lastBusData) {
        this.renderBusBoard(this.currentId, this.currentName, this.lastBusData);
      }
      this.updateShowAllBusBadge();
      if (window.transitManager) {
        window.transitManager.showTimeZoomToast('🚌 모든 빠른선택 정류장 및 전체 버스노선이 표시됩니다');
      }
    }

    updateShowAllBusBadge() {
      const btn = document.getElementById('btnBusLookupShowAll');
      if (!btn) return;
      const hiddenChipsCnt = this.getHiddenBusChips().length;
      const map = this.getAllHiddenBusRoutesMap();
      let hiddenRoutesCnt = 0;
      Object.keys(map).forEach(k => {
        if (Array.isArray(map[k])) hiddenRoutesCnt += map[k].length;
      });
      const total = hiddenChipsCnt + hiddenRoutesCnt;
      btn.textContent = total > 0 ? `📋 전체조회 (${total}개 숨김)` : '📋 전체조회';
      btn.classList.toggle('has-hidden', total > 0);
    }

    renderQuickChips() {
      if (!this.chipsContainer) return;

      const history = this.getRecentHistory().filter(h => h.type === 'bus');
      const hiddenChipSet = new Set(this.getHiddenBusChips());
      const defaultChips = [
        { type: 'bus', id: '19130', name: 'KBS' },
        { type: 'bus', id: '19152', name: '여의도공원1번출입구' },
        { type: 'bus', id: '19133', name: '국회의사당역5번출구' },
        { type: 'bus', id: '19132', name: '국회의사당역.KB국민은행' },
        { type: 'bus', id: '19150', name: 'KBS별관' },
        { type: 'bus', id: '19151', name: '샛강역3번출구.KBS별관' },
        { type: 'bus', id: '19131', name: '국회의사당' },
        { type: 'bus', id: '19007', name: '여의도환승센터' }
      ];

      const merged = [];
      defaultChips.forEach(c => {
        if (!hiddenChipSet.has(c.id)) merged.push(c);
      });
      history.forEach(h => {
        if (!hiddenChipSet.has(h.id) && !merged.some(m => m.type === h.type && m.id === h.id)) {
          merged.push(h);
        }
      });

      const chipsHtml = merged.slice(0, 12).map(chip => {
        const isBus = (chip.type === 'bus');
        const isActive = (this.currentType === chip.type && this.currentId === chip.id);
        const icon = isBus ? '🚏' : '🚇';
        const label = isBus && !String(chip.name).includes(chip.id) ? `[${chip.id}] ${chip.name}` : chip.name;
        return `
          <button type="button" class="quick-chip-btn ${isBus ? 'chip-bus' : 'chip-subway'} has-chip-del ${isActive ? 'active' : ''}"
                  data-type="${chip.type}" data-id="${this.escapeHtml(chip.id)}" data-name="${this.escapeHtml(chip.name)}">
            <span class="chip-icon">${icon}</span>
            <span class="chip-text">${this.escapeHtml(label)}</span>
            <span class="chip-del-x" data-del-bus-chip="${this.escapeHtml(chip.id)}" title="빠른선택에서 삭제">✕</span>
          </button>
        `;
      }).join('');

      this.chipsContainer.innerHTML = `
        <div class="quick-sub-chips-row" style="margin-top:4px;">
          <span class="quick-chips-sublabel">빠른선택:</span>
          <div class="quick-chips-scroll-sub">
            ${chipsHtml || '<span style="font-size:12px; color:#64748b; padding:4px 6px;">표시할 정류장이 없습니다. [📋 전체조회]를 누르세요.</span>'}
          </div>
        </div>
      `;

      this.chipsContainer.querySelectorAll('.chip-del-x').forEach(delEl => {
        delEl.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const delId = delEl.getAttribute('data-del-bus-chip');
          if (delId) this.removeBusChip(delId);
        });
      });

      this.chipsContainer.querySelectorAll('.quick-chip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if (e.target.closest('.chip-del-x')) return;
          this.userInitiatedScroll = true;
          const type = btn.getAttribute('data-type');
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name').replace(/\s*\(\d+\)$/, '');
          if (type === 'bus') {
            this.inputQuery.value = id;
            if (this.btnClearQuery) this.btnClearQuery.style.display = 'flex';
            this.highlightBusNo = '';
            this.lookupBusByArs(id, name);
          } else {
            this.inputQuery.value = id + '역';
            if (this.btnClearQuery) this.btnClearQuery.style.display = 'flex';
            this.lookupSubway(id);
          }
          this.scrollToResult();
        });
      });
      this.updateShowAllBusBadge();
    }

    getRecentHistory() {
      try {
        const raw = localStorage.getItem('realtime_recent_transits');
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    saveRecentHistory(type, id, name) {
      try {
        if (type === 'bus' && this.userInitiatedScroll) {
          this.unhideBusChip(id);
        }
        let history = this.getRecentHistory();
        history = history.filter(h => !(h.type === type && h.id === id));
        history.unshift({ type, id, name });
        if (history.length > 8) history = history.slice(0, 8);
        localStorage.setItem('realtime_recent_transits', JSON.stringify(history));
      } catch (e) {}
    }

    // ==========================================
    // API 통신 레이어 (직결 + CORS 프록시 백업)
    // ==========================================
    async fetchStationsByName(name) {
      const cleanName = String(name).trim();
      const directUrl = `http://ws.bus.go.kr/api/rest/stationinfo/getStationByName?serviceKey=${this.busApiKey}&stSrch=${encodeURIComponent(cleanName)}&resultType=json`;

      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3800);
        const res = await fetch(directUrl, { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          const items = data?.msgBody?.itemList;
          if (Array.isArray(items)) return items;
        }
      } catch (e) {}

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

    async fetchBusArrivalByUid(arsId) {
      const cleanArs = String(arsId).replace(/[^0-9]/g, '');
      const directUrl = `http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?serviceKey=${this.busApiKey}&arsId=${cleanArs}&resultType=json`;

      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3800);
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

    async fetchSubwayRealtime(stationName) {
      const cleanName = stationName.replace(/역$/, '').trim();
      const directUrl = `http://swopenAPI.seoul.go.kr/api/subway/${this.subwayApiKey}/json/realtimeStationArrival/0/20/${encodeURIComponent(cleanName)}`;

      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3800);
        const res = await fetch(directUrl, { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          if (data && data.realtimeArrivalList) {
            this.cache.subway[cleanName] = data.realtimeArrivalList;
            return data.realtimeArrivalList;
          }
          return [];
        }
      } catch (e) {}

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
    // UI 상태 및 포맷 헬퍼
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
          <div class="lookup-state-title">
            <span class="station-ars-badge station-ars-badge-blue">ARS ${formattedArs}</span>
            <span class="empty-station-name">${this.escapeHtml(customName || '정류소 정보')}</span>
          </div>
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
          <div class="lookup-state-text">현재 실시간 운행 중인 열차 도착 정보를 수신할 수 없습니다 (심야 운행 종료 등).</div>
        </div>
      `;
    }

    formatEtaTime(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    formatArsId(ars) {
      const s = String(ars).replace(/[^0-9]/g, '');
      return s.length === 5 ? `${s.slice(0, 2)}-${s.slice(2)}` : s;
    }

    formatSecondsHtml(sec, walkSec = 300) {
      const catchClass = (sec >= walkSec) ? 'transit-catchable' : 'transit-uncatchable';
      if (!sec || isNaN(sec) || sec <= 0) return `<span class="tag-arrive-now transit-uncatchable">⚡ 곧 도착</span>`;
      if (sec < 60) return `<span class="tag-arrive-imminent ${catchClass}">${sec}초 후</span>`;
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      const sStr = s < 10 ? '0' + s : s;
      return `<span class="${catchClass}"><span class="transit-time-min">${m}분</span> <span class="transit-time-sec">${sStr}초 후</span></span>`;
    }

    formatPlateHighlight(plate) {
      if (!plate) return '';
      const str = String(plate).trim();
      const m = str.match(/^(.*?)(\d{4})$/);
      return m ? `🚌 <strong class="plate-digit">${m[2]}</strong>` : `🚌 ${str}`;
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
      const t = String(routeType || '').trim();
      const n = String(rtNm || '').trim();
      if (n.includes('부천') || n === '700' || n.startsWith('70-2') || t === '8') return 'badge-sky';
      if (t === '2' || t.includes('마을') || /^(양천|영등포|마포|강서|구로|관악|동작|서초|종로|용산)/.test(n)) return 'badge-town';
      if (t === '1' || t.includes('공항') || /^6[0-3]\d{2}$/.test(n)) return 'badge-airport';
      if (t === '6' || t.includes('광역') || t.includes('직행') || /^9\d{3}$/.test(n) || /^[MmGg]\d{4}$/.test(n)) return 'badge-red';
      if (t === '4' || t.includes('지선') || /^[1-8]\d{3}$/.test(n)) return 'badge-green';
      if (t === '3' || t.includes('간선') || /^\d{3}$/.test(n)) return 'badge-blue';
      return 'badge-green';
    }

    guessRouteType(rtNm) {
      if (!rtNm) return '일반버스';
      const n = String(rtNm).trim();
      if (n.includes('부천') || n.startsWith('70-2')) return '경기버스';
      if (/^(양천|영등포|마포|강서|구로|관악|동작|서초)/.test(n)) return '마을버스';
      if (/^60\d{2}$/.test(n)) return '공항버스';
      if (/^9\d{3}$/.test(n)) return '광역버스';
      if (/^\d{3}$/.test(n)) return '간선버스';
      if (/^\d{4}$/.test(n)) return '지선버스';
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

  document.addEventListener('DOMContentLoaded', () => {
    window.transitLookup = new TransitLookupController();
  });

})();
