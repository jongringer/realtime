// realtime 메인 애플리케이션 컨트롤러 (통상근무 순수 캘린더 + 4교대근무표 + 개인 일정·휴가 강조)

// 대한민국 공식 법정 공휴일 및 대체공휴일 전수 데이터베이스 (2024~2028년 완벽 대응)
const KR_HOLIDAYS_MAP = {
  // 2024년
  '2024-01-01': '신정',
  '2024-02-09': '설날 연휴',
  '2024-02-10': '설날',
  '2024-02-11': '설날 연휴',
  '2024-02-12': '대체공휴일',
  '2024-03-01': '삼일절',
  '2024-04-10': '국회의원선거',
  '2024-05-05': '어린이날',
  '2024-05-06': '대체공휴일',
  '2024-05-15': '부처님오신날',
  '2024-06-06': '현충일',
  '2024-08-15': '광복절',
  '2024-09-16': '추석 연휴',
  '2024-09-17': '추석',
  '2024-09-18': '추석 연휴',
  '2024-10-01': '국군의 날',
  '2024-10-03': '개천절',
  '2024-10-09': '한글날',
  '2024-12-25': '성탄절',

  // 2025년
  '2025-01-01': '신정',
  '2025-01-28': '설날 연휴',
  '2025-01-29': '설날',
  '2025-01-30': '설날 연휴',
  '2025-03-01': '삼일절',
  '2025-03-03': '대체공휴일',
  '2025-05-05': '어린이날·부처님오신날',
  '2025-05-06': '대체공휴일',
  '2025-06-06': '현충일',
  '2025-08-15': '광복절',
  '2025-10-03': '개천절',
  '2025-10-05': '추석 연휴',
  '2025-10-06': '추석',
  '2025-10-07': '추석 연휴',
  '2025-10-08': '대체공휴일',
  '2025-10-09': '한글날',
  '2025-12-25': '성탄절',

  // 2026년
  '2026-01-01': '신정',
  '2026-02-16': '설날 연휴',
  '2026-02-17': '설날',
  '2026-02-18': '설날 연휴',
  '2026-03-01': '삼일절',
  '2026-03-02': '대체공휴일',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일',
  '2026-06-03': '지방선거',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-08-17': '대체공휴일',
  '2026-09-24': '추석 연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석 연휴',
  '2026-10-03': '개천절',
  '2026-10-05': '대체공휴일',
  '2026-10-09': '한글날',
  '2026-12-25': '성탄절',

  // 2027년
  '2027-01-01': '신정',
  '2027-02-06': '설날 연휴',
  '2027-02-07': '설날',
  '2027-02-08': '설날 연휴',
  '2027-02-09': '대체공휴일',
  '2027-03-01': '삼일절',
  '2027-03-03': '대통령선거',
  '2027-05-05': '어린이날',
  '2027-05-13': '부처님오신날',
  '2027-06-06': '현충일',
  '2027-08-15': '광복절',
  '2027-08-16': '대체공휴일',
  '2027-09-14': '추석 연휴',
  '2027-09-15': '추석',
  '2027-09-16': '추석 연휴',
  '2027-10-03': '개천절',
  '2027-10-04': '대체공휴일',
  '2027-10-09': '한글날',
  '2027-10-11': '대체공휴일',
  '2027-12-25': '성탄절',
  '2027-12-27': '대체공휴일',

  // 2028년
  '2028-01-01': '신정',
  '2028-01-26': '설날 연휴',
  '2028-01-27': '설날',
  '2028-01-28': '설날 연휴',
  '2028-03-01': '삼일절',
  '2028-04-12': '국회의원선거',
  '2028-05-02': '부처님오신날',
  '2028-05-05': '어린이날',
  '2028-06-06': '현충일',
  '2028-08-15': '광복절',
  '2028-10-02': '추석 연휴',
  '2028-10-03': '개천절·추석',
  '2028-10-04': '추석 연휴',
  '2028-10-05': '대체공휴일',
  '2028-10-09': '한글날',
  '2028-12-25': '성탄절'
};

const FIXED_KR_HOLIDAYS = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '성탄절'
};

function getKoreanHolidayInfo(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const fullDateStr = `${y}-${m}-${d}`;
  const md = `${m}-${d}`;

  if (KR_HOLIDAYS_MAP[fullDateStr]) {
    return { isHoliday: true, name: KR_HOLIDAYS_MAP[fullDateStr] };
  }
  if (FIXED_KR_HOLIDAYS[md]) {
    return { isHoliday: true, name: FIXED_KR_HOLIDAYS[md] };
  }
  return { isHoliday: false, name: '' };
}

function isKoreanHoliday(dateObj) {
  return getKoreanHolidayInfo(dateObj).isHoliday;
}

if (typeof window !== 'undefined') {
  window.KR_HOLIDAYS_MAP = KR_HOLIDAYS_MAP;
  window.getKoreanHolidayInfo = getKoreanHolidayInfo;
  window.isKoreanHoliday = isKoreanHoliday;
}

