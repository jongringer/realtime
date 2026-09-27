// 4조 3교대 근무 계산 엔진
// 기본 패턴 순서: 일근 -> 야근 -> 조근 -> 비번 (4일 주기)
const SHIFT_PATTERN = ['일근', '야근', '조근', '비번'];

// 교대근무 기준 정보 (근무 시각 제거 - 일근/야근/조근/비번 명칭만 유지)
const SHIFT_STANDARDS = {
  '일근': {
    code: 'X',
    name: '일근',
    defaultTime: '',
    colorClass: 'shift-day',
    badgeText: '일근'
  },
  '야근': {
    code: 'M',
    name: '야근',
    defaultTime: '',
    colorClass: 'shift-night',
    badgeText: '야근'
  },
  '조근': {
    code: '/',
    name: '조근',
    defaultTime: '',
    colorClass: 'shift-early',
    badgeText: '조근'
  },
  '비번': {
    code: 'O',
    name: '비번',
    defaultTime: '',
    colorClass: 'shift-off',
    badgeText: ''
  }
};

// 기준일 기본값: 2026-09-02가 '일근' (index 0)
// 이에 따라 2026-09-01은 '비번'(index 3), 2026-08-31은 '조근'(index 2)이 됨
const DEFAULT_BASE_DATE = '2026-09-02';
const DEFAULT_BASE_SHIFT_INDEX = 0; // '일근'

/**
 * 날짜 문자열(YYYY-MM-DD)로부터 자정 기준 Date 객체 생성 (로컬 타임존 일관성 유지)
 */
function parseDateString(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Date 객체를 YYYY-MM-DD 문자열로 변환
 */
function formatDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 특정 날짜의 기본 4조3교대 근무를 계산
 * @param {string} targetDateStr - 'YYYY-MM-DD'
 * @param {string} baseDateStr - 기준일 'YYYY-MM-DD'
 * @param {number} baseShiftIndex - 기준일의 근무 인덱스 (0: 일근, 1: 야근, 2: 조근, 3: 비번)
 * @returns {string} '일근' | '야근' | '조근' | '비번'
 */
function calculateBaseShift(targetDateStr, baseDateStr = DEFAULT_BASE_DATE, baseShiftIndex = DEFAULT_BASE_SHIFT_INDEX) {
  const target = parseDateString(targetDateStr);
  const base = parseDateString(baseDateStr);

  const diffTime = target.getTime() - base.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let index = (baseShiftIndex + diffDays) % 4;
  if (index < 0) {
    index += 4;
  }

  return SHIFT_PATTERN[index];
}

/**
 * 전달 마지막 날의 근무로부터 이번 달 1일의 근무를 계산
 * @param {string} lastMonthEndShift - 전달 마지막 날의 근무 ('일근' | '야근' | '조근' | '비번')
 * @returns {string} 이번 달 1일의 근무
 */
function getNextShiftFromPrevious(lastMonthEndShift) {
  const idx = SHIFT_PATTERN.indexOf(lastMonthEndShift);
  if (idx === -1) return '일근';
  return SHIFT_PATTERN[(idx + 1) % 4];
}

/**
 * 특정 날짜의 최종 근무 정보 (대근/휴가 오버라이드 포함) 산출
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {Object} overrides - { [dateStr]: { shiftType: '일근대근' | '일근휴가' ..., time: '09:00 ~ 18:00 (대근)', note: '대근' } }
 * @param {Object} baseSettings - { baseDate, baseShiftIndex }
 */
function getShiftInfoForDate(dateStr, overrides = {}, baseSettings = {}) {
  const baseDate = baseSettings.baseDate || DEFAULT_BASE_DATE;
  const baseShiftIndex = baseSettings.baseShiftIndex !== undefined ? baseSettings.baseShiftIndex : DEFAULT_BASE_SHIFT_INDEX;

  const baseShift = calculateBaseShift(dateStr, baseDate, baseShiftIndex);

  // 오버라이드(대근, 휴가, 수동변경) 확인
  if (overrides && overrides[dateStr]) {
    const override = overrides[dateStr];
    const shiftType = override.shiftType; // 예: '일근대근', '일근휴가', '야근', etc.
    
    let colorClass = 'shift-day';
    let timeText = override.time || '';
    let badgeText = '';

    if (shiftType.includes('대근')) {
      colorClass = 'shift-overtime'; // 빨간색
      badgeText = shiftType.replace(/^[⚡\s]+/, '');
    } else if (shiftType.includes('휴가')) {
      colorClass = 'shift-vacation'; // 녹색
      badgeText = shiftType.replace(/^[🌿\s]+/, '');
    } else if (shiftType === '야근' || shiftType.includes('야근')) {
      colorClass = 'shift-night';
      badgeText = '야근';
    } else if (shiftType === '조근' || shiftType.includes('조근')) {
      colorClass = 'shift-early';
      badgeText = '조근';
    } else if (shiftType === '비번' || shiftType === '') {
      colorClass = 'shift-off';
      badgeText = '';
    } else {
      colorClass = 'shift-day';
      badgeText = '일근';
    }

    return {
      dateStr,
      baseShift,
      shiftType,
      isOverride: true,
      colorClass,
      badgeText,
      timeText,
      note: override.note || '',
      noteTime: override.noteTime || ''
    };
  }

  // 기본 근무
  const standard = SHIFT_STANDARDS[baseShift];
  const isOff = baseShift === '비번';

  return {
    dateStr,
    baseShift,
    shiftType: baseShift,
    isOverride: false,
    colorClass: standard.colorClass,
    badgeText: isOff ? '' : standard.badgeText, // 비번은 미표시
    timeText: standard.defaultTime,
    note: '',
    noteTime: ''
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SHIFT_PATTERN,
    SHIFT_STANDARDS,
    DEFAULT_BASE_DATE,
    DEFAULT_BASE_SHIFT_INDEX,
    parseDateString,
    formatDateString,
    calculateBaseShift,
    getNextShiftFromPrevious,
    getShiftInfoForDate
  };
}
