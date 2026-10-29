# ⏰ realtime

스마트 캘린더 (통상근무 / 4교대근무 전환) & 실시간 대중교통(국회의사당역 · 여의도역 · KBS 19130 상시 노출 및 정류장/버스 통합 검색) 모바일 애플리케이션 및 웹앱입니다.

---

## 📱 최신 버전 APK 자동 다운로드 & QR 코드 (GitHub Releases 연동)

코드를 업데이트하여 푸시할 때마다 [GitHub Releases](https://github.com/jongringer/realtime/releases)에 **`v1.0.0` → `v1.0.1` → `v1.0.2`...** 순으로 새 버전이 자동 생성되며, 아래 **QR 코드와 다운로드 링크는 항상 가장 최신 버전의 `realtime.apk`**로 자동 연결됩니다.

| 📲 항상 최신 버전 APK 다운로드 (Releases) | 🌐 실시간 공개 웹앱 바로가기 |
| :---: | :---: |
| [![최신 realtime.apk 다운로드 QR](https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&ecc=M&data=https://github.com/jongringer/realtime/releases/latest/download/realtime.apk)](https://github.com/jongringer/realtime/releases/latest/download/realtime.apk) | [![웹앱 바로가기 QR](https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&ecc=M&data=https://kbs-realtime.surge.sh)](https://kbs-realtime.surge.sh) |
| **[📥 최신 버전 realtime.apk 바로 다운로드](https://github.com/jongringer/realtime/releases/latest/download/realtime.apk)** | **[🔗 실시간 웹앱 바로가기](https://kbs-realtime.surge.sh)** |
| `https://github.com/jongringer/realtime/releases/latest/download/realtime.apk` | `https://kbs-realtime.surge.sh` |
| **[📦 버전별 전체 Releases 목록 보기](https://github.com/jongringer/realtime/releases)** | [⚡ Surge 실시간 APK 미러](https://kbs-realtime.surge.sh/realtime.apk) |

---

## 🌟 주요 기능

1. **사용자 맞춤형 프로필 & 근무형태 즉시 선택**:
   - 좌상단 프로필 터치 시 본인 이름 및 소속 직접 입력.
   - 상단 `[🗓️ 통상근무 | 🔄 4교대근무]` 전환 스위치로 즉시 변경.

2. **근무형태별 맞춤 캘린더 & 개인 일정·휴가 시인성 극대화**:
   - **통상근무**: 교대 뱃지 없는 순수한 달력에 공휴일, 휴가(`연차/휴가/반차/병가/공가/특근`), 개인 일정을 선명한 컬러 뱃지로 표시.
   - **4교대근무**: 4조 3교대(`일근 → 야근 → 조근 → 비번`) 자동 계산 엔진, PDF/사진 근무표 OCR 인식 및 대근/휴가 변경 지원.
   - 일정 및 휴가 편집 팝업창 글씨 및 입력창 대폭 확대.

3. **실시간 대중교통 3대 거점 상시 노출**:
   - 🚇 **국회의사당역** (9호선 상·하행 다음/다다음 열차)
   - 🚇 **여의도역** (9호선 급행·일반 + 5호선 상·하행)
   - 🚏 **버스정류장 19130 (KBS)**: 162, 5615, 5618, 10부천, 70-2부천 등 전체 경유 버스 실시간 카운트다운

4. **실시간 정류장 + 버스번호 통합 검색 서비스**:
   - 정류장 5자리 번호(ARS), 정류소명, 버스 번호 단독 검색 지원.
   - **`[정류장 + 버스번호]` 동시 입력**(예: `19130 162`, `KBS 5618`, `여의도환승센터 260`) 시 해당 정류장의 선택 버스를 최상단에 고정 하이라이트.

5. **버전 자동 릴리스 및 인앱 업데이트 알림**:
   - `main` 브랜치 푸시 시 GitHub Actions가 자동으로 패치 버전(`v1.0.0` → `v1.0.1` → ...)을 올려 서명 APK를 빌드하고 [Releases](https://github.com/jongringer/realtime/releases)에 등록합니다.
   - 기존 설치된 앱 실행 시 새 버전이 감지되면 상단에 **원터치 업데이트 다운로드 배너**가 표시됩니다.
