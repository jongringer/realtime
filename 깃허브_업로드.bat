@echo off
cd /d "C:\Users\KBS\근무표"

echo ========================================================
echo   Pushing to GitHub: https://github.com/jongringer/apk
echo ========================================================
echo.

echo [Step 1] Pushing main branch...
"C:\Program Files\Git\cmd\git.exe" push -u origin main

echo.
echo [Step 2] Pushing tag v1.0.4...
"C:\Program Files\Git\cmd\git.exe" push origin v1.0.4

echo.
echo ========================================================
echo   Done! Check your build at:
echo   https://github.com/jongringer/apk/actions
echo ========================================================
pause
