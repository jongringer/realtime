# AGENTS.md - Shift Schedule App Control Plane

## 1. Agent Role & Core Directives
- **역할:** 본 프로젝트의 시니어 풀스택 엔지니어이자 엄격한 아키텍트 역할 수행.
- **최소 개입 원칙:** 요청받지 않은 리팩터링, 불필요한 보일러플레이트 생성, 과도한 주석 추가 금지.
- **토큰 최적화:** 설명은 최소화하고 diff 기반 또는 실제 변경이 필요한 코드 블록 위주로 신속하게 응답 작성.
- **[핵심 제약 - 근무표 알고리즘 보존]** 교대 근무 패턴 계산 엔진(당직, 비번, 야간, 휴무 로직) 및 날짜 계산 유틸리티 수정 시 기존 단위 테스트 통과 필수 (`npm.cmd test`).
- **[핵심 제약 - DB/스토리지 무결성 보호]** 로컬 DB/스토리지(LocalStorage, Filesystem) 마이그레이션 시 파괴적 초기화(destructive fallback) 절대 금지.
- **[핵심 제약 - 코드 청결성 원칙]** 신규 코드 작성 시 기존 레거시 함수를 주석 처리한 채 방치하는 행위 금지. 사용하지 않는 코드는 즉시 영구 삭제할 것 (`.agents/skills/clean-codebase/SKILL.md`).

## 2. Tech Stack & Version Pinning
- **Framework/Runtime:** Capacitor 8.5.2, Vanilla JavaScript (ES6+), Node.js, Android SDK / Gradle 8.x (Kotlin/Java)
- **State Management:** LocalStorage 기반 상태 관리 (`js/storage.js`) 및 이벤트 기반 통신
- **Styling/UI:** Vanilla CSS (`css/`), 모바일 최적화 반응형 레이아웃, 글래스모피즘
- **Database/Storage:** Browser LocalStorage, Capacitor Filesystem (`@capacitor/filesystem` 8.1.3)
- **Native Engine:** Android Native AlarmManager / Service (`android/app/src/main/java/com/shiftalarm/app/alarm/`)
- **제약:** 지정된 기술 스택 외 추가 외부 라이브러리 설치 시 반드시 사용자 사전 승인 필수.

## 3. Directory & Architecture Boundaries
- **디렉터리 규칙:**
  - `index.html`, `css/`: UI 프레젠테이션 컴포넌트 및 스타일 전용
  - `js/shift-engine.js`: 근무표 교대 패턴 및 순환 계산 도메인 엔진 (비즈니스 로직 격리)
  - `js/ocr-parser.js`, `js/transit.js`: 도메인 단위 기능 분리 및 순수 로직 유지
  - `js/storage.js`: 영속화 및 스토리지 I/O 전용
  - `android/app/src/main/java/.../alarm/`: 안드로이드 네이티브 알람 엔진
  - `test-engine.js`, `test-ocr.js`: 엔진 검증 단위 테스트 스위트
- **경계 준수:** UI 레이어(`index.html`, `js/app.js`)는 도메인 엔진 및 스토리지 모듈의 공개 인터페이스(API/함수)를 통해서만 호출.

## 4. Coding Standards & Conventions
- **타입 및 안정성:** Any/Unknown 스타일의 느슨한 데이터 처리 지양, 엄격한 유효성 검증 우선 적용.
- **명명 규칙:**
  - 파일명: 도메인/엔진 모듈은 kebab-case, 클래스는 PascalCase.
  - 변수/함수명: 의도가 드러나는 명확한 동사+명사 조합 사용.
- **에러 핸들링:**
  - 침묵하는 catch 블록(`catch (e) {}`) 절대 금지.
  - 사용자 친화적 에러 메시지 반환 및 구조화된 콘솔/로깅 강제.

## 5. Tool Usage & Execution Safeguards
- **파일 탐색 제한:** 한 번에 전체 프로젝트 트리를 탐색하지 말고, 작업 대상 디렉터리만 특정하여 조사.
- **빌드/테스트 검증:**
  - 코드 변경 후 터미널 명령어(`npm.cmd test`, 빌드 스크립트 등)를 실행하여 회귀 버그 발생 여부 자체 확인.
  - 빌드 실패 시 기존 코드를 임의로 전면 재작성하지 말고, 실패 로그의 원인 줄만 타깃팅하여 최소 단위 수정.
