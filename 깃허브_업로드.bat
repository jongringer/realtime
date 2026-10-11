@echo off
cd /d "%~dp0"

echo ========================================================
echo   Pushing to GitHub: https://github.com/jongringer/apk
echo ========================================================
echo.

echo [Step 1] Pushing main branch...
git push -u origin main

echo.
echo [Step 2] Pushing tag v1.2.39...
git push origin v1.2.39

echo.
echo ========================================================
echo   Done! Check your build at:
echo   https://github.com/jongringer/apk/actions
echo ========================================================
pause
