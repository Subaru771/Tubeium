@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0.."

echo.
echo [Tubeium Fast Build] Checking Node.js and dependencies...
where node.exe >nul 2>nul
if errorlevel 1 goto nonode
where npm.cmd >nul 2>nul
if errorlevel 1 goto nonode

if not exist "package-lock.json" goto generatelock
call node scripts\check-dependency-lock.js >nul 2>nul
if errorlevel 1 goto regeneratelock
goto checkcache

:generatelock
echo First-time setup: generating package-lock.json...
:regeneratelock
call npm.cmd install --package-lock-only --ignore-scripts --no-audit --no-fund
if errorlevel 1 goto fail

:checkcache
call node scripts\check-dependency-lock.js
if errorlevel 1 goto fail
if /i "%TUBEIUM_CLEAN_INSTALL%"=="1" goto install
call node scripts\fast-build-cache.js check
if not errorlevel 1 goto ready

:install
echo Installing dependencies (only necessary the first time or when changed)...
call npm.cmd ci --no-audit --no-fund
if errorlevel 1 goto fail
call node scripts\fast-build-cache.js mark
if errorlevel 1 goto fail

:ready
echo Dependencies ready.
exit /b 0

:nonode
echo ERROR: Node.js/npm not found. Install Node.js LTS and reopen this script.
exit /b 1
:fail
echo ERROR: Dependency setup failed. Check npm and network connectivity.
exit /b 1
