# Agent Execution Harness (`harness.md`)

## 1. Project Context & Constraints
- **Target Application**: Android 근무표 및 대중교통 알림 앱 (Kotlin / Jetpack Compose / Capacitor Web)
- **Primary Objective**: 토큰 소비 최소화, 무작위 탐색 차단, 결정론적 코드 생성
- **Token Saver Policy**:
  - 파일 전체 재작성 금지 (필요한 Diff/Patch 블록만 생성)
  - 불필요한 서론/결론 및 설명 생략
  - 요청된 작업 범위 외의 리팩토링 및 파일 수정 금지

## 2. Directory Index & Critical Paths
- `app/src/main/java/.../data/`: 근무 스케줄, 순환근무(일근/야근/조근) 데이터 모델 및 로컬 DB
- `app/src/main/java/.../transit/`: 지하철 9호선 실시간 도착 정보 및 출퇴근 트래커
- `app/src/main/java/.../ui/`: UI 레이아웃
- `.github/workflows/`: GitHub Actions APK 빌드 및 릴리즈 파이프라인

## 3. Enforcement & Verification Protocols
1. **Lint Check**: 코드 변경 후 반드시 정적 분석 린트 통과 여부 검증
2. **Build Verification**: 단위 테스트(`npm.cmd test` / `gradle test`) 통과 필수
3. **Dead Code Protocol**: 사용되지 않는 import, 디버그 로그, 임시 함수 즉시 제거
4. **Security Boundary**: 외부 API Key 및 인증 정보의 하드코딩 엄격 금지 (`local.properties` 또는 Secrets 활용)

## 4. Execution Rules
- 에이전트는 파일 수정 전 반드시 대상 파일 경로와 변경 범위를 1줄 이내로 명시한다.
- 불확실한 종속성 추가는 사전에 확인받고 진행한다.
