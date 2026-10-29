@echo off
cd /d "%~dp0"

echo ========================================================
echo   Pushing to GitHub: https://github.com/jongringer/realtime
echo   (GitHub Actions will auto-increment Release version!)
echo ========================================================
echo.

echo [Step 1] Syncing latest version metadata from origin/main...
git pull --rebase origin main

echo.
echo [Step 2] Pushing main branch...
git push -u origin main

echo.
echo ========================================================
echo   Done! New versioned APK Release is building at:
echo   https://github.com/jongringer/realtime/actions
echo   Releases: https://github.com/jongringer/realtime/releases
echo ========================================================
