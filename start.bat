@echo off
chcp 65001 > nul
echo ========================================================
echo   4조 3교대 스마트 근무표 웹 애플리케이션 시작
echo ========================================================
echo.
echo 브라우저에서 바로 열거나 로컬 서버를 실행합니다.
echo 1. 기본 웹 브라우저로 index.html 바로 열기 (내 컴퓨터에서)
echo 2. 로컬 Node.js 웹 서버 실행 (http://localhost:3000)
echo 3. 클라우드 24시간 상시 배포 (컴퓨터 꺼도 카카오톡 링크로 접속)
echo.

set /p choice="실행 방식을 선택하세요 (1, 2, 3, 기본값: 1): "
if "%choice%"=="2" (
    echo.
    echo Node.js 서버를 시작합니다...
    node server.js
) else if "%choice%"=="3" (
    echo.
    call 배포하기.bat
) else (
    echo.
    echo 기본 브라우저에서 근무표를 엽니다...
    start index.html
)
