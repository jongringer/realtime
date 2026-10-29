const STORAGE_KEYS = {
  PROFILE: 'realtime_app_profile',
  WORK_MODE: 'realtime_app_work_mode',
  BASE_SETTINGS: 'realtime_app_base_settings',
  OVERRIDES: 'realtime_app_overrides',
  SCHEDULES: 'realtime_app_schedules',
  ALARM_SETTINGS: 'realtime_app_alarm_settings',
  ACTIVE_ALARMS: 'realtime_app_active_alarms',
  SEEDED: 'realtime_app_seeded_v1',
  UPDATED_AT: 'realtime_app_updated_at'
};

// 기본 알람 설정 (통상 07:30 / 일근 06:00, 야근 15:00, 조근 05:20)
const DEFAULT_ALARM_SETTINGS = {
  regular: '07:30',
  day: '06:00',
  night: '15:00',
  early: '05:20'
};

// 사용자별 직접 입력형 클린 초기 데이터 (특정인 개인정보 없음)
const DEFAULT_INITIAL_DATA = {
  profile: {
    name: '',
    team: '',
    avatar: '👤'
  },
  workMode: 'regular', // 'regular' (통상근무) | 'shift4' (4교대근무)
  baseSettings: {
    baseDate: '2026-09-02',
    baseShiftIndex: 0
  },
  overrides: {},
  schedules: []
};

function parseScheduleTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 9999;
  const clean = timeStr.trim();
  if (!clean) return 9999;

  let isPM = false;
  let isAM = false;
  if (/오후|pm/i.test(clean)) isPM = true;
  if (/오전|am/i.test(clean)) isAM = true;

  const nums = clean.match(/\d+/g);
  if (!nums || nums.length === 0) return 9999;

  let hours = parseInt(nums[0], 10);
  let minutes = nums.length > 1 ? parseInt(nums[1], 10) : 0;

  if (isPM) {
    if (hours < 12) hours += 12;
  } else if (isAM) {
    if (hours === 12) hours = 0;
  }
  hours = Math.max(0, Math.min(23, hours));
  minutes = Math.max(0, Math.min(59, minutes));

  return hours * 60 + minutes;
}

class ShiftStorage {
  constructor() {
    this.init();
  }

