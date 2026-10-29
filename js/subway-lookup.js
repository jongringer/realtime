// ==========================================================================
// 실시간 지하철 역사 도착 조회 전용 컨트롤러 (버스 실시간 조회 바로 위 별도 파트)
// - 원하는 지하철 역사명 입력 시 전 호선 상·하행(내·외선) BIT 전광판 표시
// - 호선별 공식 고유색 + 실시간 도착 1순위 + 실시간 없을 때 공식 시간표 자동 적용
// ==========================================================================

(function () {
  'use strict';

  const LINE_NUM_TO_SUBWAY_ID = {
    '01호선': '1001',
    '02호선': '1002',
    '03호선': '1003',
    '04호선': '1004',
    '05호선': '1005',
    '06호선': '1006',
    '07호선': '1007',
    '08호선': '1008',
    '09호선': '1009',
    '신분당선': '1077',
    '공항철도': '1065',
    '경의선': '1063',
    '경의중앙선': '1063',
    '수인분당선': '1075',
    '신림선': '1094',
    '우이신설선': '1092',
    '서해선': '1093',
    'GTX-A': '1032'
  };

  const POPULAR_SUBWAY_STATIONS = [
    { name: '선유도', lines: ['9호선'] },
    { name: '당산', lines: ['2호선', '9호선'] },
    { name: '샛강', lines: ['9호선', '신림선'] },
    { name: '여의나루', lines: ['5호선'] },
    { name: '신길', lines: ['1호선', '5호선'] },
    { name: '영등포구청', lines: ['2호선', '5호선'] },
    { name: '공덕', lines: ['5호선', '6호선', '공항철도', '경의중앙'] },
    { name: '광화문', lines: ['5호선'] },
    { name: '김포공항', lines: ['5호선', '9호선', '공항철도', '서해선'] },
    { name: '노량진', lines: ['1호선', '9호선'] },
    { name: '동작', lines: ['4호선', '9호선'] },
    { name: '고속터미널', lines: ['3호선', '7호선', '9호선'] },
    { name: '신논현', lines: ['9호선', '신분당'] },
    { name: '강남', lines: ['2호선', '신분당'] },
    { name: '홍대입구', lines: ['2호선', '공항철도', '경의중앙'] },
    { name: '서울역', lines: ['1호선', '4호선', '공항철도', '경의중앙'] },
    { name: '시청', lines: ['1호선', '2호선'] },
    { name: '종로3가', lines: ['1호선', '3호선', '5호선'] },
    { name: '왕십리', lines: ['2호선', '5호선', '수인분당', '경의중앙'] },
    { name: '신도림', lines: ['1호선', '2호선'] },
    { name: '사당', lines: ['2호선', '4호선'] },
    { name: '잠실', lines: ['2호선', '8호선'] },
    { name: '합정', lines: ['2호선', '6호선'] },
    { name: '오목교', lines: ['5호선'] },
    { name: '목동', lines: ['5호선'] },
    { name: '까치산', lines: ['2호선', '5호선'] },
    { name: '염창', lines: ['9호선'] },
    { name: '가양', lines: ['9호선'] },
    { name: '마곡나루', lines: ['9호선', '공항철도'] },
    { name: '국회의사당', lines: ['9호선'] },
    { name: '여의도', lines: ['5호선', '9호선'] }
  ];

  class SubwayLookupController {
    constructor() {
      this.subwayApiKey = '476a79484b6a6f6e3833504f4f6d4e';
      this.currentStation = '';
      this.lastRawArrivals = [];
      this.lastLineCards = [];
      this.stationCodeCache = {};
      this.dynamicTimetableCache = {};
      this.debounceTimer = null;
      this.refreshTimer = null;

      this.initDom();
      this.initEvents();
      this.renderQuickChips();
    }

    initDom() {
      this.section = document.getElementById('subwayLookupSection');
      this.input = document.getElementById('inputSubwayQuery');
      this.btnClear = document.getElementById('btnClearSubwayQuery');
      this.btnSearch = document.getElementById('btnExecSubwaySearch');
      this.dropdown = document.getElementById('subwaySuggestionsDropdown');
      this.chipsContainer = document.getElementById('subwayQuickChipsContainer');
      this.resultContainer = document.getElementById('subwayLookupResultContainer');
      this.btnRefresh = document.getElementById('btnSubwayLookupRefresh');
      this.liveBadge = document.getElementById('subwayLookupLiveBadge');
    }

    initEvents() {
      if (!this.input) return;

      this.input.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (this.btnClear) this.btnClear.style.display = val ? 'flex' : 'none';
        clearTimeout(this.debounceTimer);
        if (val.length >= 1) {
          this.debounceTimer = setTimeout(() => this.showAutocomplete(val), 150);
        } else {
          this.hideDropdown();
        }
      });

      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.executeSearch();
        } else if (e.key === 'Escape') {
          this.hideDropdown();
        }
      });

      if (this.btnSearch) {
        this.btnSearch.addEventListener('click', () => this.executeSearch());
      }

      if (this.btnClear) {
        this.btnClear.addEventListener('click', () => {
          this.input.value = '';
          this.btnClear.style.display = 'none';
          this.hideDropdown();
          this.input.focus();
        });
      }

      if (this.btnRefresh) {
        this.btnRefresh.addEventListener('click', () => {
          if (this.currentStation) {
            this.lookupStation(this.currentStation, false);
          }
        });
      }

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#subwaySearchContainer')) {
          this.hideDropdown();
        }
      });
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

    getRecentStations() {
      try {
        const raw = localStorage.getItem('realtime_recent_subways');
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        return [];
      }
    }

    saveRecentStation(cleanName) {
      try {
        const prev = this.getRecentStations().filter(x => x !== cleanName);
        prev.unshift(cleanName);
        localStorage.setItem('realtime_recent_subways', JSON.stringify(prev.slice(0, 6)));
      } catch (e) {}
    }

    renderQuickChips() {
      if (!this.chipsContainer) return;
      const recents = this.getRecentStations();
      const defaults = ['선유도', '당산', '샛강', '여의나루', '신길', '영등포구청', '공덕', '광화문', '김포공항', '강남', '서울역'];
      const merged = [];
      recents.forEach(s => { if (!merged.includes(s)) merged.push(s); });
      defaults.forEach(s => { if (!merged.includes(s)) merged.push(s); });

      const chipsHtml = merged.slice(0, 10).map(stName => {
        const isActive = (this.currentStation === stName);
        const label = stName.endsWith('역') ? stName : `${stName}역`;
        return `
          <button type="button" class="quick-chip-btn chip-subway ${isActive ? 'active' : ''}" data-station="${this.escapeHtml(stName)}">
            <span class="chip-icon">🚇</span>
            <span class="chip-text">${this.escapeHtml(label)}</span>
          </button>
        `;
      }).join('');

      this.chipsContainer.innerHTML = `
        <div class="quick-sub-chips-row" style="margin-top:4px;">
          <div class="quick-chips-scroll-sub">${chipsHtml}</div>
        </div>
      `;

      this.chipsContainer.querySelectorAll('.quick-chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const st = btn.getAttribute('data-station');
          if (!st) return;
          if (this.input) this.input.value = st.endsWith('역') ? st : `${st}역`;
          if (this.btnClear) this.btnClear.style.display = 'flex';
          this.lookupStation(st, true);
        });
      });
    }

    showAutocomplete(query) {
      if (!this.dropdown) return;
      const clean = query.replace(/역$/, '').trim().toLowerCase();
      if (!clean) {
        this.hideDropdown();
        return;
      }

      const matches = POPULAR_SUBWAY_STATIONS.filter(s =>
        s.name.toLowerCase().includes(clean)
      ).slice(0, 8);

      const itemsHtml = matches.map(m => {
        const disp = m.name.endsWith('역') ? m.name : `${m.name}역`;
        return `
          <div class="lookup-suggestion-item" data-station="${this.escapeHtml(m.name)}" style="padding:10px 14px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; border-bottom:1px solid #f1f5f9;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span>🚇</span>
              <strong style="font-size:14.5px; color:#0f172a;">${this.escapeHtml(disp)}</strong>
            </div>
            <span style="font-size:12px; font-weight:800; color:#64748b;">${this.escapeHtml(m.lines.join(' · '))}</span>
          </div>
        `;
      }).join('');

      const directLabel = query.endsWith('역') ? query : `${query}역`;
      const directRow = `
        <div class="lookup-suggestion-item" data-station="${this.escapeHtml(query.replace(/역$/, '').trim())}" style="padding:10px 14px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; background:#f8fafc;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>🔍</span>
            <strong style="font-size:14px; color:#0284c7;">'${this.escapeHtml(directLabel)}' 실시간 지하철 바로 조회</strong>
          </div>
          <span style="font-size:11.5px; font-weight:800; color:#0284c7;">Enter ↵</span>
        </div>
      `;

      this.dropdown.innerHTML = itemsHtml + directRow;
      this.dropdown.style.display = 'block';

      this.dropdown.querySelectorAll('.lookup-suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
          const st = el.getAttribute('data-station');
          this.hideDropdown();
          if (st) {
            if (this.input) this.input.value = st.endsWith('역') ? st : `${st}역`;
            if (this.btnClear) this.btnClear.style.display = 'flex';
            this.lookupStation(st, true);
          }
        });
      });
    }

    hideDropdown() {
      if (this.dropdown) this.dropdown.style.display = 'none';
    }

    executeSearch() {
      if (!this.input) return;
      const val = this.input.value.trim();
      if (!val) {
        this.input.focus();
        return;
      }
      this.hideDropdown();
      const cleanName = val === '서울역' ? '서울' : val.replace(/역$/, '').trim();
      this.lookupStation(cleanName, true);
    }

    async fetchJson(httpUrl, timeoutMs = 4500) {
      if (window.transitManager && typeof window.transitManager.fetchJsonWithFallback === 'function') {
        return window.transitManager.fetchJsonWithFallback(httpUrl, timeoutMs);
      }
      const res = await fetch(httpUrl, { cache: 'no-store' });
      return res.ok ? res.json() : null;
    }

    async fetchStationCodes(cleanName) {
      const searchName = cleanName === '서울역' ? '서울역' : cleanName;
      if (this.stationCodeCache[searchName]) return this.stationCodeCache[searchName];

      let url = `http://openAPI.seoul.go.kr:8088/${this.subwayApiKey}/json/SearchInfoBySubwayNameService/1/20/${encodeURIComponent(searchName)}`;
      let data = await this.fetchJson(url, 4000);
      let rows = data && data.SearchInfoBySubwayNameService && data.SearchInfoBySubwayNameService.row;

      if ((!rows || rows.length === 0) && searchName === '서울') {
        url = `http://openAPI.seoul.go.kr:8088/${this.subwayApiKey}/json/SearchInfoBySubwayNameService/1/20/${encodeURIComponent('서울역')}`;
        data = await this.fetchJson(url, 4000);
        rows = data && data.SearchInfoBySubwayNameService && data.SearchInfoBySubwayNameService.row;
      }

      const list = Array.isArray(rows) ? rows : [];
      if (list.length > 0) this.stationCodeCache[searchName] = list;
      return list;
    }

    async fetchDynamicTimetable(stationCd, isHoliday, inOutTag) {
      const weekTag = isHoliday ? '2' : '1';
      const cacheKey = `${stationCd}_${weekTag}_${inOutTag}`;
      if (this.dynamicTimetableCache[cacheKey]) return this.dynamicTimetableCache[cacheKey];

      const url = `http://openAPI.seoul.go.kr:8088/${this.subwayApiKey}/json/SearchSTNTimeTableByIDService/1/500/${stationCd}/${weekTag}/${inOutTag}/`;
      const data = await this.fetchJson(url, 4500);
      const rows = (data && data.SearchSTNTimeTableByIDService && data.SearchSTNTimeTableByIDService.row) || [];

      const byHour = {};
      let sampleDest = '';
      for (const row of rows) {
        if (!row.LEFTTIME || row.LEFTTIME === '00:00:00') continue;
        const parts = row.LEFTTIME.split(':');
        let h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) continue;
        if (h === 0) h = 24;
        if (!byHour[h]) byHour[h] = [];
        const isExp = (row.EXPRESS_YN === 'D' || row.EXPRESS_YN === 'Y');
        const end = String(row.SUBWAYENAME || '').trim();
        if (!sampleDest && end) sampleDest = end;
        const tok = (!isExp && !end) ? m : `${m}${isExp ? 'E' : ''}${end ? ':' + end : ''}`;
        byHour[h].push({ m, tok });
      }
      const cleanObj = {};
      Object.keys(byHour).map(Number).sort((a, b) => a - b).forEach(h => {
        byHour[h].sort((a, b) => a.m - b.m);
        cleanObj[h] = byHour[h].map(x => x.tok);
      });

      const result = { scheduleObj: cleanObj, defaultDest: sampleDest };
      if (Object.keys(cleanObj).length > 0) {
        this.dynamicTimetableCache[cacheKey] = result;
      }
      return result;
    }

    async lookupStation(rawStationName, scrollAfter = false) {
      const cleanName = rawStationName === '서울역' ? '서울' : String(rawStationName).replace(/역$/, '').trim();
      if (!cleanName || !this.resultContainer) return;

      this.currentStation = cleanName;
      this.saveRecentStation(cleanName === '서울' ? '서울역' : cleanName);
      this.renderQuickChips();

      const dispStation = cleanName === '서울' ? '서울역' : `${cleanName}역`;
      this.resultContainer.innerHTML = `
        <div class="fav-loading-card">
          <div style="font-size:24px; margin-bottom:6px;">🔄</div>
          <div style="font-size:15px; font-weight:800;">[${this.escapeHtml(dispStation)}] 실시간 열차 도착 및 공식 시간표 조회 중...</div>
        </div>
      `;

      try {
        const arrivalUrl = `http://swopenAPI.seoul.go.kr/api/subway/${this.subwayApiKey}/json/realtimeStationArrival/0/50/${encodeURIComponent(cleanName)}`;
        const [arrivalData, stationCodeRows] = await Promise.all([
          this.fetchJson(arrivalUrl, 4500),
          this.fetchStationCodes(cleanName)
        ]);

        const rawArrivals = (arrivalData && Array.isArray(arrivalData.realtimeArrivalList))
          ? arrivalData.realtimeArrivalList
          : [];
        this.lastRawArrivals = rawArrivals;

        // 호선 목록 추출 (실시간 도착 + 역사 코드 DB 병합)
        const lineSet = new Map();
        stationCodeRows.forEach(r => {
          const sid = LINE_NUM_TO_SUBWAY_ID[String(r.LINE_NUM || '').trim()];
          if (sid && !lineSet.has(sid)) {
            lineSet.set(sid, { subwayId: sid, stationCd: r.STATION_CD });
          }
        });
        rawArrivals.forEach(item => {
          const sid = String(item.subwayId || '');
          if (sid && !lineSet.has(sid)) {
            lineSet.set(sid, { subwayId: sid, stationCd: '' });
          }
        });

        if (lineSet.size === 0) {
          this.resultContainer.innerHTML = `
            <div class="fav-loading-card">
              <div style="font-size:26px; margin-bottom:6px;">⚠️</div>
              <div style="font-size:15px; font-weight:800; color:#dc2626;">'${this.escapeHtml(dispStation)}' 지하철 정보를 찾을 수 없습니다.</div>
              <p style="font-size:12.5px; color:#64748b; margin-top:4px;">수도권 지하철 정확한 역사명(예: 당산, 선유도, 광화문, 강남, 서울역)을 입력해 주세요.</p>
            </div>
          `;
          return;
        }

        const isHoliday = window.transitManager
          ? window.transitManager.isWeekendOrHoliday(new Date())
          : (new Date().getDay() === 0 || new Date().getDay() === 6);

        // 각 호선 상행(내선) / 하행(외선) 카드 구성 및 공식 시간표 병렬 로드
        const cardSpecs = [];
        for (const [sid, info] of lineSet.entries()) {
          const isCircleLine = (sid === '1002');
          const upLabel = isCircleLine ? '내선' : '상행';
          const dnLabel = isCircleLine ? '외선' : '하행';

          let upTT = { scheduleObj: null, defaultDest: '' };
          let dnTT = { scheduleObj: null, defaultDest: '' };
          if (info.stationCd) {
            const [resUp, resDn] = await Promise.all([
              this.fetchDynamicTimetable(info.stationCd, isHoliday, '1'),
              this.fetchDynamicTimetable(info.stationCd, isHoliday, '2')
            ]);
            upTT = resUp;
            dnTT = resDn;
          }

          cardSpecs.push({ sid, dir: upLabel, tt: upTT });
          cardSpecs.push({ sid, dir: dnLabel, tt: dnTT });
        }

        this.lastLineCards = cardSpecs.map(spec => {
          const lineMeta = window.transitManager.getLineMeta(spec.sid);
          // 실시간 trainLineNm에서 방면 설명 자동 추출
          const sampleLive = rawArrivals.find(it => {
            if (String(it.subwayId) !== spec.sid) return false;
            const u = String(it.updnLine || '');
            return (spec.dir === '상행' || spec.dir === '내선')
              ? (u.includes('상행') || u.includes('내선'))
              : (u.includes('하행') || u.includes('외선'));
          });

          let dirDesc = `${spec.dir} 방면`;
          if (sampleLive && sampleLive.trainLineNm) {
            dirDesc = String(sampleLive.trainLineNm).trim();
          } else if (spec.tt.defaultDest) {
            dirDesc = `${spec.tt.defaultDest} 방면`;
          }

          return {
            key: `search_${cleanName}_${spec.sid}_${spec.dir}`,
            stationName: cleanName === '서울' ? '서울' : cleanName,
            dispStationTitle: `${dispStation} ${lineMeta.badge} [${spec.dir}]`,
            subwayId: spec.sid,
            updnLine: spec.dir,
            dirDesc,
            defaultDest: spec.tt.defaultDest || '',
            scheduleObj: (spec.tt.scheduleObj && Object.keys(spec.tt.scheduleObj).length > 0) ? spec.tt.scheduleObj : null
          };
        });

        this.rerenderCurrent();

        if (this.liveBadge) {
          const now = new Date();
          this.liveBadge.textContent = `⚡ ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 갱신`;
        }

        // 20초 주기 자동 새로고침
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        this.refreshTimer = setInterval(() => {
          if (!document.hidden && this.currentStation) {
            this.lookupStation(this.currentStation, false);
          }
        }, 20000);

        if (scrollAfter && this.resultContainer) {
          setTimeout(() => {
            this.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 60);
        }
      } catch (err) {
        console.error('[SubwayLookup] 오류:', err);
      }
    }

    openCardTimetable(cardKey) {
      const found = this.lastLineCards.find(c => c.key === cardKey);
      if (!found || !window.transitManager) return;
      window.transitManager.openCustomTimetableModal(
        found.dispStationTitle,
        found.dirDesc,
        found.scheduleObj,
        found.defaultDest
      );
    }

    rerenderCurrent() {
      if (!this.resultContainer || !window.transitManager || this.lastLineCards.length === 0) return;

      const html = this.lastLineCards.map(c =>
        window.transitManager.renderSubwayBitCardHtml({
          key: c.key,
          stationName: c.stationName,
          subwayId: c.subwayId,
          updnLine: c.updnLine,
          title: c.dispStationTitle,
          dirDesc: c.dirDesc,
          defaultDest: c.defaultDest,
          rawArrivals: this.lastRawArrivals,
          scheduleObj: c.scheduleObj,
          onOpenTimetableJs: `window.subwayLookup && window.subwayLookup.openCardTimetable('${c.key}')`
        })
      ).join('');

      this.resultContainer.innerHTML = html;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.subwayLookup = new SubwayLookupController();
  });
})();
