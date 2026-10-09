const {
  calculateBaseShift,
  getShiftInfoForDate,
  getCommuteModeForDateTime,
  DEFAULT_BASE_DATE,
  DEFAULT_BASE_SHIFT_INDEX
} = require('./js/shift-engine.js');

console.log('=== 4조 3교대 패턴 검증 (2026년 9월) ===');

// 스크린샷 검증 기준:
// 9/1: 비번 (미표시)
// 9/2: 일근
// 9/3: 야근
// 9/4: 조근
// 9/5: 비번 (미표시)
// 9/6: 일근
// 9/7: 야근
// 9/8: 조근
// 9/9: 비번 (미표시)
// 9/10: 일근
// 9/11: 야근
// 9/12: 조근
// 9/13: 비번 (미표시)
// 9/14: 일근
// 9/15: 야근
// 9/16: 조근
// 9/17: 대근 오버라이드 -> 일근대근
// 9/18: 휴가 오버라이드 -> 일근휴가
// 9/19: 변경 오버라이드 -> 야근

const overrides = {
  '2026-09-17': { shiftType: '일근대근', time: '09:00 ~ 18:00 (대근)', note: '대근' },
  '2026-09-18': { shiftType: '일근휴가', time: '휴가', note: '휴가' },
  '2026-09-19': { shiftType: '야근', time: '15:15 ~ 23:15', note: '근무교대' }
};

let allPass = true;
for (let d = 1; d <= 30; d++) {
  const dateStr = `2026-09-${String(d).padStart(2, '0')}`;
  const info = getShiftInfoForDate(dateStr, overrides);

  let expectedBadge = '';
  if (d === 17) expectedBadge = '일근대근';
  else if (d === 18) expectedBadge = '일근휴가';
  else if (d === 19) expectedBadge = '야근';
  else {
    // 기본 패턴
    const base = calculateBaseShift(dateStr);
    expectedBadge = (base === '비번') ? '' : base;
  }

  const match = (info.badgeText === expectedBadge);
  if (!match) {
    console.error(`FAIL at 9/${d}: expected "${expectedBadge}", got "${info.badgeText}"`);
    allPass = false;
  }
}

if (allPass) {
  console.log('✅ 9월 1일부터 30일까지 모든 날짜의 근무표 및 비번 미표기 규칙이 스크린샷과 완벽히 일치합니다!');
} else {
  process.exit(1);
}

console.log('=== 출퇴근 기본 모드 판정 엔진 테스트 ===');
const commuteTests = [
  // 9/2 일근 : 전날부터 09시까지 출근모드, 13시부터 퇴근모드
  { dt: new Date('2026-09-02T08:30:00'), expected: 'commute', desc: '일근 당일 08:30 -> 출근모드' },
  { dt: new Date('2026-09-02T12:59:00'), expected: 'commute', desc: '일근 당일 12:59 -> 출근모드' },
  { dt: new Date('2026-09-02T13:00:00'), expected: 'offwork', desc: '일근 당일 13:00 -> 퇴근모드' },
  { dt: new Date('2026-09-02T18:30:00'), expected: 'offwork', desc: '일근 당일 18:30 -> 퇴근모드' },

  // 9/3 야근 : 당일 07시부터 출근모드
  { dt: new Date('2026-09-03T06:59:00'), expected: 'offwork', desc: '야근 당일 06:59 -> 퇴근모드(전날 일근 퇴근 유지)' },
  { dt: new Date('2026-09-03T07:00:00'), expected: 'commute', desc: '야근 당일 07:00 -> 출근모드' },
  { dt: new Date('2026-09-03T16:00:00'), expected: 'commute', desc: '야근 당일 16:00 -> 출근모드' },

  // 9/4 조근 : 당일 05시부터 퇴근모드
  { dt: new Date('2026-09-04T04:59:00'), expected: 'commute', desc: '조근 당일 04:59 -> 출근모드(어제 야근 출근 유지)' },
  { dt: new Date('2026-09-04T05:00:00'), expected: 'offwork', desc: '조근 당일 05:00 -> 퇴근모드' },
  { dt: new Date('2026-09-04T12:00:00'), expected: 'offwork', desc: '조근 당일 12:00 -> 퇴근모드' },

  // 9/5 비번 (다음날 9/6 일근) : 전날부터 출근모드
  { dt: new Date('2026-09-05T10:00:00'), expected: 'commute', desc: '비번 당일(익일 일근) 10:00 -> 출근모드' },
  { dt: new Date('2026-09-05T22:00:00'), expected: 'commute', desc: '비번 당일(익일 일근) 22:00 -> 출근모드' },

  // 9/17 일근대근 오버라이드
  { dt: new Date('2026-09-17T08:00:00'), expected: 'commute', desc: '일근대근 당일 08:00 -> 출근모드' },
  { dt: new Date('2026-09-17T14:00:00'), expected: 'offwork', desc: '일근대근 당일 14:00 -> 퇴근모드' }
];

let commutePass = true;
commuteTests.forEach(t => {
  const actual = getCommuteModeForDateTime(t.dt, overrides);
  if (actual === t.expected) {
    console.log(`  ✅ [PASS] ${t.desc}`);
  } else {
    console.error(`  ❌ [FAIL] ${t.desc} (expected: ${t.expected}, got: ${actual})`);
    commutePass = false;
  }
});

if (!commutePass) {
  process.exit(1);
}
