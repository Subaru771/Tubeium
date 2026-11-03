@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0.."
title Tubeium - FAST Windows Installer
color 0B

echo.
echo ==========================================================
echo   Tubeium FAST Windows Installer (reuse dependencies)
echo ==========================================================
echo Keeps the reliable runtime snapshot and NSIS retry.
echo Builds installer ONLY. Use BUILD_WINDOWS_EXE.cmd for both.
echo.
call scripts\fast-build-deps.cmd
if errorlevel 1 goto fail
for /f %%V in ('node scripts\fast-build-cache.js version') do set "TUBEIUM_VERSION=%%V"
if not defined TUBEIUM_VERSION goto fail

echo.
echo [1/4] Running source tests and release checks...
call npm.cmd run verify:release
if errorlevel 1 goto fail

echo.
echo [2/4] Updating the Windows app runtime...
set "CSC_IDENTITY_AUTO_DISCOVERY=false"
if exist "dist\win-unpacked" rmdir /s /q "dist\win-unpacked"
call "node_modules\.bin\electron-builder.cmd" --win --x64 --dir --publish never
if errorlevel 1 goto fail
if not exist "dist\win-unpacked\Tubeium.exe" goto missingruntime
for %%F in (chrome_100_percent.pak chrome_200_percent.pak LICENSE.electron.txt) do (
  if not exist "dist\win-unpacked\%%F" (
    if exist "node_modules\electron\dist\%%F" copy /Y "node_modules\electron\dist\%%F" "dist\win-unpacked\%%F" >nul
  )
  if not exist "dist\win-unpacked\%%F" goto missingruntime
)

echo.
echo [3/4] Synchronizing the stable installer snapshot...
rem /MIR copies only changed files if snapshot already exists.
robocopy "dist\win-unpacked" "_tubeium_build_staging" /MIR /COPY:DAT /R:2 /W:1 /NFL /NDL /NJH /NJS
if errorlevel 8 goto fail
if not exist "_tubeium_build_staging\Tubeium.exe" goto missingruntime
for %%F in (chrome_100_percent.pak chrome_200_percent.pak LICENSE.electron.txt) do (
  if not exist "_tubeium_build_staging\%%F" goto missingruntime
)

echo.
echo [4/4] Creating Windows setup EXE (installer only)...
call "node_modules\.bin\electron-builder.cmd" --prepackaged "%CD%\_tubeium_build_staging" --win nsis --x64 --publish never --config.nsis.differentialPackage=false
if errorlevel 1 goto retry
if not exist "dist\Tubeium-%TUBEIUM_VERSION%-Setup-x64.exe" goto retry
goto done

:retry
echo Retrying with alternate NSIS ZIP compression...
call "node_modules\.bin\electron-builder.cmd" --prepackaged "%CD%\_tubeium_build_staging" --win nsis --x64 --publish never --config.nsis.useZip=true --config.nsis.differentialPackage=false
if errorlevel 1 goto fail
if not exist "dist\Tubeium-%TUBEIUM_VERSION%-Setup-x64.exe" goto fail

:done
echo.
echo SUCCESS: dist\Tubeium-%TUBEIUM_VERSION%-Setup-x64.exe
echo No portable EXE was built; use the full builder when needed.
explorer.exe "%CD%\dist"
pause
exit /b 0

:missingruntime
echo ERROR: Electron runtime files missing. Inspect Windows Security Protection history.
echo Do not disable security protections or distribute incomplete builds.
goto fail
:fail
echo.
echo Fast build failed; original project and full builder are unchanged.
pause
exit /b 1