- **파일 수정 단위:** 단일 파일 300줄 초과 방지, 거대해질 경우 모듈 분할 검토.

## 6. Prohibitions (엄격 금지 사항)
1. 사용자가 요청하지 않은 기존 정상 동작 코드의 아키텍처 임의 변경 금지.
2. 검증되지 않은 가상의 라이브러리/패키지 import 금지 (환각 방지).
3. 환경변수(`.env`), 시크릿 키, 개인 식별 정보를 코드에 직접 하드코딩하는 행위 금지.
4. 동일한 빌드 에러에 대해 근거 없는 추측으로 수정을 3회 이상 반복하는 무한 루프 금지 (실패 시 원인 보고 후 사용자 확인 요청).

---

# 프로젝트 운영 및 자동화 규칙 (Project Operational Protocol)

사용자의 명시적 요청에 따라 다음 원칙과 워크플로우를 항상 최우선으로 준수합니다.

## 1. 코딩 및 업데이트 완료 시 (카카오톡 공유 링크 상시 제공)
- 코드 수정 및 기능 구현이 완료되어 빌드/배포(Surge / Web)되면, 항상 **카카오톡 전송용 인터넷 하이퍼링크**를 채팅창에 제공합니다.
  - **웹앱 바로가기**: [https://kbs-4shift-5855.surge.sh](https://kbs-4shift-5855.surge.sh)
  - **최신 APK 다이렉트 다운로드 링크**: [https://kbs-4shift-5855.surge.sh/ShiftAlarm.apk](https://kbs-4shift-5855.surge.sh/ShiftAlarm.apk)
- 카카오톡 채팅방에 복사하여 붙여넣었을 때 스마트폰에서 터치 한 번으로 바로 열리거나 다운로드될 수 있는 명확한 링크 형식을 유지합니다.

## 2. GitHub Actions 클라우드 빌드 & Release 등록 완료 시
- GitHub Actions 클라우드에서 안드로이드 정식 서명 APK 빌드 및 GitHub Release 등록이 완료되는 즉시:
  1. **채팅창 알림 공지**: 정식 서명 빌드 완료 및 릴리스 활성화 사실을 알립니다.
  2. **PC 다운로드 폴더 자동 저장**: 사용자 컴퓨터의 다운로드 폴더(`C:\Users\KBS\Downloads\`)로 최신 서명 APK 파일을 즉시 자동으로 다운로드합니다.
  3. **탐색기 표출 및 공지**: 윈도우 탐색기(`explorer /select,...`)로 다운로드된 최신 APK 파일을 화면에 띄우고, 다운로드 완료 사실과 버전명을 공지합니다.
  4. **웹 다운로드 링크 갱신**: 신규 서명 APK를 Surge 배포 디렉토리(`dist/ShiftAlarm.apk`)에도 동기화 배포하여 웹 다이렉트 다운로드 링크 역시 항상 최신 버전을 가리키도록 유지합니다.

## 3. 금융 앱(토스·은행 등) 악성앱 오탐 방지 영구 아키텍처 원칙 (필수 준수)
- **패키지명(applicationId):** `com.kbs.shiftwork` 영구 유지 (기존 오탐 이력의 `com.shiftalarm.app` 절대 재사용 금지).
- **절대 금지 권한 및 코드:**
  1. `REQUEST_INSTALL_PACKAGES` (트로이목마 다운로더 오탐 1순위) 절대 선언 금지.
  2. `requestDismissKeyguard` 및 `FLAG_DISMISS_KEYGUARD` (잠금화면 무단 해제 해킹 행위로 분류) 절대 포함 금지.
  3. `USE_FULL_SCREEN_INTENT`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` 등 특권 권한 금지.
- **알람 처리 표준:**
  - 자체 네이티브 브로드캐스트 수신기나 백그라운드 서비스를 만들지 않고, 안드로이드 순정 인텐트(`AlarmClock.ACTION_SET_ALARM`)를 통해 삼성 갤럭시 기본 시계 앱으로 알람을 안전하게 위임 전송한다.
  - 이로써 모든 국내 금융 앱 백신(AppIron, V3, FakeFinder 등)의 오탐을 원천 차단하고 100% 안전성을 영구 보장한다.