class ShiftApp {
  constructor() {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth() + 1;
    this.todayDateStr = formatDateString(now);
    this.selectedDateStr = this.todayDateStr;

    this.autoResetTodayTimer = null;
    this.weatherData = null;
    this.weatherTimer = null;
    this.lastWeatherFetchTime = 0;
    this.isWeatherLoading = false;
    this.pendingSettingsMode = shiftStorage.getWorkMode();

    this._modalHistoryStack = [];
    this._isClosingFromPopstate = false;
    try {
      window.history.replaceState({ page: 'home', modalOpen: false }, '');
    } catch (e) {}

    try { this.initElements(); } catch (e) { console.error('initElements error:', e); }
    try { this.initEvents(); } catch (e) { console.error('initEvents error:', e); }
    try { this.initSwipeGesture(); } catch (e) { console.error('initSwipe error:', e); }

    try {
      const savedTheme = localStorage.getItem('realtime_app_theme') || localStorage.getItem('kbs_shift_theme') || 'apple-light';
      this.currentTheme = savedTheme;
      this.applyTheme(savedTheme, false);
    } catch (e) { console.error('applyTheme error:', e); }

    try { this.renderAll(); } catch (e) { console.error('renderAll error:', e); }
    try { this.startRealTimeClock(); } catch (e) { console.error('startRealTimeClock error:', e); }
    try { this.initWeather(); } catch (e) { console.error('initWeather error:', e); }
    try { this.initSelfAlarmMonitor(); } catch (e) { console.error('initSelfAlarmMonitor error:', e); }
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

  isRegularMode() {
    return shiftStorage.getWorkMode() !== 'shift4';
  }

  loadProfileToUI() {
    this.renderAll();
  }

  updateTodayCard() {
    this.renderTodayCard();
  }

  initElements() {
    this.profilePill = document.getElementById('profilePill');
    this.elAvatar = document.getElementById('headerAvatar');
    this.elName = document.getElementById('headerName');
    this.elTeam = document.getElementById('headerTeam');
    this.lastExtractedOcrText = '';

    // 근무형태 스위치 (메인 상단 바 + 환경설정 내 선택기)
    this.btnModeRegular = document.getElementById('btnModeRegular');
    this.btnModeShift4 = document.getElementById('btnModeShift4');
    this.btnSettingModeRegular = document.getElementById('btnSettingModeRegular');
    this.btnSettingModeShift4 = document.getElementById('btnSettingModeShift4');
    this.regularSettingsGroup = document.getElementById('regularSettingsGroup');
    this.shift4SettingsGroup = document.getElementById('shift4SettingsGroup');

    // 테마 토글
    this.btnThemeToggle = document.getElementById('btnThemeToggle');
    this.themeToggleIcon = document.getElementById('themeToggleIcon');
    this.themeToggleText = document.getElementById('themeToggleText');

    // 연월 네비게이션
    this.elMonthTitle = document.getElementById('monthTitle');
    this.btnPrevMonth = document.getElementById('btnPrevMonth');
    this.btnNextMonth = document.getElementById('btnNextMonth');
    this.btnHomeToday = document.getElementById('btnHomeToday');
    this.btnShiftAlarm = document.getElementById('btnShiftAlarm');
    this.btnShiftAlarmText = document.getElementById('btnShiftAlarmText');

    // 오늘 카드
    this.elRealTimeClock = document.getElementById('realTimeClock');
    this.elTodayDateText = document.getElementById('todayDateText');
    this.elTodayShiftBadge = document.getElementById('todayShiftBadge');
    this.elTodayTimeText = document.getElementById('todayTimeText');

    // 달력
    this.elCalendarGrid = document.getElementById('calendarGrid');

    // 근무표 업로드 모달
    this.btnOpenUploadModal = document.getElementById('btnOpenUploadModal');
    this.btnOpenUploadModalHeader = document.getElementById('btnOpenUploadModalHeader');
    this.modalUpload = document.getElementById('modalUpload');
    this.btnCloseUploadModal = document.getElementById('btnCloseUploadModal');
    this.fileInput = document.getElementById('fileInput');
    this.cameraInput = document.getElementById('cameraInput');
    this.galleryInput = document.getElementById('galleryInput');
    this.btnCameraSelect = document.getElementById('btnCameraSelect');
    this.btnGallerySelect = document.getElementById('btnGallerySelect');
    this.btnFileSelect = document.getElementById('btnFileSelect');
    this.dropzone = document.getElementById('dropzone');
    this.ocrProgressBox = document.getElementById('ocrProgressBox');
    this.progressBarFill = document.getElementById('progressBarFill');
    this.progressStatusText = document.getElementById('progressStatusText');
    this.ocrResultsArea = document.getElementById('ocrResultsArea');
    this.ocrResultsTbody = document.getElementById('ocrResultsTbody');
    this.btnApplyOcr = document.getElementById('btnApplyOcr');

    // 날짜별 개인 일정 & 휴가/근무 수정 모달
    this.modalDayEdit = document.getElementById('modalDayEdit');
    this.btnCloseDayEdit = document.getElementById('btnCloseDayEdit');
    this.btnCloseDayEditFooter = document.getElementById('btnCloseDayEditFooter');
    this.elEditDateTitle = document.getElementById('editDateTitle');
    this.editShiftSectionLabel = document.getElementById('editShiftSectionLabel');
    this.quickVacationChips = document.getElementById('quickVacationChips');
    this.elEditShiftSelect = document.getElementById('editShiftSelect');
    this.btnSaveShiftType = document.getElementById('btnSaveShiftType');
    this.elEditNoteInput = document.getElementById('editNoteInput');
    this.btnSaveDayEdit = document.getElementById('btnSaveDayEdit');
    this.dayScheduleCount = document.getElementById('dayScheduleCount');
    this.btnDeleteSelectedSchedules = document.getElementById('btnDeleteSelectedSchedules');
    this.dayScheduleItemsContainer = document.getElementById('dayScheduleItemsContainer');
    this.btnResetDayEdit = document.getElementById('btnResetDayEdit');

    // 선택된 날짜 요약 배너
    this.selectedScheduleBar = document.getElementById('selectedScheduleBar');
    this.selectedScheduleDatePill = document.getElementById('selectedScheduleDatePill');
    this.selectedScheduleText = document.getElementById('selectedScheduleText');

    // 시간 선택기
    this.editScheduleAmPm = document.getElementById('editScheduleAmPm');
    this.editScheduleHour = document.getElementById('editScheduleHour');
    this.editScheduleMinute = document.getElementById('editScheduleMinute');
    this.btnEditScheduleTimeClear = document.getElementById('btnEditScheduleTimeClear');
    this.editScheduleTimeBadge = document.getElementById('editScheduleTimeBadge');
    this.editScheduleTimeBadgeText = document.getElementById('editScheduleTimeBadgeText');
    this.isScheduleTimeEnabled = true;

    // 설정 모달
    this.modalSettings = document.getElementById('modalSettings');
    this.btnOpenSettings = document.getElementById('btnOpenSettings');
    this.btnCloseSettings = document.getElementById('btnCloseSettings');
    this.inputSettingName = document.getElementById('inputSettingName');
    this.inputSettingTeam = document.getElementById('inputSettingTeam');
    this.selectLastMonthEndShift = document.getElementById('selectLastMonthEndShift');
    this.settingAlarmRegular = document.getElementById('settingAlarmRegular');
    this.settingAlarmDay = document.getElementById('settingAlarmDay');
    this.settingAlarmNight = document.getElementById('settingAlarmNight');
    this.settingAlarmEarly = document.getElementById('settingAlarmEarly');
    this.btnSaveSettings = document.getElementById('btnSaveSettings');
    this.btnResetAllData = document.getElementById('btnResetAllData');

    // 알람 팝업 모달
    this.modalAlarmPopup = document.getElementById('modalAlarmPopup');
    this.alarmPopupShiftBadge = document.getElementById('alarmPopupShiftBadge');
    this.alarmPopupTargetTime = document.getElementById('alarmPopupTargetTime');
    this.alarmPopupSelfTime = document.getElementById('alarmPopupSelfTime');
    this.alarmPopupRemainTime = document.getElementById('alarmPopupRemainTime');
    this.btnCancelAlarmPopup = document.getElementById('btnCancelAlarmPopup');
    this.btnDismissAlarmPopup = document.getElementById('btnDismissAlarmPopup');
    this.btnConfirmAlarmPopup = document.getElementById('btnConfirmAlarmPopup');
    this.btnTestSelfAlarm = document.getElementById('btnTestSelfAlarm');
    this.pendingAlarmData = null;

    // 자체 알람 팝업
    this.modalSelfAlarmRing = document.getElementById('modalSelfAlarmRing');
    this.selfAlarmRingBadge = document.getElementById('selfAlarmRingBadge');
    this.selfAlarmRingTime = document.getElementById('selfAlarmRingTime');
    this.btnDismissSelfAlarmClock = document.getElementById('btnDismissSelfAlarmClock');
    this.btnDismissSelfAlarmBar = document.getElementById('btnDismissSelfAlarmBar');

    this.isSelfAlarmRinging = false;
    this.currentSelfAlarmDateStr = null;
    this.alarmAudioCtx = null;
    this.selfAlarmInterval = null;
    this.selfAlarmVibrateInterval = null;

    // 월간 통계/요약 모달
    this.btnOpenSummary = document.getElementById('btnOpenSummary');
    this.modalSummary = document.getElementById('modalSummary');
    this.btnCloseSummary = document.getElementById('btnCloseSummary');
    this.btnCloseSummaryFooter = document.getElementById('btnCloseSummaryFooter');
    this.summaryContent = document.getElementById('summaryContent');

    // 이달의 일정 및 휴가 / 특이사항
    this.monthlyNotesList = document.getElementById('monthlyNotesList');
    this.monthlyNotesSectionTitle = document.getElementById('monthlyNotesSectionTitle');
    this.btnRefreshMonthlyNotes = document.getElementById('btnRefreshMonthlyNotes');
  }

  openSettingsAndFocusName(focusName = false) {
    const profile = shiftStorage.getProfile();
    if (this.inputSettingName) this.inputSettingName.value = profile.name || '';
    if (this.inputSettingTeam) this.inputSettingTeam.value = profile.team || '';

    this.pendingSettingsMode = shiftStorage.getWorkMode();
    this.syncSettingsModeUI(this.pendingSettingsMode);

    if (this.selectLastMonthEndShift) {
      this.selectLastMonthEndShift.value = '';
    }

    const alarmSettings = shiftStorage.getAlarmSettings();
    if (this.settingAlarmRegular) this.settingAlarmRegular.value = alarmSettings.regular || '07:30';
    if (this.settingAlarmDay) this.settingAlarmDay.value = alarmSettings.day || '06:00';
    if (this.settingAlarmNight) this.settingAlarmNight.value = alarmSettings.night || '15:00';
    if (this.settingAlarmEarly) this.settingAlarmEarly.value = alarmSettings.early || '05:20';

    this.openModal(this.modalSettings);
    if (focusName && this.inputSettingName) {
      setTimeout(() => {
        this.inputSettingName.focus();
      }, 150);
    }
  }

  syncSettingsModeUI(mode) {
    const isShift4 = (mode === 'shift4');
    if (this.btnSettingModeRegular) this.btnSettingModeRegular.classList.toggle('active', !isShift4);
    if (this.btnSettingModeShift4) this.btnSettingModeShift4.classList.toggle('active', isShift4);
    if (this.regularSettingsGroup) this.regularSettingsGroup.style.display = isShift4 ? 'none' : 'block';
    if (this.shift4SettingsGroup) this.shift4SettingsGroup.style.display = isShift4 ? 'block' : 'none';
  }

  switchWorkMode(mode, showToast = true) {
    const normalized = (mode === 'shift4') ? 'shift4' : 'regular';
    shiftStorage.setWorkMode(normalized);
    this.pendingSettingsMode = normalized;
    if (document.body) {
      document.body.setAttribute('data-work-mode', normalized);
    }
    this.renderAll();
    this.loadWeather(false);
    if (showToast) {
      const label = normalized === 'shift4' ? '🔄 4교대근무 모드 (근무표 + 일정·휴가)' : '🗓️ 통상근무 모드 (순수 캘린더 + 일정·휴가)';
      this.showWeatherToast(`${label}로 전환되었습니다.`);
    }
  }

  initEvents() {
    // 좌상단 프로필 클릭 시 본인 이름 입력 팝업 오픈
    if (this.profilePill) {
      this.profilePill.addEventListener('click', () => {
        this.openSettingsAndFocusName(true);
      });
      this.profilePill.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openSettingsAndFocusName(true);
        }
      });
    }

    // 상단 근무형태 원터치 전환 (통상근무 vs 4교대근무)
    if (this.btnModeRegular) {
      this.btnModeRegular.addEventListener('click', () => this.switchWorkMode('regular', true));
    }
    if (this.btnModeShift4) {
      this.btnModeShift4.addEventListener('click', () => this.switchWorkMode('shift4', true));
    }

    // 설정 모달 내 근무형태 버튼
    if (this.btnSettingModeRegular) {
      this.btnSettingModeRegular.addEventListener('click', () => {
        this.pendingSettingsMode = 'regular';
        this.syncSettingsModeUI('regular');
      });
    }
    if (this.btnSettingModeShift4) {
      this.btnSettingModeShift4.addEventListener('click', () => {
        this.pendingSettingsMode = 'shift4';
        this.syncSettingsModeUI('shift4');
      });
    }

    // 월 이동
    if (this.btnPrevMonth) {
      this.btnPrevMonth.addEventListener('click', () => this.changeMonth('prev'));
    }
    if (this.btnNextMonth) {
      this.btnNextMonth.addEventListener('click', () => this.changeMonth('next'));
    }
    if (this.btnHomeToday) {
      this.btnHomeToday.addEventListener('click', () => this.goToToday());
    }
    if (this.elTodayShiftBadge) {
      this.elTodayShiftBadge.style.cursor = 'pointer';
      this.elTodayShiftBadge.addEventListener('click', () => {
        this.openDayEditModal(this.selectedDateStr || this.todayDateStr);
      });
    }

    // 알람 버튼
    if (this.btnShiftAlarm) {
      this.btnShiftAlarm.addEventListener('click', () => this.handleShiftAlarmClick());
    }
    if (this.btnCancelAlarmPopup) {
      this.btnCancelAlarmPopup.addEventListener('click', () => this.closeModal(this.modalAlarmPopup));
    }
    if (this.btnDismissAlarmPopup) {
      this.btnDismissAlarmPopup.addEventListener('click', () => this.executeDismissAlarm());
    }
    if (this.btnConfirmAlarmPopup) {
      this.btnConfirmAlarmPopup.addEventListener('click', () => this.executeSetAlarm());
    }

    if (this.btnDismissSelfAlarmClock) {
      this.btnDismissSelfAlarmClock.addEventListener('click', () => this.dismissSelfAlarm());
    }
    if (this.btnDismissSelfAlarmBar) {
      this.btnDismissSelfAlarmBar.addEventListener('click', () => this.dismissSelfAlarm());
    }
    if (this.btnTestSelfAlarm) {
      this.btnTestSelfAlarm.addEventListener('click', () => {
        this.closeModal(this.modalAlarmPopup);
        this.showWeatherToast('🔔 1초 뒤 알람시계가 화면에 울립니다.');
        setTimeout(() => {
          const testDateStr = this.pendingAlarmData ? this.pendingAlarmData.dateStr : this.todayDateStr;
          const testShift = this.pendingAlarmData ? this.pendingAlarmData.shiftType : (this.isRegularMode() ? '통상근무' : '일근');
          const now = new Date();
          const h = now.getHours();
          const m = now.getMinutes();
          this.triggerSelfAlarm(testDateStr, { time: `${h}:${m}`, type: testShift }, h, m);
        }, 1000);
      });
    }

    // 근무표 업로드 모달
    if (this.btnOpenUploadModal) {
      this.btnOpenUploadModal.addEventListener('click', () => {
        this.renderUploadModalSpecialNotes();
        this.openModal(this.modalUpload);
      });
    }
    if (this.btnOpenUploadModalHeader) {
      this.btnOpenUploadModalHeader.addEventListener('click', () => {
        this.renderUploadModalSpecialNotes();
        this.openModal(this.modalUpload);
      });
    }
    if (this.btnCloseUploadModal) {
      this.btnCloseUploadModal.addEventListener('click', () => this.closeModal(this.modalUpload));
    }

    if (this.btnCameraSelect && this.cameraInput) {
      this.btnCameraSelect.addEventListener('click', () => this.cameraInput.click());
      this.cameraInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) this.handleFileUpload(e.target.files[0]);
      });
    }
    if (this.btnGallerySelect && this.galleryInput) {
      this.btnGallerySelect.addEventListener('click', () => this.galleryInput.click());
      this.galleryInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) this.handleFileUpload(e.target.files[0]);
      });
    }
    if (this.btnFileSelect && this.fileInput) {
      this.btnFileSelect.addEventListener('click', () => this.fileInput.click());
    }
    if (this.dropzone && this.fileInput) {
      this.dropzone.addEventListener('click', () => this.fileInput.click());
      this.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.dropzone.classList.add('dragover');
      });
      this.dropzone.addEventListener('dragleave', () => {
        this.dropzone.classList.remove('dragover');
      });
      this.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          this.handleFileUpload(e.dataTransfer.files[0]);
        }
      });
      this.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleFileUpload(e.target.files[0]);
        }
      });
    }
    if (this.btnApplyOcr) {
      this.btnApplyOcr.addEventListener('click', () => this.applyOcrResultsToSchedule());
    }

    // 낮/밤 테마 토글
    if (this.btnThemeToggle) {
      this.btnThemeToggle.addEventListener('click', () => {
        const nextTheme = (this.currentTheme === 'apple-light') ? 'obsidian' : 'apple-light';
        this.applyTheme(nextTheme, true);
      });
    }

    // 날짜별 개인 일정·휴가 모달
    if (this.btnCloseDayEdit) {
      this.btnCloseDayEdit.addEventListener('click', () => this.closeModal(this.modalDayEdit));
    }
    if (this.btnCloseDayEditFooter) {
      this.btnCloseDayEditFooter.addEventListener('click', () => this.closeModal(this.modalDayEdit));
    }
    if (this.selectedScheduleBar) {
      this.selectedScheduleBar.addEventListener('click', () => {
        const targetDate = this.selectedDateStr || this.todayDateStr;
        this.openDayEditModal(targetDate);
      });
      this.selectedScheduleBar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.openDayEditModal(this.selectedDateStr || this.todayDateStr);
        }
      });
    }

    // 원터치 휴가/특근 칩 클릭 이벤트
    if (this.quickVacationChips) {
      this.quickVacationChips.querySelectorAll('.quick-vac-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          if (!this.editingDateStr) return;
          const val = chip.getAttribute('data-quick-shift');
          if (val === '__CLEAR__') {
            shiftStorage.removeOverrideForDate(this.editingDateStr);
            this.populateDayShiftOptions(this.editingDateStr);
            this.renderCalendar();
            this.renderTodayCard();
            this.renderMonthlyNotes();
            this.showWeatherToast('날짜의 휴가·근무 표시를 기본 상태로 되돌렸습니다.');
            return;
          }
          // 4교대 모드에서 '휴가'를 누르면 해당 날짜 기본근무 기반 휴가(예: 일근휴가) 또는 연차 저장
          let targetShift = val;
          if (!this.isRegularMode() && (val === '휴가' || val === '연차')) {
            const base = calculateBaseShift(this.editingDateStr, shiftStorage.getBaseSettings().baseDate, shiftStorage.getBaseSettings().baseShiftIndex);
            if (base === '일근' || base === '야근' || base === '조근') {
              targetShift = `${base}휴가`;
            }
          } else if (!this.isRegularMode() && val === '특근') {
            targetShift = '일근대근';
          }
          const currentOverride = shiftStorage.getOverrides()[this.editingDateStr] || {};
          shiftStorage.setOverrideForDate(this.editingDateStr, {
            ...currentOverride,
            shiftType: targetShift,
            time: '',
            alarm: ''
          });
          this.populateDayShiftOptions(this.editingDateStr);
          this.renderCalendar();
          this.renderTodayCard();
          this.renderMonthlyNotes();
          this.showWeatherToast(`✅ ${targetShift} 표시가 달력에 반영되었습니다.`);
        });
      });
    }

    const applyShiftTypeChange = () => {
      if (!this.editingDateStr || !this.elEditShiftSelect) return;
      const shiftType = this.elEditShiftSelect.value;
      if (shiftType === '__DEFAULT__') {
        shiftStorage.removeOverrideForDate(this.editingDateStr);
      } else {
        const currentOverride = shiftStorage.getOverrides()[this.editingDateStr] || {};
        shiftStorage.setOverrideForDate(this.editingDateStr, {
          ...currentOverride,
          shiftType,
          time: '',
          alarm: ''
        });
      }
      this.renderCalendar();
      this.renderTodayCard();
      this.renderMonthlyNotes();
    };

    if (this.elEditShiftSelect) {
      this.elEditShiftSelect.addEventListener('change', () => applyShiftTypeChange());
    }
    if (this.btnSaveShiftType) {
      this.btnSaveShiftType.addEventListener('click', () => {
        applyShiftTypeChange();
        this.showWeatherToast('✅ 날짜 상태가 달력에 저장되었습니다.');
      });
    }

    if (this.elEditNoteInput) {
      this.elEditNoteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.saveDayEdit();
        }
      });
    }
    if (this.btnSaveDayEdit) {
      this.btnSaveDayEdit.addEventListener('click', () => this.saveDayEdit());
    }
    if (this.btnDeleteSelectedSchedules) {
      this.btnDeleteSelectedSchedules.addEventListener('click', () => this.deleteSelectedSchedules());
    }
    if (this.btnResetDayEdit) {
      this.btnResetDayEdit.addEventListener('click', () => {
        if (confirm('이 날짜의 휴가/근무 표시와 등록된 개인 일정을 모두 초기화하시겠습니까?')) {
          shiftStorage.removeOverrideForDate(this.editingDateStr);
          const daySchedules = shiftStorage.getSchedulesForDate(this.editingDateStr);
          daySchedules.forEach(s => shiftStorage.removeSchedule(s.id));
          this.closeModal(this.modalDayEdit);
          this.renderAll();
        }
      });
    }

    // 환경설정 모달
    if (this.btnOpenSettings) {
      this.btnOpenSettings.addEventListener('click', () => this.openSettingsAndFocusName(false));
    }
    if (this.btnCloseSettings) {
      this.btnCloseSettings.addEventListener('click', () => this.closeModal(this.modalSettings));
    }
    if (this.btnSaveSettings) {
      this.btnSaveSettings.addEventListener('click', () => {
        const rawName = (this.inputSettingName ? this.inputSettingName.value : '').trim();
        const rawTeam = (this.inputSettingTeam ? this.inputSettingTeam.value : '').trim();
        const cleanFirstChar = rawName ? rawName.replace(/\s+/g, '')[0] : '👤';

        shiftStorage.setProfile({
          name: rawName,
          team: rawTeam,
          avatar: cleanFirstChar || '👤'
        });

        const nextMode = this.pendingSettingsMode === 'shift4' ? 'shift4' : 'regular';
        shiftStorage.setWorkMode(nextMode);
        if (document.body) {
          document.body.setAttribute('data-work-mode', nextMode);
        }

        const regularAlarm = this.settingAlarmRegular ? this.settingAlarmRegular.value : '07:30';
        const dayAlarm = this.settingAlarmDay ? this.settingAlarmDay.value : '06:00';
        const nightAlarm = this.settingAlarmNight ? this.settingAlarmNight.value : '15:00';
        const earlyAlarm = this.settingAlarmEarly ? this.settingAlarmEarly.value : '05:20';
        shiftStorage.setAlarmSettings({
          regular: regularAlarm || '07:30',
          day: dayAlarm || '06:00',
          night: nightAlarm || '15:00',
          early: earlyAlarm || '05:20'
        });

        if (nextMode === 'shift4' && this.selectLastMonthEndShift && this.selectLastMonthEndShift.value) {
          const lastShift = this.selectLastMonthEndShift.value;
          const lastDayOfPrevMonth = new Date(this.currentYear, this.currentMonth - 1, 0);
          const baseDateStr = formatDateString(lastDayOfPrevMonth);
          const baseIndex = SHIFT_PATTERN.indexOf(lastShift);
          if (baseIndex !== -1) {
            shiftStorage.setBaseSettings({
              baseDate: baseDateStr,
              baseShiftIndex: baseIndex
            });
          }
        }

        shiftStorage.markModified();
        this.closeModal(this.modalSettings);
        this.renderAll();
        this.loadWeather(false);
        this.showWeatherToast('✅ 프로필 및 근무형태 설정이 저장되었습니다.');
      });
    }

    if (this.btnResetAllData) {
      this.btnResetAllData.addEventListener('click', () => {
        if (confirm('입력한 이름, 개인 일정, 휴가 및 근무 설정을 모두 초기 상태로 되돌리시겠습니까?')) {
          shiftStorage.resetToDefault();
          this.closeModal(this.modalSettings);
          this.renderAll();
          this.showWeatherToast('모든 캘린더 데이터가 초기화되었습니다.');
        }
      });
    }

    if (this.btnOpenSummary) {
      this.btnOpenSummary.addEventListener('click', () => {
        this.renderMonthlySummary();
        this.openModal(this.modalSummary);
      });
    }
    if (this.btnCloseSummary) {
      this.btnCloseSummary.addEventListener('click', () => this.closeModal(this.modalSummary));
    }
    if (this.btnCloseSummaryFooter) {
      this.btnCloseSummaryFooter.addEventListener('click', () => this.closeModal(this.modalSummary));
    }

    if (this.btnRefreshMonthlyNotes) {
      this.btnRefreshMonthlyNotes.addEventListener('click', (e) => this.refreshMonthlyNotes(e));
    }

    window.addEventListener('storage', () => this.renderAll());

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(overlay);
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleBackButton();
      }
    });

    window.addEventListener('popstate', () => {
      if (this._isClosingFromPopstate) return;
      this._isClosingFromPopstate = true;
      this.handleBackButton();
      setTimeout(() => {
        this._isClosingFromPopstate = false;
      }, 150);
    });

    window.handleAppBackButton = () => this.handleBackButton();

    this.initScheduleTimeEvents();
  }

  initScheduleTimeEvents() {
    const onTimeChange = () => {
      this.isScheduleTimeEnabled = true;
      this.updateScheduleTimeBadge();
    };
    if (this.editScheduleAmPm) this.editScheduleAmPm.addEventListener('change', onTimeChange);
    if (this.editScheduleHour) this.editScheduleHour.addEventListener('change', onTimeChange);
    if (this.editScheduleMinute) this.editScheduleMinute.addEventListener('change', onTimeChange);
    if (this.btnEditScheduleTimeClear) {
      this.btnEditScheduleTimeClear.addEventListener('click', () => {
        this.isScheduleTimeEnabled = !this.isScheduleTimeEnabled;
        this.updateScheduleTimeBadge();
      });
    }
  }

  updateScheduleTimeBadge() {
    if (!this.editScheduleTimeBadge || !this.editScheduleTimeBadgeText) return;
    if (!this.isScheduleTimeEnabled) {
      this.editScheduleTimeBadgeText.textContent = '종일 일정 (시간 미지정)';
      this.editScheduleTimeBadge.style.background = '#f1f5f9';
      this.editScheduleTimeBadge.style.color = '#64748b';
      if (this.btnEditScheduleTimeClear) {
        this.btnEditScheduleTimeClear.textContent = '시간 지정하기';
        this.btnEditScheduleTimeClear.style.color = '#0284c7';
      }
      if (this.editScheduleAmPm) this.editScheduleAmPm.style.opacity = '0.45';
      if (this.editScheduleHour) this.editScheduleHour.style.opacity = '0.45';
      if (this.editScheduleMinute) this.editScheduleMinute.style.opacity = '0.45';
    } else {
      const ampm = this.editScheduleAmPm ? this.editScheduleAmPm.value : '오전';
      const h = this.editScheduleHour ? this.editScheduleHour.value : '9';
      const m = this.editScheduleMinute ? this.editScheduleMinute.value : '00';
      this.editScheduleTimeBadgeText.textContent = `${ampm} ${String(h).padStart(2, '0')}:${m}`;
      this.editScheduleTimeBadge.style.background = '#e0f2fe';
      this.editScheduleTimeBadge.style.color = '#0284c7';
      if (this.btnEditScheduleTimeClear) {
        this.btnEditScheduleTimeClear.textContent = '종일(시간없음)';
        this.btnEditScheduleTimeClear.style.color = '';
      }
      if (this.editScheduleAmPm) this.editScheduleAmPm.style.opacity = '1';
      if (this.editScheduleHour) this.editScheduleHour.style.opacity = '1';
      if (this.editScheduleMinute) this.editScheduleMinute.style.opacity = '1';
    }
  }

  getSelectedTimeStr() {
    if (!this.isScheduleTimeEnabled) return '';
    const ampm = this.editScheduleAmPm ? this.editScheduleAmPm.value : '오전';
    const h = parseInt(this.editScheduleHour ? this.editScheduleHour.value : '9', 10);
    const m = this.editScheduleMinute ? this.editScheduleMinute.value : '00';

    let hour24 = h;
    if (ampm === '오후') {
      if (hour24 < 12) hour24 += 12;
    } else {
      if (hour24 === 12) hour24 = 0;
    }
    return `${String(hour24).padStart(2, '0')}:${m}`;
  }

  formatDisplayTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return '';
    const clean = timeStr.trim();
    if (!clean) return '';

    if (/오후|pm/i.test(clean) || /오전|am/i.test(clean)) {
      const isPM = /오후|pm/i.test(clean);
      const nums = clean.match(/\d+/g);
      if (nums && nums.length > 0) {
        let h = parseInt(nums[0], 10);
        const m = nums.length > 1 ? String(nums[1]).padStart(2, '0') : '00';
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
        return `${isPM ? '오후' : '오전'} ${String(h).padStart(2, '0')}:${m}`;
      }
      return clean;
    }

    const parts = clean.split(':');
    if (parts.length >= 2) {
      const h24 = parseInt(parts[0], 10);
      const m = String(parts[1]).padStart(2, '0');
      if (!isNaN(h24)) {
        const ampm = h24 >= 12 ? '오후' : '오전';
        const h12 = h24 === 0 ? 12 : (h24 > 12 ? h24 - 12 : h24);
        return `${ampm} ${String(h12).padStart(2, '0')}:${m}`;
      }
    }
    return clean;
  }

  // 달력 칸 내부용 초간결 시각 표기 (예: '09:00' -> '9시', '14:30' -> '14:30') - 일정 제목이 잘 보이도록 최적화
  formatCompactCalendarTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return '';
    const clean = timeStr.trim();
    if (!clean) return '';
    const minTotal = parseScheduleTimeToMinutes(clean);
    if (minTotal >= 9999) return '';
    const h24 = Math.floor(minTotal / 60);
    const m = minTotal % 60;
    if (m === 0) return `${h24}시`;
    return `${h24}:${String(m).padStart(2, '0')}`;
  }

  openModal(modal) {
    if (!modal) return;
    if (!modal.classList.contains('active')) {
      modal.classList.add('active');
      if (!this._modalHistoryStack) this._modalHistoryStack = [];
      this._modalHistoryStack.push(modal);
      if (!this._isClosingFromPopstate) {
        try {
          window.history.pushState({ modalOpen: true, modalId: modal.id || '' }, '');
        } catch (e) {}
      }
    }
  }

  closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    if (this._modalHistoryStack && this._modalHistoryStack.length > 0) {
      const idx = this._modalHistoryStack.lastIndexOf(modal);
      if (idx !== -1) this._modalHistoryStack.splice(idx, 1);
    }
    if (!this._isClosingFromPopstate && window.history.state && window.history.state.modalOpen) {
      this._isClosingFromPopstate = true;
      window.history.back();
      setTimeout(() => {
        this._isClosingFromPopstate = false;
      }, 150);
    }
  }

  handleBackButton() {
    const busRouteModal = document.getElementById('modalBusRouteStops');
    if (busRouteModal && (busRouteModal.classList.contains('active') || busRouteModal.style.display !== 'none')) {
      if (window.transitLookupInstance && typeof window.transitLookupInstance.closeBusRouteModal === 'function') {
        window.transitLookupInstance.closeBusRouteModal();
      } else {
        busRouteModal.style.display = 'none';
        busRouteModal.classList.remove('active');
      }
      return true;
    }

    const stationModal = document.getElementById('stationBusesModal');
    if (stationModal && (stationModal.classList.contains('active') || stationModal.style.display !== 'none')) {
      if (typeof window.closeStationBusesModal === 'function') {
        window.closeStationBusesModal();
      } else {
        stationModal.style.display = 'none';
        stationModal.classList.remove('active');
      }
      return true;
    }

    const searchDropdown = document.getElementById('lookupSuggestionsDropdown');
    if (searchDropdown && searchDropdown.style.display === 'block') {
      searchDropdown.style.display = 'none';
      return true;
    }

    const activeModals = Array.from(document.querySelectorAll('.modal-overlay.active, .modal-backdrop.active'));
    if (activeModals.length > 0) {
      let targetModal = null;
      if (this._modalHistoryStack && this._modalHistoryStack.length > 0) {
        targetModal = this._modalHistoryStack.pop();
      }
      if (!targetModal || !targetModal.classList.contains('active')) {
        targetModal = activeModals[activeModals.length - 1];
      }
      if (targetModal) {
        this.closeModal(targetModal);
        return true;
      }
    }
    return false;
  }

  renderAll() {
    this.renderWorkModeState();
    this.renderHeader();
    this.renderMonthNav();
    this.renderCalendar();
    this.renderTodayCard();
    this.renderUploadModalSpecialNotes();
    this.renderMonthlyNotes();
  }

  renderWorkModeState() {
    const isRegular = this.isRegularMode();
    if (document.body) {
      document.body.setAttribute('data-work-mode', isRegular ? 'regular' : 'shift4');
    }
    if (this.btnModeRegular) this.btnModeRegular.classList.toggle('active', isRegular);
    if (this.btnModeShift4) this.btnModeShift4.classList.toggle('active', !isRegular);

    // 4교대근무일 때만 근무표 업로드 버튼 노출
    if (this.btnOpenUploadModal) {
      this.btnOpenUploadModal.style.display = isRegular ? 'none' : 'flex';
    }
    if (this.btnOpenUploadModalHeader) {
      this.btnOpenUploadModalHeader.style.display = isRegular ? 'none' : 'inline-flex';
    }
    if (this.btnShiftAlarmText) {
      this.btnShiftAlarmText.textContent = isRegular ? '알람설정' : '근무알람';
    }
  }

  renderHeader() {
    const profile = shiftStorage.getProfile();
    const isRegular = this.isRegularMode();
    const modeLabel = isRegular ? '통상근무 · 스마트 캘린더' : '4교대근무 · 스마트 근무표';

    const hasName = !!(profile.name && profile.name.trim());
    if (hasName) {
      const trimmed = profile.name.trim();
      const displayName = trimmed.endsWith('님') ? trimmed : `${trimmed} 님`;
      if (this.elAvatar) this.elAvatar.textContent = profile.avatar || trimmed[0] || '👤';
      if (this.elName) this.elName.textContent = displayName;
      if (this.elTeam) this.elTeam.textContent = (profile.team && profile.team.trim()) ? profile.team.trim() : modeLabel;
      if (this.profilePill) this.profilePill.classList.remove('is-empty-profile');
    } else {
      if (this.elAvatar) this.elAvatar.textContent = '👤';
      if (this.elName) this.elName.textContent = '이름 입력 ✏️';
      if (this.elTeam) this.elTeam.textContent = (profile.team && profile.team.trim()) ? profile.team.trim() : modeLabel;
      if (this.profilePill) this.profilePill.classList.add('is-empty-profile');
    }
  }

  renderMonthNav() {
    if (!this.elMonthTitle) return;
    const suffix = this.isRegularMode() ? '캘린더' : '근무표';
    this.elMonthTitle.textContent = `${this.currentYear}년 ${this.currentMonth}월 ${suffix}`;
  }

  // 통상근무 모드에서 달력 셀에 표시할 휴가/특근 뱃지 필터 (기본 4교대 일/야/조/비 숨김)
  getDisplayBadgeForCell(shiftInfo) {
    if (this.isRegularMode()) {
      if (!shiftInfo || !shiftInfo.isOverride) return null;
      const st = (shiftInfo.shiftType || '').trim();
      if (!st || ['일근', '야근', '조근', '비번', '통상근무', '일반'].includes(st)) {
        return null;
      }
      return {
        text: shiftInfo.badgeText || st,
        colorClass: shiftInfo.colorClass || 'shift-vacation'
      };
    }
    if (shiftInfo && shiftInfo.badgeText) {
      return {
        text: shiftInfo.badgeText,
        colorClass: shiftInfo.colorClass
      };
    }
    return null;
  }

  changeMonth(direction) {
    if (this.isMonthTransitioning) return;
    this.isMonthTransitioning = true;

    const grid = this.elCalendarGrid;
    if (!grid) {
      this._updateMonthState(direction);
      this.renderAll();
      this.isMonthTransitioning = false;
      return;
    }

    const outClass = direction === 'next' ? 'slide-out-left' : 'slide-out-right';
    const inClass = direction === 'next' ? 'slide-from-right' : 'slide-from-left';

    grid.classList.remove('slide-out-left', 'slide-out-right', 'slide-from-left', 'slide-from-right');
    grid.classList.add('sliding-transition', outClass);

    if (this.elMonthTitle) {
      this.elMonthTitle.style.transition = 'opacity 0.16s ease, transform 0.16s ease';
      this.elMonthTitle.style.opacity = '0.3';
      this.elMonthTitle.style.transform = direction === 'next' ? 'translateX(-10px)' : 'translateX(10px)';
    }

    setTimeout(() => {
      this._updateMonthState(direction);
      this.renderAll();

      const newGrid = this.elCalendarGrid || grid;
      newGrid.classList.remove('sliding-transition', 'slide-out-left', 'slide-out-right');
      newGrid.classList.add('no-transition', inClass);
      void newGrid.offsetWidth;

      newGrid.classList.remove('no-transition');
      newGrid.classList.add('sliding-transition');
      newGrid.classList.remove(inClass);
      newGrid.style.transform = 'translateX(0)';
      newGrid.style.opacity = '1';

      if (this.elMonthTitle) {
        this.elMonthTitle.style.opacity = '1';
        this.elMonthTitle.style.transform = 'translateX(0)';
      }

      setTimeout(() => {
        newGrid.classList.remove('sliding-transition');
        newGrid.style.transform = '';
        newGrid.style.opacity = '';
        this.isMonthTransitioning = false;
      }, 240);
    }, 180);
  }

  _updateMonthState(direction) {
    if (direction === 'next') {
      this.currentMonth++;
      if (this.currentMonth > 12) {
        this.currentMonth = 1;
        this.currentYear++;
      }
    } else {
      this.currentMonth--;
      if (this.currentMonth < 1) {
        this.currentMonth = 12;
        this.currentYear--;
      }
    }
    const now = new Date();
    if (now.getFullYear() === this.currentYear && now.getMonth() + 1 === this.currentMonth) {
      this.selectedDateStr = this.todayDateStr;
    } else {
      this.selectedDateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-01`;
    }
  }

  goToToday() {
    const now = new Date();
    const realYear = now.getFullYear();
    const realMonth = now.getMonth() + 1;
    this.todayDateStr = formatDateString(now);
    this.selectedDateStr = this.todayDateStr;

    const isDifferentMonth = (this.currentYear !== realYear || this.currentMonth !== realMonth);
    this.currentYear = realYear;
    this.currentMonth = realMonth;

    this.renderAll();
    if (isDifferentMonth && this.elCalendarGrid) {
      this.elCalendarGrid.classList.add('sliding-transition');
      this.elCalendarGrid.style.opacity = '0.4';
      setTimeout(() => {
        this.elCalendarGrid.style.opacity = '1';
        setTimeout(() => this.elCalendarGrid.classList.remove('sliding-transition'), 200);
      }, 50);
    }

    this.showWeatherToast(`오늘(${realMonth}월 ${now.getDate()}일)로 이동했습니다. 🏠`);
  }

  isPageZoomed() {
    try {
      if (window.visualViewport) {
        if (typeof window.visualViewport.scale === 'number' && window.visualViewport.scale > 1.01) return true;
        if (window.visualViewport.width && window.innerWidth && (window.innerWidth - window.visualViewport.width > 2)) return true;
      }
      if (window.innerWidth && document.documentElement && document.documentElement.clientWidth) {
        if (document.documentElement.clientWidth / window.innerWidth > 1.01) return true;
      }
    } catch (e) {}
    return false;
  }

  initSwipeGesture() {
    const card = document.getElementById('calendarCard');
    if (!card) return;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isDragging = false;
    let isHorizontalGesture = null;

    card.addEventListener('touchstart', (e) => {
      if (this.isPageZoomed() || (e.touches && e.touches.length > 1)) {
        isDragging = false;
        isHorizontalGesture = false;
        if (this.elCalendarGrid) {
          this.elCalendarGrid.style.transform = '';
          this.elCalendarGrid.style.opacity = '';
        }
        return;
      }
      if (this.isMonthTransitioning) return;

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = startX;
      isDragging = true;
      isHorizontalGesture = null;

      if (this.elCalendarGrid) {
        this.elCalendarGrid.classList.remove('sliding-transition');
        this.elCalendarGrid.classList.add('no-transition');
      }
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      if (this.isPageZoomed() || (e.touches && e.touches.length > 1)) {
        isDragging = false;
        isHorizontalGesture = false;
        if (this.elCalendarGrid) {
          this.elCalendarGrid.style.transform = '';
          this.elCalendarGrid.style.opacity = '';
        }
        return;
      }

      const touch = e.touches[0];
      currentX = touch.clientX;
      const dx = currentX - startX;
      const dy = touch.clientY - startY;

      if (isHorizontalGesture === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        isHorizontalGesture = Math.abs(dx) >= Math.abs(dy);
      }
      if (isHorizontalGesture === false) return;

      if (isHorizontalGesture === true && this.elCalendarGrid) {
        const dampDx = dx * 0.75;
        const opacityVal = Math.max(0.45, 1 - Math.abs(dx) / 350);
        this.elCalendarGrid.style.transform = `translateX(${dampDx}px)`;
        this.elCalendarGrid.style.opacity = `${opacityVal}`;
      }
    }, { passive: true });

    card.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;

      if (this.isPageZoomed()) {
        isHorizontalGesture = null;
        if (this.elCalendarGrid) {
          this.elCalendarGrid.style.transform = '';
          this.elCalendarGrid.style.opacity = '';
        }
        return;
      }

      const dx = currentX - startX;
      const grid = this.elCalendarGrid;

      if (isHorizontalGesture === true && Math.abs(dx) >= 38) {
        if (grid) grid.classList.remove('no-transition');
        this.changeMonth(dx < 0 ? 'next' : 'prev', true);
      } else if (grid) {
        grid.classList.remove('no-transition');
        grid.classList.add('sliding-transition');
        grid.style.transform = 'translateX(0)';
        grid.style.opacity = '1';
        setTimeout(() => {
          grid.classList.remove('sliding-transition');
          grid.style.transform = '';
          grid.style.opacity = '';
        }, 200);
      }
      isHorizontalGesture = null;
    }, { passive: true });

    card.addEventListener('touchcancel', () => {
      isDragging = false;
      isHorizontalGesture = null;
      if (this.elCalendarGrid) {
        this.elCalendarGrid.style.transform = '';
        this.elCalendarGrid.style.opacity = '';
      }
    }, { passive: true });
  }

  // ========= 이달의 일정 · 휴가 · 특이사항 렌더링 =========
  renderMonthlyNotes() {
    if (!this.monthlyNotesList) return;
    const y = this.currentYear;
    const m = this.currentMonth;
    const isRegular = this.isRegularMode();
    if (this.monthlyNotesSectionTitle) {
      this.monthlyNotesSectionTitle.textContent = isRegular
        ? `이달의 일정 및 휴가 (${y}년 ${m}월)`
        : `이달의 특이사항 및 일정 (${y}년 ${m}월)`;
    }

    const overrides = shiftStorage.getOverrides();
    const schedules = shiftStorage.getSchedules();
    const lastDay = new Date(y, m, 0).getDate();
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const items = [];

    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(y, m - 1, d);
      const dayOfWeek = weekDays[dateObj.getDay()];
      const dateLabel = `${m}월 ${d}일(${dayOfWeek})`;

      if (overrides && overrides[dateStr]) {
        const ov = overrides[dateStr];
        const st = (ov.shiftType || '').trim();
        if (st.includes('대근') || st.includes('특근') || st.includes('당직')) {
          items.push({ type: 'overtime', dateStr, dateLabel, text: st, icon: '⚡' });
        } else if (st.includes('휴가') || st.includes('연차') || st.includes('반차') || st.includes('병가') || st.includes('공가')) {
          items.push({ type: 'vacation', dateStr, dateLabel, text: st, icon: '🌿' });
        } else if (st.includes('출장') || st.includes('교육') || st.includes('외근')) {
          items.push({ type: 'schedule', dateStr, dateLabel, text: st, icon: '💼', isOverrideStatus: true });
        }
      }

      const daySchs = schedules.filter(s => s.dateStr === dateStr);
      daySchs.forEach(s => {
        const prettyTime = this.formatDisplayTime(s.timeStr);
        items.push({
          type: 'schedule',
          dateStr,
          dateLabel,
          text: (prettyTime ? prettyTime + ' ' : '') + s.title,
          icon: '📌',
          scheduleId: s.id
        });
      });
    }

    if (items.length === 0) {
      this.monthlyNotesList.innerHTML = `<div class="monthly-notes-empty">이달에 등록된 개인 일정이나 휴가가 없습니다. 달력 날짜를 더블터치하거나 하단 바를 눌러 등록하세요.</div>`;
      return;
    }

    let html = '';
    items.forEach(item => {
      let typeClass = 'note-type-schedule';
      if (item.type === 'overtime') typeClass = 'note-type-overtime';
      else if (item.type === 'vacation') typeClass = 'note-type-vacation';

      const delType = item.isOverrideStatus ? 'vacation' : item.type;
      html += `
        <div class="monthly-note-row ${typeClass}" data-date="${item.dateStr}" onclick="window.app && window.app.openDayEditModal('${item.dateStr}')">
          <div class="monthly-note-left">
            <span class="monthly-note-icon">${item.icon}</span>
            <span class="monthly-note-date">${item.dateLabel}</span>
            <span class="monthly-note-text">${this.escapeHtml(item.text)}</span>
          </div>
          <button type="button" class="monthly-note-delete-btn" title="삭제" onclick="event.stopPropagation(); window.app.deleteMonthlyNote('${item.dateStr}','${delType}','${item.scheduleId || ''}')">&times;</button>
        </div>
      `;
    });
    this.monthlyNotesList.innerHTML = html;
  }

  refreshMonthlyNotes(e) {
    if (e && e.preventDefault) e.preventDefault();
    const btn = this.btnRefreshMonthlyNotes || document.getElementById('btnRefreshMonthlyNotes');
    if (btn) btn.classList.add('spinning');

    this.renderMonthlyNotes();
    this.renderCalendar();
    this.renderTodayCard();
    if (typeof window !== 'undefined' && window.syncEngine && typeof window.syncEngine.syncNow === 'function') {
      window.syncEngine.syncNow(true);
    }

    setTimeout(() => {
      if (btn) btn.classList.remove('spinning');
    }, 600);
  }

  deleteMonthlyNote(dateStr, type, scheduleId) {
    if (type === 'schedule' && scheduleId) {
      shiftStorage.removeSchedule(scheduleId);
    } else {
      shiftStorage.removeOverrideForDate(dateStr);
    }
    this.renderAll();
  }

  renderUploadModalSpecialNotes() {
    const titleEl = document.getElementById('specialNotesHeaderTitle');
    const contentEl = document.getElementById('specialNotesContent');
    if (!contentEl) return;

    const targetYear = this.currentYear;
    const targetMonth = this.currentMonth;
    if (titleEl) {
      titleEl.textContent = `특이사항 (${targetYear}년 ${targetMonth}월):`;
    }

    const overrides = shiftStorage.getOverrides();
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const specialItems = [];

    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(targetYear, targetMonth - 1, d);
      const dayOfWeek = weekDays[dateObj.getDay()];

      if (overrides && overrides[dateStr]) {
        const sType = (overrides[dateStr].shiftType || '').trim();
        if (sType.includes('대근') || sType.includes('특근') || sType.includes('당직')) {
          specialItems.push({
            type: 'overtime',
            typeLabel: '대근·특근',
            icon: '⚡',
            dateText: `${targetMonth}월 ${d}일 (${dayOfWeek})`,
            shiftName: sType.replace(/^[⚡\s]+/, '')
          });
        } else if (sType.includes('휴가') || sType.includes('연차') || sType.includes('반차')) {
          specialItems.push({
            type: 'vacation',
            typeLabel: '휴가',
            icon: '🌿',
            dateText: `${targetMonth}월 ${d}일 (${dayOfWeek})`,
            shiftName: sType.replace(/^[🌿\s]+/, '')
          });
        }
      }
    }

    if (specialItems.length === 0) {
      contentEl.innerHTML = `<div class="special-note-empty">• 해당 월에 등록된 대근·휴가 내역이 없습니다.</div>`;
      return;
    }

    let html = `<div class="special-notes-list">`;
    specialItems.forEach(item => {
      const isOvertime = item.type === 'overtime';
      html += `
        <div class="special-note-row ${isOvertime ? 'overtime' : 'vacation'}">
          <div class="special-note-left">
            <span class="special-note-badge ${isOvertime ? 'badge-overtime' : 'badge-vacation'}">${item.icon} ${item.typeLabel}</span>
            <span class="special-note-date">${item.dateText}</span>
          </div>
          <div class="special-note-right">
            <span class="special-note-name">${this.escapeHtml(item.shiftName)}</span>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    contentEl.innerHTML = html;
  }

  renderTodayCard() {
    if (!this.elTodayDateText || !this.elTodayShiftBadge) return;
    const overrides = shiftStorage.getOverrides();
    const baseSettings = shiftStorage.getBaseSettings();
    const shiftInfo = getShiftInfoForDate(this.selectedDateStr, overrides, baseSettings);

    const [y, m, d] = this.selectedDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = weekDays[dateObj.getDay()];

    this.elTodayDateText.textContent = `${m}월 ${d}일 (${dayOfWeek})`;

    const holidayInfo = getKoreanHolidayInfo(dateObj);
    const isHoliday = holidayInfo && holidayInfo.isHoliday;
    const dayIndex = dateObj.getDay();
    const isSunday = (dayIndex === 0);
    const isSaturday = (dayIndex === 6);

    this.elTodayDateText.classList.remove('is-holiday', 'is-sunday', 'is-saturday');
    const isDayTheme = (this.currentTheme === 'apple-light');
    if (isHoliday || isSunday) {
      this.elTodayDateText.classList.add('is-holiday');
      if (isSunday) this.elTodayDateText.classList.add('is-sunday');
      this.elTodayDateText.style.setProperty('color', isDayTheme ? '#dc2626' : '#f87171', 'important');
    } else if (isSaturday) {
      this.elTodayDateText.classList.add('is-saturday');
      this.elTodayDateText.style.setProperty('color', isDayTheme ? '#2563eb' : '#60a5fa', 'important');
    } else {
      this.elTodayDateText.style.removeProperty('color');
    }

    if (this.elTodayTimeText) {
      this.elTodayTimeText.textContent = '';
      this.elTodayTimeText.style.display = 'none';
    }

    this.elTodayShiftBadge.classList.remove('badge-day', 'badge-night', 'badge-early', 'badge-off', 'badge-overtime', 'badge-vacation');

    const st = (shiftInfo.shiftType || '').trim();
    if (this.isRegularMode()) {
      // 통상근무 모드: 휴가/연차/반차/특근 오버라이드가 있으면 우선 표시, 없으면 휴일 또는 통상근무 표시
      if (shiftInfo.isOverride && (st.includes('휴가') || st.includes('연차') || st.includes('반차') || st.includes('병가') || st.includes('공가'))) {
        this.elTodayShiftBadge.classList.add('badge-vacation');
        this.elTodayShiftBadge.innerHTML = `<span>🌿 ${this.escapeHtml(st)}</span>`;
      } else if (shiftInfo.isOverride && (st.includes('대근') || st.includes('특근') || st.includes('당직'))) {
        this.elTodayShiftBadge.classList.add('badge-overtime');
        this.elTodayShiftBadge.innerHTML = `<span>⚡ ${this.escapeHtml(st)}</span>`;
      } else if (shiftInfo.isOverride && st && !['일근', '야근', '조근', '비번', '통상근무', '일반'].includes(st)) {
        this.elTodayShiftBadge.classList.add('badge-day');
        this.elTodayShiftBadge.innerHTML = `<span>${this.escapeHtml(st)}</span>`;
      } else if (isHoliday) {
        this.elTodayShiftBadge.classList.add('badge-off');
        this.elTodayShiftBadge.innerHTML = `<span>${this.escapeHtml(holidayInfo.name)}</span>`;
      } else if (isSunday || isSaturday) {
        this.elTodayShiftBadge.classList.add('badge-off');
        this.elTodayShiftBadge.innerHTML = `<span>주말 휴일</span>`;
      } else {
        this.elTodayShiftBadge.classList.add('badge-day');
        this.elTodayShiftBadge.innerHTML = `<span>통상근무</span>`;
      }
      return;
    }

    // 4교대근무 모드
    if (st === '비번') {
      this.elTodayShiftBadge.classList.add('badge-off');
      this.elTodayShiftBadge.innerHTML = `<span>비번</span>`;
    } else if (st.includes('대근') || st.includes('특근') || st.includes('당직')) {
      this.elTodayShiftBadge.classList.add('badge-overtime');
      this.elTodayShiftBadge.innerHTML = `<span>${this.escapeHtml(st)}</span>`;
    } else if (st.includes('휴가') || st.includes('연차') || st.includes('반차') || st.includes('병가') || st.includes('공가')) {
      this.elTodayShiftBadge.classList.add('badge-vacation');
      this.elTodayShiftBadge.innerHTML = `<span>${this.escapeHtml(st)}</span>`;
    } else if (st === '일근') {
      this.elTodayShiftBadge.classList.add('badge-day');
      this.elTodayShiftBadge.innerHTML = `<span>일근</span>`;
    } else if (st === '야근') {
      this.elTodayShiftBadge.classList.add('badge-night');
      this.elTodayShiftBadge.innerHTML = `<span>야근</span>`;
    } else if (st === '조근') {
      this.elTodayShiftBadge.classList.add('badge-early');
      this.elTodayShiftBadge.innerHTML = `<span>조근</span>`;
    } else {
      this.elTodayShiftBadge.classList.add('badge-off');
      this.elTodayShiftBadge.innerHTML = `<span>${this.escapeHtml(st)}</span>`;
    }
  }

  applyTheme(themeName, save = true) {
    this.currentTheme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    document.body.setAttribute('data-theme', themeName);
    if (save) {
      localStorage.setItem('realtime_app_theme', themeName);
      localStorage.setItem('kbs_shift_theme', themeName);
    }

    if (this.btnThemeToggle) {
      if (themeName === 'apple-light') {
        this.btnThemeToggle.classList.remove('is-night');
        this.btnThemeToggle.classList.add('is-day');
        if (this.themeToggleIcon) this.themeToggleIcon.textContent = '☀️';
        if (this.themeToggleText) this.themeToggleText.textContent = '낮 모드';
        this.btnThemeToggle.setAttribute('title', '현재: 낮 모드 (터치 시 밤 모드로 전환)');
      } else {
        this.btnThemeToggle.classList.remove('is-day');
        this.btnThemeToggle.classList.add('is-night');
        if (this.themeToggleIcon) this.themeToggleIcon.textContent = '🌙';
        if (this.themeToggleText) this.themeToggleText.textContent = '밤 모드';
        this.btnThemeToggle.setAttribute('title', '현재: 밤 모드 (터치 시 낮 모드로 전환)');
      }
    }

    const isDark = (themeName !== 'apple-light');
    try {
      if (window.AndroidAlarm && typeof window.AndroidAlarm.setSystemBarTheme === 'function') {
        window.AndroidAlarm.setSystemBarTheme(isDark);
      }
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', isDark ? '#0f172a' : '#ffffff');
      }
    } catch (e) {}

    this.renderTodayCard();
  }

  renderCalendar() {
    if (!this.elCalendarGrid) return;
    this.elCalendarGrid.innerHTML = '';

    const overrides = shiftStorage.getOverrides();
    const baseSettings = shiftStorage.getBaseSettings();
    const schedules = shiftStorage.getSchedules();
    const isRegular = this.isRegularMode();

    const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth, 0);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    // 1. 이전 달 날짜 채우기
    if (startDayOfWeek > 0) {
      const prevLastDate = new Date(this.currentYear, this.currentMonth - 1, 0).getDate();
      const prevYear = this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear;
      const prevMonth = this.currentMonth === 1 ? 12 : this.currentMonth - 1;

      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const d = prevLastDate - i;
        const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const shiftInfo = getShiftInfoForDate(dateStr, overrides, baseSettings);

        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell other-month';
        const prevDateObj = new Date(prevYear, prevMonth - 1, d);
        const prevDayOfWeek = prevDateObj.getDay();
        if (prevDayOfWeek === 0) cell.classList.add('sun');
        if (prevDayOfWeek === 6) cell.classList.add('sat');
        if (isKoreanHoliday(prevDateObj)) cell.classList.add('holiday');

        const headerRow = document.createElement('div');
        headerRow.className = 'day-header-row';
        const dayNum = document.createElement('span');
        dayNum.className = 'day-number';
        dayNum.textContent = d;
        if (isKoreanHoliday(prevDateObj)) {
          dayNum.style.color = '#dc2626';
          dayNum.style.fontWeight = '900';
        }
        headerRow.appendChild(dayNum);
        if (shiftStorage.isAlarmActive(dateStr)) {
          const alarmIcon = document.createElement('span');
          alarmIcon.className = 'day-alarm-indicator';
          alarmIcon.textContent = '⏰';
          headerRow.appendChild(alarmIcon);
        }
        cell.appendChild(headerRow);

        const badgeData = this.getDisplayBadgeForCell(shiftInfo);
        if (badgeData) {
          const badge = document.createElement('div');
          const isLong = badgeData.text.length >= 4;
          badge.className = `shift-badge ${badgeData.colorClass}${isLong ? ' long-text' : ''}`;
          badge.textContent = badgeData.text;
          cell.appendChild(badge);
        }

        cell.addEventListener('click', () => {
          this.currentYear = prevYear;
          this.currentMonth = prevMonth;
          this.selectDate(dateStr);
        });

        this.elCalendarGrid.appendChild(cell);
      }
    }

    // 2. 이번 달 날짜별 셀 생성
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(this.currentYear, this.currentMonth - 1, d);
      const dayOfWeek = dateObj.getDay();

      const shiftInfo = getShiftInfoForDate(dateStr, overrides, baseSettings);
      const daySchedules = schedules.filter(s => s.dateStr === dateStr);

      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell';
      if (dayOfWeek === 0) cell.classList.add('sun');
      if (dayOfWeek === 6) cell.classList.add('sat');
      if (dateStr === this.selectedDateStr) cell.classList.add('selected');
      if (dateStr === this.todayDateStr) cell.classList.add('today');

      const holidayInfo = getKoreanHolidayInfo(dateObj);
      if (holidayInfo.isHoliday) {
        cell.classList.add('holiday');
      }

      const headerRow = document.createElement('div');
      headerRow.className = 'day-header-row';
      const dayNum = document.createElement('span');
      dayNum.className = 'day-number';
      dayNum.textContent = d;
      if (holidayInfo.isHoliday) {
        dayNum.style.color = '#dc2626';
        dayNum.style.fontWeight = '900';
      }
      headerRow.appendChild(dayNum);

      if (shiftStorage.isAlarmActive(dateStr)) {
        const alarmIcon = document.createElement('span');
        alarmIcon.className = 'day-alarm-indicator';
        alarmIcon.textContent = '⏰';
        alarmIcon.title = '알람 설정됨';
        headerRow.appendChild(alarmIcon);
      }
      cell.appendChild(headerRow);

      // 공휴일 이름 태그
      if (holidayInfo.isHoliday) {
        const holidayMark = document.createElement('div');
        holidayMark.className = 'holiday-name-tag';
        holidayMark.title = `공휴일: ${holidayInfo.name}`;
        let nameHtml = holidayInfo.name;
        if (nameHtml === '대체공휴일') nameHtml = '대체<br>공휴';
        else if (nameHtml === '설날 연휴') nameHtml = '설날<br>연휴';
        else if (nameHtml === '추석 연휴') nameHtml = '추석<br>연휴';
        else if (nameHtml === '부처님오신날') nameHtml = '부처님<br>오신날';
        else if (nameHtml === '어린이날·부처님오신날') nameHtml = '어린이<br>석탄일';
        else if (nameHtml === '국회의원선거') nameHtml = '국회<br>선거';
        else if (nameHtml === '지방선거') nameHtml = '지방<br>선거';
        else if (nameHtml === '대통령선거') nameHtml = '대선';
        else if (nameHtml.length >= 4) nameHtml = nameHtml.slice(0, 2) + '<br>' + nameHtml.slice(2);
        holidayMark.innerHTML = nameHtml;
        cell.appendChild(holidayMark);
      }

      // 근무 또는 휴가/연차 뱃지
      const badgeData = this.getDisplayBadgeForCell(shiftInfo);
      if (badgeData) {
        const badge = document.createElement('div');
        const isLong = badgeData.text.length >= 4;
        badge.className = `shift-badge ${badgeData.colorClass}${isLong ? ' long-text' : ''}`;
        badge.textContent = badgeData.text;
        cell.appendChild(badge);
      }

      // 개인 일정 뱃지 (시인성 대폭 강화: 간결한 시간 + 굵은 일정 제목 표출)
      const personalNotes = [];
      if (shiftInfo.note && shiftInfo.note.trim()) {
        const compactT = this.formatCompactCalendarTime(shiftInfo.noteTime);
        personalNotes.push({
          compactLabel: `${compactT ? compactT + ' ' : ''}${shiftInfo.note.trim()}`,
          fullText: `${shiftInfo.noteTime ? this.formatDisplayTime(shiftInfo.noteTime) + ' ' : ''}${shiftInfo.note.trim()}`
        });
      }
      if (daySchedules.length > 0) {
        const sortedDaySchedules = [...daySchedules].sort((a, b) => {
          return parseScheduleTimeToMinutes(a.timeStr) - parseScheduleTimeToMinutes(b.timeStr);
        });
        sortedDaySchedules.forEach(sch => {
          const compactT = this.formatCompactCalendarTime(sch.timeStr);
          const fullT = this.formatDisplayTime(sch.timeStr);
          const compactLabel = `${compactT ? compactT + ' ' : ''}${sch.title.trim()}`;
          const fullText = `${fullT ? fullT + ' ' : ''}${sch.title.trim()}`;
          if (!personalNotes.some(p => p.fullText === fullText)) {
            personalNotes.push({ compactLabel, fullText });
          }
        });
      }

      if (personalNotes.length > 0) {
        cell.classList.add('has-personal-schedule');
        const handleBadgeTouch = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openDayEditModal(dateStr, shiftInfo);
        };

        // 통상근무이면서 휴가/공휴일 뱃지가 없으면 칸 여유가 넓으므로 최대 2건까지 바로 표출!
        const maxVisible = (isRegular && !badgeData && !holidayInfo.isHoliday) ? 2 : 1;
        const visibleNotes = personalNotes.slice(0, maxVisible);
        const remainCount = personalNotes.length - visibleNotes.length;

        visibleNotes.forEach(item => {
          const schBadge = document.createElement('div');
          schBadge.className = 'schedule-badge-mini';
          schBadge.title = `개인 일정: ${item.fullText} (터치 시 상세/수정)`;
          schBadge.textContent = item.compactLabel;
          schBadge.addEventListener('click', handleBadgeTouch);
          schBadge.addEventListener('touchend', handleBadgeTouch);
          cell.appendChild(schBadge);
        });

        if (remainCount > 0) {
          const moreBadge = document.createElement('div');
          moreBadge.className = 'schedule-badge-mini schedule-badge-more';
          moreBadge.title = personalNotes.map(p => p.fullText).join('\n') + '\n(터치 시 전체 일정 확인)';
          moreBadge.textContent = `+${remainCount}건`;
          moreBadge.addEventListener('click', handleBadgeTouch);
          moreBadge.addEventListener('touchend', handleBadgeTouch);
          cell.appendChild(moreBadge);
        }
      }

      let lastTapTime = 0;
      let lastClickTime = 0;
      const triggerModalDirectly = (e) => {
        if (e) {
          e.stopPropagation();
          if (e.cancelable && e.type === 'touchend') e.preventDefault();
        }
        this.openDayEditModal(dateStr, shiftInfo);
      };

      cell.addEventListener('click', (e) => {
        const now = Date.now();
        const clickDiff = now - lastClickTime;
        lastClickTime = now;
        if (clickDiff > 0 && clickDiff < 450) {
          triggerModalDirectly(e);
          return;
        }
        this.selectDate(dateStr);
      });

      cell.addEventListener('dblclick', (e) => triggerModalDirectly(e));

      cell.addEventListener('touchend', (e) => {
        const currentTime = Date.now();
        const tapDiff = currentTime - lastTapTime;
        lastTapTime = currentTime;
        if (tapDiff > 0 && tapDiff < 450) {
          triggerModalDirectly(e);
        }
      });

      this.elCalendarGrid.appendChild(cell);
    }

    // 3. 다음 달 날짜 채우기
    const currentCellsCount = startDayOfWeek + totalDays;
    const remainingCells = (7 - (currentCellsCount % 7)) % 7;
    if (remainingCells > 0) {
      const nextYear = this.currentMonth === 12 ? this.currentYear + 1 : this.currentYear;
      const nextMonth = this.currentMonth === 12 ? 1 : this.currentMonth + 1;

      for (let d = 1; d <= remainingCells; d++) {
        const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const shiftInfo = getShiftInfoForDate(dateStr, overrides, baseSettings);

        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell other-month';
        const nextDateObj = new Date(nextYear, nextMonth - 1, d);
        const nextDayOfWeek = nextDateObj.getDay();
        if (nextDayOfWeek === 0) cell.classList.add('sun');
        if (nextDayOfWeek === 6) cell.classList.add('sat');
        if (isKoreanHoliday(nextDateObj)) cell.classList.add('holiday');

        const headerRow = document.createElement('div');
        headerRow.className = 'day-header-row';
        const dayNum = document.createElement('span');
        dayNum.className = 'day-number';
        dayNum.textContent = d;
        if (isKoreanHoliday(nextDateObj)) {
          dayNum.style.color = '#dc2626';
          dayNum.style.fontWeight = '900';
        }
        headerRow.appendChild(dayNum);
        if (shiftStorage.isAlarmActive(dateStr)) {
          const alarmIcon = document.createElement('span');
          alarmIcon.className = 'day-alarm-indicator';
          alarmIcon.textContent = '⏰';
          headerRow.appendChild(alarmIcon);
        }
        cell.appendChild(headerRow);

        const badgeData = this.getDisplayBadgeForCell(shiftInfo);
        if (badgeData) {
          const badge = document.createElement('div');
          const isLong = badgeData.text.length >= 4;
          badge.className = `shift-badge ${badgeData.colorClass}${isLong ? ' long-text' : ''}`;
          badge.textContent = badgeData.text;
          cell.appendChild(badge);
        }

        cell.addEventListener('click', () => {
          this.currentYear = nextYear;
          this.currentMonth = nextMonth;
          this.selectDate(dateStr);
        });

        this.elCalendarGrid.appendChild(cell);
      }
    }

    this.renderSelectedDateScheduleBar();
  }

  selectDate(dateStr) {
    if (this.autoResetTodayTimer) {
      clearTimeout(this.autoResetTodayTimer);
      this.autoResetTodayTimer = null;
    }

    this.selectedDateStr = dateStr;
    this.renderCalendar();
    this.renderTodayCard();
    this.renderSelectedDateScheduleBar();

    if (dateStr !== this.todayDateStr) {
      this.autoResetTodayTimer = setTimeout(() => {
        if (document.querySelector('.modal-overlay.active')) return;
        this.selectedDateStr = this.todayDateStr;
        this.renderCalendar();
        this.renderTodayCard();
        this.renderSelectedDateScheduleBar();
      }, 20000);
    }
  }

  renderSelectedDateScheduleBar() {
    if (!this.selectedScheduleBar) return;

    const dateStr = this.selectedDateStr || this.todayDateStr;
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[dateObj.getDay()];
    const isToday = (dateStr === this.todayDateStr);

    if (this.selectedScheduleDatePill) {
      this.selectedScheduleDatePill.textContent = `${Number(m)}/${Number(d)}(${dayName})${isToday ? ' 오늘' : ''}`;
    }

    const overrides = shiftStorage.getOverrides();
    const ov = overrides && overrides[dateStr] ? overrides[dateStr] : null;
    const ovType = ov && ov.shiftType ? ov.shiftType.trim() : '';
    const hasSpecialStatus = ovType && !['일근', '야근', '조근', '비번', '통상근무', '일반'].includes(ovType);

    const schedules = shiftStorage.getSchedulesForDate(dateStr);

    if (this.selectedScheduleText) {
      if (schedules.length === 0 && !hasSpecialStatus) {
        this.selectedScheduleBar.classList.remove('has-schedules');
        this.selectedScheduleText.innerHTML = `<span class="schedule-empty-hint">등록된 일정이 없습니다 <span class="add-plus-icon">(터치하여 일정·휴가 등록)</span></span>`;
      } else {
        this.selectedScheduleBar.classList.add('has-schedules');
        const statusPrefix = hasSpecialStatus
          ? `<span class="schedule-bar-vac-tag">${ovType.includes('대근') || ovType.includes('특근') || ovType.includes('당직') ? '⚡' : '🌿'} ${this.escapeHtml(ovType)}</span> `
          : '';

        if (schedules.length === 0) {
          this.selectedScheduleText.innerHTML = `${statusPrefix}<span class="schedule-sub-item">터치하여 개인 일정 추가 ＋</span>`;
          return;
        }

        const sorted = [...schedules].sort((a, b) => {
          const minA = parseScheduleTimeToMinutes(a.timeStr);
          const minB = parseScheduleTimeToMinutes(b.timeStr);
          if (minA !== minB) return minA - minB;
          return (a.id || '').localeCompare(b.id || '');
        });

        if (sorted.length === 1) {
          const item = sorted[0];
          const timeText = item.timeStr ? `⏰ ${this.formatDisplayTime(item.timeStr)} ` : '';
          this.selectedScheduleText.innerHTML = `${statusPrefix}<strong class="schedule-item-highlight">${timeText}${this.escapeHtml(item.title)}</strong>`;
        } else {
          const first = sorted[0];
          const time1 = first.timeStr ? `⏰ ${this.formatDisplayTime(first.timeStr)} ` : '';
          const second = sorted[1];
          const time2 = second.timeStr ? `${this.formatDisplayTime(second.timeStr)} ` : '';
          const remain = sorted.length - 2;

          let displayHtml = `${statusPrefix}<strong class="schedule-item-highlight">${time1}${this.escapeHtml(first.title)}</strong>`;
          displayHtml += ` · <span class="schedule-sub-item">${time2}${this.escapeHtml(second.title)}</span>`;
          if (remain > 0) {
            displayHtml += ` <span class="schedule-more-count">+${remain}건</span>`;
          }
          this.selectedScheduleText.innerHTML = displayHtml;
        }
      }
    }
  }

  populateDayShiftOptions(dateStr) {
    if (!this.elEditShiftSelect) return;
    const overrides = shiftStorage.getOverrides();
    const baseSettings = shiftStorage.getBaseSettings();
    const curOv = overrides && overrides[dateStr] ? overrides[dateStr].shiftType : '';
    const isRegular = this.isRegularMode();

    this.elEditShiftSelect.innerHTML = '';

    if (isRegular) {
      if (this.editShiftSectionLabel) {
        this.editShiftSectionLabel.textContent = '🌿 휴가 · 연차 · 특근 표시 설정';
      }
      const regularOpts = [
        { val: '__DEFAULT__', label: '일반 평일/주말 (별도 표시 안 함)' },
        { val: '연차', label: '🌿 연차 (달력 녹색 표시)' },
        { val: '휴가', label: '🌿 휴가 (달력 녹색 표시)' },
        { val: '오전반차', label: '🌿 오전반차 (달력 녹색 표시)' },
        { val: '오후반차', label: '🌿 오후반차 (달력 녹색 표시)' },
        { val: '병가·공가', label: '🌿 병가·공가 (달력 녹색 표시)' },
        { val: '출장·외근', label: '💼 출장·외근 (달력 파란색 표시)' },
        { val: '특근', label: '⚡ 특근·당직 (달력 빨간색 표시)' }
      ];
      regularOpts.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.val;
        opt.textContent = o.label;
        this.elEditShiftSelect.appendChild(opt);
      });
      if (curOv && regularOpts.some(o => o.val === curOv)) {
        this.elEditShiftSelect.value = curOv;
      } else if (curOv) {
        const customOpt = document.createElement('option');
        customOpt.value = curOv;
        customOpt.textContent = curOv;
        this.elEditShiftSelect.appendChild(customOpt);
        this.elEditShiftSelect.value = curOv;
      } else {
        this.elEditShiftSelect.value = '__DEFAULT__';
      }
    } else {
      const baseShift = calculateBaseShift(dateStr, baseSettings.baseDate, baseSettings.baseShiftIndex);
      if (this.editShiftSectionLabel) {
        this.editShiftSectionLabel.textContent = `🔄 이 날의 근무 / 휴가 변경 (기본: ${baseShift})`;
      }
      const shift4Opts = [
        { val: '__DEFAULT__', label: `기본 교대 패턴 유지 (${baseShift})` },
        { val: '일근', label: '일근 (수동 지정)' },
        { val: '야근', label: '야근 (수동 지정)' },
        { val: '조근', label: '조근 (수동 지정)' },
        { val: '비번', label: '비번 (휴무/미표시)' },
        { val: '일근대근', label: '⚡ 일근대근 (빨간색)' },
        { val: '야근대근', label: '⚡ 야근대근 (빨간색)' },
        { val: '조근대근', label: '⚡ 조근대근 (빨간색)' },
        { val: '일근휴가', label: '🌿 일근휴가 (녹색)' },
        { val: '야근휴가', label: '🌿 야근휴가 (녹색)' },
        { val: '조근휴가', label: '🌿 조근휴가 (녹색)' },
        { val: '연차', label: '🌿 연차 (녹색)' },
        { val: '오전반차', label: '🌿 오전반차 (녹색)' },
        { val: '오후반차', label: '🌿 오후반차 (녹색)' }
      ];
      shift4Opts.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.val;
        opt.textContent = o.label;
        this.elEditShiftSelect.appendChild(opt);
      });
      if (curOv && shift4Opts.some(o => o.val === curOv)) {
        this.elEditShiftSelect.value = curOv;
      } else {
        this.elEditShiftSelect.value = '__DEFAULT__';
      }
    }
  }

  openDayEditModal(dateStr, shiftInfo) {
    this.editingDateStr = dateStr;
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[dateObj.getDay()];

    const overrides = shiftStorage.getOverrides();
    const baseSettings = shiftStorage.getBaseSettings();
    const info = shiftInfo || getShiftInfoForDate(dateStr, overrides, baseSettings);

    if (this.elEditDateTitle) {
      this.elEditDateTitle.textContent = `${Number(m)}월 ${Number(d)}일 (${dayName}) 일정 · 휴가 관리`;
    }

    this.populateDayShiftOptions(dateStr);

    // 레거시 override.note 마이그레이션
    if (info.note && info.note.trim()) {
      const existingSchedules = shiftStorage.getSchedulesForDate(dateStr);
      if (!existingSchedules.some(s => s.title.trim() === info.note.trim())) {
        shiftStorage.addSchedule({
          id: 'migrated_' + Date.now(),
          dateStr,
          timeStr: info.noteTime || '',
          title: info.note.trim()
        });
      }
      const curOverride = overrides[dateStr] || {};
      shiftStorage.setOverrideForDate(dateStr, {
        ...curOverride,
        note: '',
        noteTime: ''
      });
    }

    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();
    const isPm = curH >= 12;
    const h12 = curH % 12 === 0 ? 12 : curH % 12;
    const m30 = curM < 30 ? '00' : '30';

    if (this.editScheduleAmPm) this.editScheduleAmPm.value = isPm ? '오후' : '오전';
    if (this.editScheduleHour) this.editScheduleHour.value = String(h12);
    if (this.editScheduleMinute) this.editScheduleMinute.value = m30;
    this.isScheduleTimeEnabled = true;
    this.updateScheduleTimeBadge();
    if (this.elEditNoteInput) this.elEditNoteInput.value = '';

    this.renderDayScheduleList();
    this.openModal(this.modalDayEdit);

    if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      setTimeout(() => {
        if (this.elEditNoteInput) this.elEditNoteInput.focus();
      }, 150);
    }
  }

  renderDayScheduleList() {
    if (!this.dayScheduleItemsContainer) return;
    this.dayScheduleItemsContainer.innerHTML = '';

    const schedules = shiftStorage.getSchedulesForDate(this.editingDateStr);
    if (this.dayScheduleCount) {
      this.dayScheduleCount.textContent = schedules.length;
    }
    if (this.btnDeleteSelectedSchedules) {
      this.btnDeleteSelectedSchedules.style.display = 'none';
    }

    if (schedules.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'day-schedule-empty';
      emptyDiv.textContent = '등록된 개인 일정이 없습니다. 아래에서 일정을 추가해보세요.';
      this.dayScheduleItemsContainer.appendChild(emptyDiv);
      return;
    }

    const sorted = [...schedules].sort((a, b) => {
      const minA = parseScheduleTimeToMinutes(a.timeStr);
      const minB = parseScheduleTimeToMinutes(b.timeStr);
      if (minA !== minB) return minA - minB;
      return (a.id || '').localeCompare(b.id || '');
    });

    sorted.forEach(item => {
      const itemRow = document.createElement('div');
      itemRow.className = 'day-schedule-item';

      const leftDiv = document.createElement('div');
      leftDiv.className = 'day-schedule-item-left';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'day-schedule-checkbox';
      checkbox.setAttribute('data-id', item.id);
      checkbox.addEventListener('change', () => this.updateDeleteSelectedButtonState());
      leftDiv.appendChild(checkbox);

      if (item.timeStr) {
        const timeBadge = document.createElement('span');
        timeBadge.className = 'day-schedule-time-badge';
        timeBadge.textContent = this.formatDisplayTime(item.timeStr);
        leftDiv.appendChild(timeBadge);
      } else {
        const allDayBadge = document.createElement('span');
        allDayBadge.className = 'day-schedule-time-badge is-allday';
        allDayBadge.textContent = '종일';
        leftDiv.appendChild(allDayBadge);
      }

      const titleSpan = document.createElement('span');
      titleSpan.className = 'day-schedule-title';
      titleSpan.textContent = item.title;
      leftDiv.appendChild(titleSpan);

      itemRow.appendChild(leftDiv);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-delete-single-schedule';
      delBtn.title = '이 일정 삭제';
      delBtn.innerHTML = '🗑️';
      delBtn.addEventListener('click', () => {
        shiftStorage.removeSchedule(item.id);
        this.renderDayScheduleList();
        this.renderCalendar();
        this.renderMonthlyNotes();
      });
      itemRow.appendChild(delBtn);

      this.dayScheduleItemsContainer.appendChild(itemRow);
    });
  }

  updateDeleteSelectedButtonState() {
    if (!this.btnDeleteSelectedSchedules || !this.dayScheduleItemsContainer) return;
    const checked = this.dayScheduleItemsContainer.querySelectorAll('.day-schedule-checkbox:checked');
    if (checked.length > 0) {
      this.btnDeleteSelectedSchedules.style.display = 'inline-flex';
      this.btnDeleteSelectedSchedules.innerHTML = `🗑️ 선택 삭제 (${checked.length})`;
    } else {
      this.btnDeleteSelectedSchedules.style.display = 'none';
    }
  }

  deleteSelectedSchedules() {
    if (!this.dayScheduleItemsContainer) return;
    const checked = this.dayScheduleItemsContainer.querySelectorAll('.day-schedule-checkbox:checked');
    if (checked.length === 0) return;

    if (confirm(`선택한 ${checked.length}개의 개인 일정을 삭제하시겠습니까?`)) {
      checked.forEach(cb => {
        const id = cb.getAttribute('data-id');
        if (id) shiftStorage.removeSchedule(id);
      });
      this.renderDayScheduleList();
      this.renderCalendar();
      this.renderMonthlyNotes();
    }
  }

  saveDayEdit() {
    if (!this.elEditNoteInput) return;
    const title = this.elEditNoteInput.value.trim();
    const timeStr = this.getSelectedTimeStr();

    if (!title) {
      alert('일정 내용을 입력해주세요.');
      this.elEditNoteInput.focus();
      return;
    }

    // 사용자가 휴가/근무 드롭다운을 기본값 이외로 변경한 경우에만 오버라이드 저장
    if (this.elEditShiftSelect && this.elEditShiftSelect.value && this.elEditShiftSelect.value !== '__DEFAULT__') {
      const shiftType = this.elEditShiftSelect.value;
      const currentOverride = shiftStorage.getOverrides()[this.editingDateStr] || {};
      shiftStorage.setOverrideForDate(this.editingDateStr, {
        ...currentOverride,
        shiftType,
        time: '',
        alarm: ''
      });
    }

    shiftStorage.addSchedule({
      id: 'sch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      dateStr: this.editingDateStr,
      timeStr,
      title
    });

    this.elEditNoteInput.value = '';
    this.renderDayScheduleList();
    this.renderCalendar();
    this.renderTodayCard();
    this.renderMonthlyNotes();
    this.showWeatherToast('📌 개인 일정이 달력에 등록되었습니다.');
  }

  formatKoreanTime(date) {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return {
      full: `${ampm} ${displayHour}:${minutes}:${seconds}`,
      short: `${ampm} ${displayHour}:${minutes}`,
      hhmm: `${String(hours).padStart(2, '0')}:${minutes}`
    };
  }

  startRealTimeClock() {
    const updateClock = () => {
      const now = new Date();
      const timeInfo = this.formatKoreanTime(now);
      if (this.elRealTimeClock) {
        this.elRealTimeClock.textContent = timeInfo.full;
      }
    };
    updateClock();
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.clockInterval = setInterval(updateClock, 1000);
  }

  async handleFileUpload(file) {
    this.ocrProgressBox.classList.add('active');
    this.ocrResultsArea.style.display = 'none';
    this.updateProgress(20, '파일 분석 및 전처리 중...');

    const profile = shiftStorage.getProfile();
    const targetPersonName = (profile.name || '').replace(/\s*님$/, '').trim();

    try {
      let extractedText = '';
      if (file.type.includes('pdf')) {
        this.updateProgress(40, 'PDF 페이지 텍스트 추출 중...');
        extractedText = await shiftOCRParser.extractTextFromPDF(file, (p, msg) => this.updateProgress(p, msg));
      } else {
        this.updateProgress(40, '근무표 이미지 OCR 분석 중...');
        extractedText = await shiftOCRParser.extractTextFromImage(file, (p, msg) => this.updateProgress(p, msg));
      }

      this.updateProgress(90, '근무표 패턴 및 일정 매칭 중...');
      const detected = shiftOCRParser.detectYearMonth(extractedText, file.name);
      this.detectedOcrYear = detected.detectedYear || this.currentYear;
      this.detectedOcrMonth = detected.detectedMonth || this.currentMonth;
      this.lastExtractedOcrText = extractedText;

      const results = targetPersonName
        ? shiftOCRParser.parseShiftTextForName(extractedText, targetPersonName, this.detectedOcrYear, this.detectedOcrMonth, file.name)
        : shiftOCRParser.parseShiftText(extractedText, this.detectedOcrYear, this.detectedOcrMonth);

      this.updateProgress(100, `분석 완료! (${this.detectedOcrYear}년 ${this.detectedOcrMonth}월)`);
      setTimeout(() => {
        this.ocrProgressBox.classList.remove('active');
        if (!results || results.length === 0) {
          alert(`인식된 대근/휴가 내역이 없습니다. 상단 프로필에서 본인 이름을 먼저 입력했는지 확인하거나 달력에서 직접 날짜를 터치하여 등록해 주세요.`);
        } else {
          this.renderOcrResults(results);
        }
      }, 400);
    } catch (err) {
      console.error(err);
      this.ocrProgressBox.classList.remove('active');
      alert('파일 분석 중 오류가 발생했습니다. 달력에서 날짜를 더블터치하여 직접 수정할 수 있습니다.');
    }
  }

  updateProgress(percent, msg) {
    if (this.progressBarFill) this.progressBarFill.style.width = percent + '%';
    if (this.progressStatusText) this.progressStatusText.textContent = msg;
  }

  renderOcrResults(items) {
    this.currentOcrItems = items;
    this.ocrResultsArea.style.display = 'block';
    this.ocrResultsTbody.innerHTML = '';

    items.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 800; font-size: 14px;">${item.day}일</td>
        <td>
          <select class="form-select ocr-shift-select" data-index="${index}" style="height: 36px; font-size: 13.5px; padding: 2px 6px;">
            <option value="일근대근" ${item.shiftType === '일근대근' ? 'selected' : ''}>⚡ 일근대근</option>
            <option value="야근대근" ${item.shiftType === '야근대근' ? 'selected' : ''}>⚡ 야근대근</option>
            <option value="조근대근" ${item.shiftType === '조근대근' ? 'selected' : ''}>⚡ 조근대근</option>
            <option value="일근휴가" ${item.shiftType === '일근휴가' ? 'selected' : ''}>🌿 일근휴가</option>
            <option value="야근휴가" ${item.shiftType === '야근휴가' ? 'selected' : ''}>🌿 야근휴가</option>
            <option value="조근휴가" ${item.shiftType === '조근휴가' ? 'selected' : ''}>🌿 조근휴가</option>
            <option value="일근" ${item.shiftType === '일근' ? 'selected' : ''}>일근</option>
            <option value="야근" ${item.shiftType === '야근' ? 'selected' : ''}>야근</option>
            <option value="조근" ${item.shiftType === '조근' ? 'selected' : ''}>조근</option>
            <option value="비번" ${item.shiftType === '비번' ? 'selected' : ''}>비번</option>
          </select>
        </td>
        <td><input type="text" class="form-input ocr-note-input" data-index="${index}" value="${this.escapeHtml(item.note || '')}" placeholder="개인 일정 / 메모" style="height: 36px; font-size: 13.5px;"></td>
      `;
      this.ocrResultsTbody.appendChild(tr);
    });
  }

  applyOcrResultsToSchedule() {
    if (!this.currentOcrItems || this.currentOcrItems.length === 0) {
      alert('적용할 인식 데이터가 없습니다.');
      return;
    }

    const selectElements = this.ocrResultsTbody.querySelectorAll('.ocr-shift-select');
    const noteElements = this.ocrResultsTbody.querySelectorAll('.ocr-note-input');

    this.currentOcrItems.forEach((item, index) => {
      const shiftType = selectElements[index].value;
      const note = noteElements[index].value.trim();
      shiftStorage.setOverrideForDate(item.dateStr, {
        shiftType,
        time: '',
        alarm: '',
        note: ''
      });
      if (note) {
        shiftStorage.addSchedule({
          dateStr: item.dateStr,
          timeStr: '',
          title: note
        });
      }
    });

    if (this.detectedOcrYear && this.detectedOcrMonth) {
      this.currentYear = this.detectedOcrYear;
      this.currentMonth = this.detectedOcrMonth;
      this.selectedDateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-01`;
    }

    alert(`총 ${this.currentOcrItems.length}건의 근무 변경사항이 ${this.currentYear}년 ${this.currentMonth}월 근무표에 반영되었습니다!`);
    this.closeModal(this.modalUpload);
    this.renderAll();
  }

  renderMonthlySummary() {
    if (!this.summaryContent) return;
    const overrides = shiftStorage.getOverrides();
    const baseSettings = shiftStorage.getBaseSettings();
    const schedules = shiftStorage.getSchedules();
    const lastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
    const monthPrefix = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-`;
    const monthScheduleCount = schedules.filter(s => (s.dateStr || '').startsWith(monthPrefix)).length;

    let counts = { '일근': 0, '야근': 0, '조근': 0, '비번': 0, '대근': 0, '휴가': 0 };
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${monthPrefix}${String(d).padStart(2, '0')}`;
      const shiftInfo = getShiftInfoForDate(dateStr, overrides, baseSettings);
      const st = shiftInfo.shiftType || '';
      if (st.includes('대근') || st.includes('특근')) counts['대근']++;
      else if (st.includes('휴가') || st.includes('연차') || st.includes('반차')) counts['휴가']++;
      else if (counts[st] !== undefined) counts[st]++;
    }

    this.summaryContent.innerHTML = `
      <div style="font-size: 16px; line-height: 1.9;">
        <h4 style="margin-bottom: 10px; font-size: 18px; font-weight: 800;">📊 ${this.currentYear}년 ${this.currentMonth}월 요약</h4>
        ${this.isRegularMode() ? '' : `
          <p>• <b>일근</b>: ${counts['일근']}일 / <b>야근</b>: ${counts['야근']}일 / <b>조근</b>: ${counts['조근']}일 / <b>비번</b>: ${counts['비번']}일</p>
        `}
        <p style="color: #059669;">• <b>휴가 · 연차 · 반차</b>: ${counts['휴가']}일</p>
        <p style="color: #ef4444;">• <b>특근 · 대근</b>: ${counts['대근']}일</p>
        <p style="color: #0284c7;">• <b>등록된 개인 일정</b>: ${monthScheduleCount}건</p>
      </div>
    `;
  }

  // ========= 실시간 날씨 연동 =========
  initWeather() {
    this.loadWeather();
    if (this.weatherTimer) clearInterval(this.weatherTimer);
    this.weatherTimer = setInterval(() => this.loadWeather(false), 30 * 60 * 1000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (!this.lastWeatherFetchTime || (now - this.lastWeatherFetchTime >= 30 * 60 * 1000)) {
          this.loadWeather(false);
        }
      }
    });

    const pillEl = document.getElementById('todayWeatherPill');
    if (pillEl) {
      pillEl.addEventListener('click', (e) => {
        if (e.target.closest('.weather-naver-link')) return;
        this.loadWeather(true);
      });
      pillEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.loadWeather(true);
        }
      });
    }
  }

  getCurrentWeatherLocation() {
    const defaultYeouido = {
      code: 'yeouido',
      name: '여의도동',
      query: '여의도동 날씨',
      lat: 37.528,
      lon: 126.924,
      daumUrl: 'https://m.search.daum.net/search?q=%EC%97%AC%EC%9D%98%EB%8F%84%EB%8F%99+%EB%82%A0%EC%94%A8&w=tot'
    };
    if (this.isRegularMode()) {
      return defaultYeouido;
    }
    try {
      if (typeof getWeatherLocationForDateTime === 'function') {
        const overrides = shiftStorage.getOverrides();
        const baseSettings = shiftStorage.getBaseSettings();
        return getWeatherLocationForDateTime(new Date(), overrides, baseSettings);
      }
    } catch (e) {}
    return defaultYeouido;
  }

  getDaumWeatherIcon(desc) {
    if (!desc) return '☀️';
    const d = desc.trim();
    if (d.includes('비') || d.includes('소나기')) return '🌧️';
    if (d.includes('눈') || d.includes('진눈깨비')) return '❄️';
    if (d.includes('천둥') || d.includes('뇌우')) return '⛈️';
    if (d.includes('안개')) return '🌫️';
    if (d.includes('흐림')) return '☁️';
    if (d.includes('구름많음')) return '⛅';
    if (d.includes('구름조금')) return '🌤️';
    return '☀️';
  }

  async loadWeather(isManual = false) {
    if (this.isWeatherLoading) return;
    this.isWeatherLoading = true;

    const loc = this.getCurrentWeatherLocation();
    const pillEl = document.getElementById('todayWeatherPill');
    const textEl = document.getElementById('weatherText');
    if (pillEl) pillEl.classList.add('is-updating');
    if (isManual && textEl) {
      textEl.textContent = `${loc.name} 실시간 날씨 갱신 중...`;
    }

    let loaded = false;

    try {
      const daumUrl = `https://m.search.daum.net/search?w=tot&q=${encodeURIComponent(loc.query)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(daumUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
        }
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const html = await res.text();
        const tempMatch = html.match(/class=["']txt_temp["']>([^<]+)/i) || html.match(/(\d{1,2}(?:\.\d)?)\s*(?:℃|°C|°)/i);
        const descMatch = html.match(/aria-label=["']([^"']+)["']\s*role=["']img["']/i) || html.match(/<strong class=["']txt_desc["']>([^<]+)<\/strong>/i);
        if (tempMatch) {
          const temp = parseFloat(parseFloat(tempMatch[1].trim()).toFixed(1));
          const text = descMatch ? descMatch[1].trim() : '맑음';
          const icon = this.getDaumWeatherIcon(text);
          this.weatherData = { temp, icon, text, locationName: loc.name, daumUrl: loc.daumUrl, updatedAt: new Date() };
          this.renderWeather();
          loaded = true;
        }
      }
    } catch (e) {}

    if (!loaded) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,precipitation,weather_code,cloud_cover&timezone=Asia%2FSeoul`;
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 4000);
        const res2 = await fetch(url, { signal: controller2.signal });
        clearTimeout(timeoutId2);
        if (res2.ok) {
          const data2 = await res2.json();
          const curr2 = data2 && data2.current;
          if (curr2 && curr2.temperature_2m !== undefined) {
            const temp = parseFloat(curr2.temperature_2m.toFixed(1));
            const info = this.getWeatherInfoDetailed(curr2.weather_code, curr2.precipitation || 0, 0, 0, 0, curr2.cloud_cover || 0);
            this.weatherData = { temp, icon: info.icon, text: info.text, locationName: loc.name, daumUrl: loc.daumUrl, updatedAt: new Date() };
            this.renderWeather();
            loaded = true;
          }
        }
      } catch (e) {}
    }

    this.isWeatherLoading = false;
    this.lastWeatherFetchTime = Date.now();

    if (pillEl) {
      pillEl.classList.remove('is-updating');
      if (loaded) {
        pillEl.classList.add('is-updated');
        setTimeout(() => pillEl.classList.remove('is-updated'), 650);
      }
    }

    if (isManual && loaded && this.weatherData) {
      const timeStr = this.weatherData.updatedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.showWeatherToast(`${loc.name} 실시간 날씨 (${timeStr}): ${this.weatherData.icon} ${this.formatTemp(this.weatherData.temp)}°C ${this.weatherData.text}`);
    }
  }

  formatTemp(temp) {
    const n = parseFloat(temp);
    return isNaN(n) ? String(temp) : n.toFixed(1);
  }

  getWeatherInfoDetailed(wmoCode, precip, rain, showers, snowfall, cloudCover) {
    if ([95, 96, 99].includes(wmoCode)) return { icon: '⛈️', text: '뇌우·비' };
    if ([71, 73, 75, 77, 85, 86].includes(wmoCode)) return { icon: '❄️', text: '눈' };
    const totalRain = (precip || 0) + (rain || 0) + (showers || 0);
    if (totalRain > 0 || [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(wmoCode)) {
      if (totalRain >= 10 || [65, 82].includes(wmoCode)) return { icon: '🌧️', text: '강한 비' };
      if ([51, 53, 55].includes(wmoCode)) return { icon: '🌦️', text: '이슬비' };
      return { icon: '🌧️', text: '비' };
    }
    if ([45, 48].includes(wmoCode)) return { icon: '🌫️', text: '안개' };
    if (wmoCode === 0) return { icon: '☀️', text: '맑음' };
    if (wmoCode === 1) return cloudCover < 30 ? { icon: '☀️', text: '맑음' } : { icon: '🌤️', text: '구름조금' };
    if (wmoCode === 2) return cloudCover < 60 ? { icon: '⛅', text: '구름많음' } : { icon: '🌥️', text: '대체로 흐림' };
    if (wmoCode === 3) return { icon: '☁️', text: '흐림' };
    if (cloudCover >= 80) return { icon: '☁️', text: '흐림' };
    if (cloudCover >= 50) return { icon: '⛅', text: '구름많음' };
    if (cloudCover >= 25) return { icon: '🌤️', text: '구름조금' };
    return { icon: '☀️', text: '맑음' };
  }

  renderWeather() {
    const iconEl = document.getElementById('weatherIcon');
    const textEl = document.getElementById('weatherText');
    const pillEl = document.getElementById('todayWeatherPill');
    const linkEl = document.getElementById('weatherNaverLink');
    if (!this.weatherData || !iconEl || !textEl) return;

    const { temp, icon, text, locationName, daumUrl, updatedAt } = this.weatherData;
    iconEl.textContent = icon;
    const tempDisplay = this.formatTemp(temp);
    const locTitle = locationName || '여의도동';
    textEl.textContent = `${locTitle} ${tempDisplay}°C ${text}`;

    if (linkEl && daumUrl) {
      linkEl.href = daumUrl;
      linkEl.title = `${locTitle} 다음 날씨 상세`;
      linkEl.innerHTML = '<img src="icons/daum-d.png" alt="다음" class="daum-badge-img"><span class="naver-arrow">↗</span>';
    }
    if (pillEl) {
      const timeStr = (updatedAt || new Date()).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      pillEl.title = `${locTitle} 실시간 날씨: ${tempDisplay}°C ${text} (${timeStr} 기준)`;
    }
  }

  showWeatherToast(msg) {
    let toast = document.getElementById('weatherToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'weatherToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(15, 23, 42, 0.94);
        color: #ffffff;
        font-size: 14px;
        font-weight: 800;
        padding: 10px 20px;
        border-radius: 9999px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(8px);
        z-index: 99999;
        opacity: 0;
        pointer-events: none;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        text-align: center;
        max-width: 92vw;
        border: 1px solid rgba(255, 255, 255, 0.15);
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = msg;
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    if (this._weatherToastTimer) clearTimeout(this._weatherToastTimer);
    this._weatherToastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(15px)';
    }, 2600);
  }

  // ========= 알람 연동 =========
  handleShiftAlarmClick() {
    const targetDateStr = this.selectedDateStr || this.todayDateStr;
    const [y, m, d] = targetDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dateObj.getDay();
    const dayName = weekDays[dayOfWeek];

    const alarmSettings = shiftStorage.getAlarmSettings();
    let alarmTimeStr = alarmSettings.regular || '07:30';
    let shiftType = '통상근무';
    let shiftBadgeText = '통상근무';

    if (this.isRegularMode()) {
      const ov = shiftStorage.getOverrides()[targetDateStr];
      if (ov && ov.shiftType) {
        shiftType = ov.shiftType;
        shiftBadgeText = ov.shiftType;
      }
      alarmTimeStr = alarmSettings.regular || '07:30';
    } else {
      const shiftInfo = getShiftInfoForDate(targetDateStr, shiftStorage.getOverrides(), shiftStorage.getBaseSettings());
      shiftType = shiftInfo.shiftType || '일근';
      shiftBadgeText = shiftType;
      if (shiftType.includes('야근')) alarmTimeStr = alarmSettings.night || '15:00';
      else if (shiftType.includes('조근')) alarmTimeStr = alarmSettings.early || '05:20';
      else if (shiftType.includes('일근')) alarmTimeStr = alarmSettings.day || '06:00';
      else {
        alarmTimeStr = alarmSettings.day || '06:00';
        shiftBadgeText = `${shiftType} (기본 알람)`;
      }
    }

    const [h, min] = alarmTimeStr.split(':').map(Number);
    const targetAlarmDate = new Date(y, m - 1, d, h, min, 0);
    const diffMs = targetAlarmDate.getTime() - Date.now();

    let remainText = '';
    if (diffMs <= 0) {
      remainText = '선택한 시각이 지남 (휴대폰 시계 앱에서 요일 알람으로 등록됩니다)';
    } else {
      const diffTotalMins = Math.floor(diffMs / (1000 * 60));
      const diffDays = Math.floor(diffTotalMins / (24 * 60));
      const diffHours = Math.floor((diffTotalMins % (24 * 60)) / 60);
      const diffMins = diffTotalMins % 60;
      if (diffDays > 0) remainText = `${diffDays}일 ${diffHours}시간 ${diffMins}분 후에 울립니다`;
      else if (diffHours > 0) remainText = `${diffHours}시간 ${diffMins}분 후에 울립니다`;
      else remainText = `${diffMins}분 후에 울립니다`;
    }

    const periodStr = h < 12 ? '오전' : '오후';
    const displayHour = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    const displayTime = `${periodStr} ${String(displayHour).padStart(2, '0')}:${String(min).padStart(2, '0')} (${alarmTimeStr})`;

    if (this.alarmPopupShiftBadge) this.alarmPopupShiftBadge.textContent = `${m}월 ${d}일 (${dayName}) · ${shiftBadgeText}`;
    if (this.alarmPopupTargetTime) this.alarmPopupTargetTime.textContent = displayTime;

    let selfH = h;
    let selfM = min + 1;
    if (selfM >= 60) {
      selfM = 0;
      selfH = (selfH + 1) % 24;
    }
    const selfPeriodStr = selfH < 12 ? '오전' : '오후';
    const selfDisplayHour = selfH === 0 ? 12 : (selfH > 12 ? selfH - 12 : selfH);
    if (this.alarmPopupSelfTime) {
      this.alarmPopupSelfTime.textContent = `${selfPeriodStr} ${String(selfDisplayHour).padStart(2, '0')}:${String(selfM).padStart(2, '0')} (알람시계 노출 & 터치 시 자동해제)`;
    }
    if (this.alarmPopupRemainTime) this.alarmPopupRemainTime.textContent = remainText;

    const androidDay = dayOfWeek + 1;
    this.pendingAlarmData = {
      hour: h,
      minute: min,
      dayOfWeek,
      androidDay,
      dayName,
      dateStr: targetDateStr,
      shiftType,
      message: `${m}/${d} ${shiftType} 알람`
    };

    const isAlreadyActive = shiftStorage.isAlarmActive(targetDateStr);
    if (this.btnDismissAlarmPopup) this.btnDismissAlarmPopup.style.display = isAlreadyActive ? 'inline-block' : 'none';
    if (this.btnConfirmAlarmPopup) this.btnConfirmAlarmPopup.textContent = isAlreadyActive ? '시계 알람 재설정' : '시계 알람 등록';

    if (this.autoResetTodayTimer) {
      clearTimeout(this.autoResetTodayTimer);
      this.autoResetTodayTimer = null;
    }

    this.openModal(this.modalAlarmPopup);
  }

  executeSetAlarm() {
    if (!this.pendingAlarmData) return;
    const { hour, minute, androidDay, shiftType, dayName, dateStr } = this.pendingAlarmData;
    this.closeModal(this.modalAlarmPopup);

    const padMinute = String(minute).padStart(2, '0');
    const [y, m, d] = dateStr.split('-').map(Number);
    const msgText = `[${m}/${d}(${dayName})] ${shiftType} 알람`;

    let calledNative = false;
    if (window.AndroidAlarm) {
      try {
        if (typeof window.AndroidAlarm.setShiftAlarm === 'function') {
          calledNative = window.AndroidAlarm.setShiftAlarm(y, m, d, hour, minute, shiftType);
        } else if (typeof window.AndroidAlarm.setAlarm === 'function') {
          window.AndroidAlarm.setAlarm(hour, minute, msgText, androidDay);
          calledNative = true;
        }
      } catch (err) {
        console.error('[RealtimeApp] Native bridge call failed:', err);
      }
    }

    if (!calledNative) {
      const intentUri = `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.alarm.HOUR=${hour};i.android.intent.extra.alarm.MINUTES=${minute};S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(msgText)};B.android.intent.extra.alarm.SKIP_UI=false;al.android.intent.extra.alarm.DAYS=${androidDay};end`;
      try {
        window.location.href = intentUri;
      } catch (e) {}
    }

    shiftStorage.addActiveAlarm(dateStr, {
      time: `${hour}:${padMinute}`,
      type: shiftType
    });
    this.renderCalendar();

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && !this.alarmAudioCtx) this.alarmAudioCtx = new AudioCtx();
      if (this.alarmAudioCtx && this.alarmAudioCtx.state === 'suspended') this.alarmAudioCtx.resume();
    } catch (e) {}

    this.showWeatherToast(`⏰ ${m}월 ${d}일(${dayName}) ${shiftType} 알람 (${hour}:${padMinute}) 등록 완료`);
  }

  executeDismissAlarm() {
    if (!this.pendingAlarmData) return;
    const { dateStr, shiftType, hour, minute } = this.pendingAlarmData;
    this.closeModal(this.modalAlarmPopup);

    const [y, m, d] = dateStr.split('-').map(Number);
    if (window.AndroidAlarm && typeof window.AndroidAlarm.cancelShiftAlarm === 'function') {
      try {
        window.AndroidAlarm.cancelShiftAlarm(y, m, d, hour, minute);
      } catch (e) {}
    }

    shiftStorage.removeActiveAlarm(dateStr);
    this.renderCalendar();
    this.showWeatherToast(`🔕 ${m}월 ${d}일 ${shiftType} 알람이 해제되었습니다.`);
  }

  initSelfAlarmMonitor() {
    setInterval(() => this.checkSelfAlarm(), 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.checkSelfAlarm();
    });
    window.addEventListener('focus', () => this.checkSelfAlarm());
  }

  checkSelfAlarm() {
    if (this.isSelfAlarmRinging) return;
    const now = new Date();
    const todayDateStr = formatDateString(now);
    const activeAlarms = shiftStorage.getActiveAlarms();
    const todayAlarm = activeAlarms[todayDateStr];
    if (!todayAlarm || !todayAlarm.time) return;

    const parts = todayAlarm.time.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return;

    let targetSelfH = parts[0];
    let targetSelfM = parts[1] + 1;
    if (targetSelfM >= 60) {
      targetSelfM = 0;
      targetSelfH = (targetSelfH + 1) % 24;
    }

    if (now.getHours() === targetSelfH && now.getMinutes() === targetSelfM && !todayAlarm.selfAlarmRung) {
      todayAlarm.selfAlarmRung = true;
      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ALARMS, JSON.stringify(activeAlarms));
      } catch (e) {}
      this.triggerSelfAlarm(todayDateStr, todayAlarm, targetSelfH, targetSelfM);
    }
  }

  triggerSelfAlarm(dateStr, alarmObj, selfHour, selfMinute) {
    if (this.isSelfAlarmRinging) return;
    this.isSelfAlarmRinging = true;
    this.currentSelfAlarmDateStr = dateStr;

    const [y, m, d] = dateStr.split('-').map(Number);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[new Date(y, m - 1, d).getDay()] || '';

    const periodStr = selfHour < 12 ? '오전' : '오후';
    const displayHour = selfHour === 0 ? 12 : (selfHour > 12 ? selfHour - 12 : selfHour);
    const displayTime = `${periodStr} ${String(displayHour).padStart(2, '0')}:${String(selfMinute).padStart(2, '0')}`;

    if (this.selfAlarmRingBadge) {
      this.selfAlarmRingBadge.textContent = `${m}월 ${d}일 (${dayName}) · ${alarmObj.type || '일정'} 알람 (+1분)`;
    }
    if (this.selfAlarmRingTime) {
      this.selfAlarmRingTime.textContent = displayTime;
    }
    if (this.modalSelfAlarmRing) {
      this.openModal(this.modalSelfAlarmRing);
    }
    this.playSelfAlarmSound();
  }

  playSelfAlarmSound() {
    this.stopSelfAlarmSound();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!this.alarmAudioCtx) this.alarmAudioCtx = new AudioCtx();
        if (this.alarmAudioCtx.state === 'suspended') this.alarmAudioCtx.resume();

        const ringTone = () => {
          if (!this.isSelfAlarmRinging || !this.alarmAudioCtx) return;
          try {
            const t = this.alarmAudioCtx.currentTime;
            const osc1 = this.alarmAudioCtx.createOscillator();
            const gain1 = this.alarmAudioCtx.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(880, t);
            osc1.frequency.setValueAtTime(1174.66, t + 0.1);
            gain1.gain.setValueAtTime(0.4, t);
            gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc1.connect(gain1);
            gain1.connect(this.alarmAudioCtx.destination);
            osc1.start(t);
            osc1.stop(t + 0.26);

            const osc2 = this.alarmAudioCtx.createOscillator();
            const gain2 = this.alarmAudioCtx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(880, t + 0.3);
            osc2.frequency.setValueAtTime(1318.51, t + 0.4);
            gain2.gain.setValueAtTime(0.45, t + 0.3);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.58);
            osc2.connect(gain2);
            gain2.connect(this.alarmAudioCtx.destination);
            osc2.start(t + 0.3);
            osc2.stop(t + 0.6);
          } catch (e) {}
        };
        ringTone();
        this.selfAlarmInterval = setInterval(ringTone, 850);
      }
    } catch (e) {}

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([400, 200, 400, 200, 800, 400]);
        this.selfAlarmVibrateInterval = setInterval(() => {
          if (this.isSelfAlarmRinging && 'vibrate' in navigator) {
            navigator.vibrate([400, 200, 400, 200, 800, 400]);
          }
        }, 2600);
      } catch (e) {}
    }
  }

  stopSelfAlarmSound() {
    if (this.selfAlarmInterval) {
      clearInterval(this.selfAlarmInterval);
      this.selfAlarmInterval = null;
    }
    if (this.selfAlarmVibrateInterval) {
      clearInterval(this.selfAlarmVibrateInterval);
      this.selfAlarmVibrateInterval = null;
    }
    if ('vibrate' in navigator) {
      try { navigator.vibrate(0); } catch (e) {}
    }
  }

  dismissSelfAlarm() {
    if (!this.isSelfAlarmRinging) return;
    this.isSelfAlarmRinging = false;
    this.stopSelfAlarmSound();
    if (this.modalSelfAlarmRing) this.closeModal(this.modalSelfAlarmRing);

    const targetDate = this.currentSelfAlarmDateStr;
    if (targetDate) {
      shiftStorage.removeActiveAlarm(targetDate);
      this.currentSelfAlarmDateStr = null;
    }
    this.renderCalendar();
    this.showWeatherToast('⏰ 알람이 꺼졌으며 자동 해제되었습니다.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new ShiftApp();
});
