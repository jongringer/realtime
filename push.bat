@echo off
cd /d "%~dp0"

echo ========================================================
echo   Pushing to GitHub: https://github.com/jongringer/realtime
echo ========================================================
echo.

echo [Step 1] Pushing main branch...
git push -u origin main

echo.
echo [Step 2] Pushing latest tags...
git push --tags origin

echo.
echo ========================================================
echo   Done! Check your build at:
echo   https://github.com/jongringer/realtime/actions
echo ========================================================