  init() {
    if (typeof localStorage === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEYS.PROFILE)) {
      this.setProfile(DEFAULT_INITIAL_DATA.profile);
    }
    if (!localStorage.getItem(STORAGE_KEYS.WORK_MODE)) {
      this.setWorkMode(DEFAULT_INITIAL_DATA.workMode);
    }
    if (!localStorage.getItem(STORAGE_KEYS.BASE_SETTINGS)) {
      this.setBaseSettings(DEFAULT_INITIAL_DATA.baseSettings);
    }
    if (!localStorage.getItem(STORAGE_KEYS.OVERRIDES)) {
      this.setOverrides(DEFAULT_INITIAL_DATA.overrides);
      localStorage.setItem(STORAGE_KEYS.SEEDED, '1');
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCHEDULES)) {
      this.setSchedules(DEFAULT_INITIAL_DATA.schedules);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ALARM_SETTINGS)) {
      this.setAlarmSettings(DEFAULT_ALARM_SETTINGS);
    }
  }

  getWorkMode() {
    try {
      const mode = localStorage.getItem(STORAGE_KEYS.WORK_MODE);
      return mode === 'shift4' ? 'shift4' : 'regular';
    } catch (e) {
      return 'regular';
    }
  }

  setWorkMode(mode) {
    const normalized = mode === 'shift4' ? 'shift4' : 'regular';
    try {
      localStorage.setItem(STORAGE_KEYS.WORK_MODE, normalized);
    } catch (e) {}
    return normalized;
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
    localStorage.setItem(STORAGE_KEYS.ALARM_SETTINGS, JSON.stringify({ ...DEFAULT_ALARM_SETTINGS, ...settings }));
  }

  getActiveAlarms() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_ALARMS);
      if (!data) return {};
      const alarms = JSON.parse(data);
      const now = Date.now();
      let changed = false;

      for (const [dateStr, alarmObj] of Object.entries(alarms)) {
        if (!dateStr || !dateStr.includes('-')) continue;
        const [y, m, d] = dateStr.split('-').map(Number);
        if (!y || !m || !d) continue;

        let hour = 23, minute = 59;
        if (alarmObj && alarmObj.time && alarmObj.time.includes(':')) {
          const parts = alarmObj.time.split(':').map(Number);
          if (!isNaN(parts[0])) hour = parts[0];
          if (!isNaN(parts[1])) minute = parts[1];
        }

        const alarmTimestamp = new Date(y, m - 1, d, hour, minute, 0).getTime();
        const expireThreshold = alarmTimestamp + (2 * 60 * 60 * 1000);
        if (now >= expireThreshold) {
          delete alarms[dateStr];
          changed = true;
        }
      }

      if (changed) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ALARMS, JSON.stringify(alarms));
      }

      return alarms;
    } catch (e) {
      return {};
    }
  }

  isAlarmActive(dateStr) {
    const alarms = this.getActiveAlarms();
    return !!alarms[dateStr];
  }

  addActiveAlarm(dateStr, alarmData = {}) {
    const alarms = this.getActiveAlarms();
    alarms[dateStr] = {
      time: alarmData.time || '',
      type: alarmData.type || '',
      setAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ALARMS, JSON.stringify(alarms));
  }

  removeActiveAlarm(dateStr) {
    const alarms = this.getActiveAlarms();
    if (alarms[dateStr]) {
      delete alarms[dateStr];
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ALARMS, JSON.stringify(alarms));
    }
  }

  getProfile() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? { ...DEFAULT_INITIAL_DATA.profile, ...JSON.parse(data) } : DEFAULT_INITIAL_DATA.profile;
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

  getUpdatedAt() {
    try {
      return Number(localStorage.getItem(STORAGE_KEYS.UPDATED_AT) || 0);
    } catch (e) {
      return 0;
    }
  }

  setUpdatedAt(ts) {
    try {
      localStorage.setItem(STORAGE_KEYS.UPDATED_AT, String(Number(ts) || 0));
    } catch (e) {
      console.warn('[ShiftStorage] setUpdatedAt 오류:', e);
    }
  }

  markModified() {
    const prev = this.getUpdatedAt();
    const next = Math.max(Date.now(), prev + 1);
    this.setUpdatedAt(next);
    if (typeof window !== 'undefined' && window.syncEngine && typeof window.syncEngine.pushNow === 'function') {
      window.syncEngine.pushNow();
    }
    return next;
  }

  setOverrides(overrides) {
    localStorage.setItem(STORAGE_KEYS.OVERRIDES, JSON.stringify(overrides));
    localStorage.setItem(STORAGE_KEYS.SEEDED, '1');
  }

  setOverrideForDate(dateStr, overrideData) {
    const overrides = this.getOverrides();
    if (!overrideData) {
      delete overrides[dateStr];
    } else {
      overrides[dateStr] = {
        ...overrideData,
        updatedAt: Date.now()
      };
    }
    this.setOverrides(overrides);
    this.markModified();
  }

  removeOverrideForDate(dateStr) {
    const overrides = this.getOverrides();
    delete overrides[dateStr];
    this.setOverrides(overrides);
    this.markModified();
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
    schedules.sort((a, b) => {
      if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
      const minA = parseScheduleTimeToMinutes(a.timeStr);
      const minB = parseScheduleTimeToMinutes(b.timeStr);
      if (minA !== minB) return minA - minB;
      return (a.id || '').localeCompare(b.id || '');
    });
    this.setSchedules(schedules);
    this.markModified();
    return newSchedule;
  }

  removeSchedule(id) {
    let schedules = this.getSchedules();
    schedules = schedules.filter(s => s.id !== id);
    this.setSchedules(schedules);
    this.markModified();
  }

  getSchedulesForDate(dateStr) {
    const schedules = this.getSchedules();
    const dayList = schedules.filter(s => s.dateStr === dateStr);
    return dayList.sort((a, b) => {
      const minA = parseScheduleTimeToMinutes(a.timeStr);
      const minB = parseScheduleTimeToMinutes(b.timeStr);
      if (minA !== minB) return minA - minB;
      return (a.id || '').localeCompare(b.id || '');
    });
  }

  resetToDefault() {
    this.setProfile(DEFAULT_INITIAL_DATA.profile);
    this.setWorkMode(DEFAULT_INITIAL_DATA.workMode);
    this.setBaseSettings(DEFAULT_INITIAL_DATA.baseSettings);
    this.setOverrides(DEFAULT_INITIAL_DATA.overrides);
    this.setSchedules(DEFAULT_INITIAL_DATA.schedules);
    this.setAlarmSettings(DEFAULT_ALARM_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ALARMS);
    this.markModified();
  }
}

const shiftStorage = new ShiftStorage();
if (typeof window !== 'undefined') {
  window.shiftStorage = shiftStorage;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ShiftStorage, shiftStorage, DEFAULT_INITIAL_DATA, STORAGE_KEYS, DEFAULT_ALARM_SETTINGS };
}
