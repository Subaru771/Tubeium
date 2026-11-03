@echo off
setlocal
cd /d "%~dp0.."
echo Tubeium dependency lockfile setup - requires internet and npm.
where npm.cmd >nul 2>nul || (echo npm.cmd not found. Install Node.js LTS. & pause & exit /b 1)
call npm.cmd install --package-lock-only --ignore-scripts --no-audit --no-fund
if errorlevel 1 (echo Failed. package-lock.json not ready. & pause & exit /b 1)
call npm.cmd run verify:dependencies
if errorlevel 1 (echo Lockfile validation failed. & pause & exit /b 1)
echo.
echo SUCCESS: package-lock.json created and validated.
echo Commit package-lock.json to GitHub before publishing a release.
pause
