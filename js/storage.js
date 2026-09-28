const STORAGE_KEYS = {
  PROFILE: 'shift_app_profile',
  BASE_SETTINGS: 'shift_app_base_settings',
  OVERRIDES: 'shift_app_overrides',
  SCHEDULES: 'shift_app_schedules',
  ALARM_SETTINGS: 'shift_app_alarm_settings'
};

// 기본 알람 설정 (일근 06:00, 야근 15:00, 조근 05:20)
const DEFAULT_ALARM_SETTINGS = {
  day: '06:00',
  night: '15:00',
  early: '05:20'
};

// 스크린샷과 1:1로 일치하는 기본 초기 데이터
const DEFAULT_INITIAL_DATA = {
  profile: {
    name: '최종철 님',
    team: '생방기술1 · 직무 NDC',
    avatar: '최'
  },
  baseSettings: {
    baseDate: '2026-09-02',
    baseShiftIndex: 0 // 2026-09-02: '일근' (이에 따라 9/1은 비번, 8/31은 조근)
  },
  overrides: {
    '2026-09-17': {
      shiftType: '일근대근',
      time: '',
      alarm: '',
      note: ''
    },
    '2026-09-18': {
      shiftType: '일근휴가',
      time: '',
      alarm: '',
      note: ''
    },
    '2026-09-19': {
      shiftType: '야근',
      time: '',
      alarm: '',
      note: ''
    },
    // 10월 근무표 스크린샷 1:1 반영 (23일, 31일 일근대근)
    '2026-10-23': {
      shiftType: '일근대근',
      time: '',
      alarm: '',
      note: ''
    },
    '2026-10-31': {
      shiftType: '일근대근',
      time: '',
      alarm: '',
      note: ''
    }
  },
  schedules: []
};

class ShiftStorage {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.PROFILE)) {
      this.setProfile(DEFAULT_INITIAL_DATA.profile);
    }
    if (!localStorage.getItem(STORAGE_KEYS.BASE_SETTINGS)) {
      this.setBaseSettings(DEFAULT_INITIAL_DATA.baseSettings);
    }
    
    // OVERRIDES 로드 및 9월·10월 기본 특이사항(대근, 휴가) 자동 보충 머지
    const storedOverridesRaw = localStorage.getItem(STORAGE_KEYS.OVERRIDES);
    if (!storedOverridesRaw) {
      this.setOverrides(DEFAULT_INITIAL_DATA.overrides);
    } else {
      try {
        const storedOverrides = JSON.parse(storedOverridesRaw) || {};
        let updated = false;
        // 기본 9월 특이사항(17일, 18일) 및 10월 특이사항(23일, 31일)이 없으면 자동 채움
        for (const [k, v] of Object.entries(DEFAULT_INITIAL_DATA.overrides)) {
          if (!storedOverrides[k]) {
            storedOverrides[k] = v;
            updated = true;
          }
        }
        if (updated) {
          this.setOverrides(storedOverrides);
        }
      } catch (e) {
        this.setOverrides(DEFAULT_INITIAL_DATA.overrides);
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.SCHEDULES)) {
      this.setSchedules(DEFAULT_INITIAL_DATA.schedules);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ALARM_SETTINGS)) {
      this.setAlarmSettings(DEFAULT_ALARM_SETTINGS);
    }
  }

  getAlarmSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ALARM_SETTINGS);
      return data ? { ...DEFAULT_ALARM_SETTINGS, ...JSON.parse(data) } : DEFAULT_ALARM_SETTINGS;
    } catch (e) {
      return DEFAULT_ALARM_SETTINGS;
    }
  }

  setAlarmSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.ALARM_SETTINGS, JSON.stringify(settings));
  }

  getProfile() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? JSON.parse(data) : DEFAULT_INITIAL_DATA.profile;
    } catch (e) {
      return DEFAULT_INITIAL_DATA.profile;
    }
  }

  setProfile(profile) {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }

  getBaseSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BASE_SETTINGS);
      return data ? JSON.parse(data) : DEFAULT_INITIAL_DATA.baseSettings;
    } catch (e) {
      return DEFAULT_INITIAL_DATA.baseSettings;
    }
  }

  setBaseSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.BASE_SETTINGS, JSON.stringify(settings));
  }

  getOverrides() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OVERRIDES);
      return data ? JSON.parse(data) : DEFAULT_INITIAL_DATA.overrides;
    } catch (e) {
      return DEFAULT_INITIAL_DATA.overrides;
    }
  }

  setOverrides(overrides) {
    localStorage.setItem(STORAGE_KEYS.OVERRIDES, JSON.stringify(overrides));
  }

  setOverrideForDate(dateStr, overrideData) {
    const overrides = this.getOverrides();
    if (!overrideData) {
      delete overrides[dateStr];
    } else {
      overrides[dateStr] = overrideData;
    }
    this.setOverrides(overrides);
  }

  removeOverrideForDate(dateStr) {
    const overrides = this.getOverrides();
    delete overrides[dateStr];
    this.setOverrides(overrides);
  }

  getSchedules() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
      return data ? JSON.parse(data) : DEFAULT_INITIAL_DATA.schedules;
    } catch (e) {
      return DEFAULT_INITIAL_DATA.schedules;
    }
  }

  setSchedules(schedules) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  }

  addSchedule(schedule) {
    const schedules = this.getSchedules();
    const newSchedule = {
      id: 'sch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      ...schedule
    };
    schedules.push(newSchedule);
    // 날짜 및 시간순 정렬
    schedules.sort((a, b) => {
      if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
      return a.timeStr.localeCompare(b.timeStr);
    });
    this.setSchedules(schedules);
    return newSchedule;
  }

  removeSchedule(id) {
    let schedules = this.getSchedules();
    schedules = schedules.filter(s => s.id !== id);
    this.setSchedules(schedules);
  }

  getSchedulesForDate(dateStr) {
    const schedules = this.getSchedules();
    return schedules.filter(s => s.dateStr === dateStr);
  }

  resetToDefault() {
    this.setProfile(DEFAULT_INITIAL_DATA.profile);
    this.setBaseSettings(DEFAULT_INITIAL_DATA.baseSettings);
    this.setOverrides(DEFAULT_INITIAL_DATA.overrides);
    this.setSchedules(DEFAULT_INITIAL_DATA.schedules);
    this.setAlarmSettings(DEFAULT_ALARM_SETTINGS);
  }
}

// 전역 인스턴스 생성
const shiftStorage = new ShiftStorage();
