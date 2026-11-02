@echo off
setlocal
cd /d "%~dp0"
echo ======================================================
echo  Tubeium v4.5.4 - GitHub Source Publisher
echo ======================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0PUBLISH_TUBEIUM.ps1"
if errorlevel 1 (
  echo.
  echo Publishing did not complete. Read the error above.
) else (
  echo.
  echo Publisher finished. Check your GitHub repository.
)
pause
