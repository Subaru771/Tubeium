@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0.."
title Tubeium - Windows Build Repair
color 0B

echo.
echo ==============================================================
echo    Tubeium - Original App / Windows Builder Repair
echo ==============================================================
echo.
echo Tubeium native Windows: release readiness checks and original app retained.
echo.
where node.exe >nul 2>nul
if errorlevel 1 goto nonode
where npm.cmd >nul 2>nul
if errorlevel 1 goto nonode

echo [1/7] Node.js and npm
node --version
call npm.cmd --version
if errorlevel 1 goto fail
for /f "delims=" %%V in ('node scripts\fast-build-cache.js version') do set "TUBEIUM_VERSION=%%V"
if not defined TUBEIUM_VERSION goto fail
set "TUBEIUM_SETUP=dist\Tubeium-%TUBEIUM_VERSION%-Setup-x64.exe"
set "TUBEIUM_PORTABLE=dist\Tubeium-%TUBEIUM_VERSION%-Portable-x64.exe"
echo Building Tubeium %TUBEIUM_VERSION%

echo.
echo [2/7] Installing locked dependencies
if not exist "package-lock.json" (
  echo.
  echo First-time setup: generating a REAL dependency lockfile from npm.
  echo Keep package-lock.json with your project for repeatable builds.
  call npm.cmd install --package-lock-only --ignore-scripts --no-audit --no-fund
  if errorlevel 1 goto fail
)
call npm.cmd run verify:dependencies
if errorlevel 1 goto fail
call npm.cmd ci --no-audit --no-fund
if errorlevel 1 goto fail

echo.
echo [3/7] Running original Tubeium tests
call npm.cmd run verify:release
if errorlevel 1 goto fail
if /i "%TUBEIUM_REQUIRE_CLEAN_AUDIT%"=="1" (
  echo Auditing all dependencies, including build tools...
  call npm.cmd run audit:dependencies
  if errorlevel 1 goto fail
)

echo.
echo [4/7] Packaging Windows runtime (no installer yet)
if exist "dist\win-unpacked" rmdir /s /q "dist\win-unpacked"
if exist "_tubeium_build_staging" rmdir /s /q "_tubeium_build_staging"
set "CSC_IDENTITY_AUTO_DISCOVERY=false"
call "node_modules\.bin\electron-builder.cmd" --win --x64 --dir --publish never
if errorlevel 1 goto fail
if not exist "dist\win-unpacked\Tubeium.exe" goto missingruntime

rem Check the three files which disappeared during the previous NSIS archive build.
for %%F in (chrome_100_percent.pak chrome_200_percent.pak LICENSE.electron.txt) do (
  if not exist "dist\win-unpacked\%%F" (
    if exist "node_modules\electron\dist\%%F" (
      echo Restoring Electron runtime file: %%F
      copy /Y "node_modules\electron\dist\%%F" "dist\win-unpacked\%%F" >nul
    )
  )
  if not exist "dist\win-unpacked\%%F" goto missingruntime
)

echo.
echo [5/7] Making a separate, stable packaging snapshot
rem 0-7 are success/warning codes for robocopy; 8+ means real failure.
robocopy "dist\win-unpacked" "_tubeium_build_staging" /E /COPY:DAT /R:2 /W:1 /NFL /NDL /NJH /NJS
if errorlevel 8 goto fail
if not exist "_tubeium_build_staging\Tubeium.exe" goto missingruntime
for %%F in (chrome_100_percent.pak chrome_200_percent.pak LICENSE.electron.txt) do (
  if not exist "_tubeium_build_staging\%%F" goto missingruntime
)

echo.
echo [6/7] Building the installer separately (avoids parallel target conflicts)
call "node_modules\.bin\electron-builder.cmd" --prepackaged "%CD%\_tubeium_build_staging" --win nsis --x64 --publish never --config.nsis.differentialPackage=false
if errorlevel 1 goto installerretry
if not exist "%TUBEIUM_SETUP%" goto installerretry
goto installerok

:installerretry
echo.
echo Installer exit/status check failed for %TUBEIUM_SETUP%.
echo Retrying with ZIP payload...
call "node_modules\.bin\electron-builder.cmd" --prepackaged "%CD%\_tubeium_build_staging" --win nsis --x64 --publish never --config.nsis.useZip=true --config.nsis.differentialPackage=false
if errorlevel 1 goto fail
if not exist "%TUBEIUM_SETUP%" goto fail

:installerok
echo.
echo [7/7] Building portable EXE separately
call "node_modules\.bin\electron-builder.cmd" --prepackaged "%CD%\_tubeium_build_staging" --win portable --x64 --publish never
if errorlevel 1 goto portablefail
if not exist "%TUBEIUM_PORTABLE%" goto portablefail

echo.
echo ==============================================================
echo SUCCESS: installer and portable EXE built in dist\
echo     Tubeium-%TUBEIUM_VERSION%-Setup-x64.exe
echo     Tubeium-%TUBEIUM_VERSION%-Portable-x64.exe
echo ==============================================================
explorer.exe "%CD%\dist"
pause
exit /b 0

:portablefail
echo.
echo The installer succeeded but the portable EXE did not.
echo You can still install from %TUBEIUM_SETUP%
explorer.exe "%CD%\dist"
pause
exit /b 0

:missingruntime
echo.
echo ERROR: Electron runtime files are missing from dist\win-unpacked.
echo Check Windows Security - Protection history for blocked or removed files.
echo Do not disable security protections to force the build.
echo The prepackaged app may be incomplete. Do not distribute it.
pause
exit /b 1

:nonode
echo ERROR: Node.js/npm could not be found in PATH.
echo Install the current Node.js LTS from https://nodejs.org/
pause
exit /b 1

:fail
echo.
echo BUILD FAILED. No user data was changed during packaging.
echo See the preceding error. If runtime files disappeared, check Windows Security - Protection history.
echo If packaging created a setup file, verify it with scripts\VERIFY_WINDOWS_BUILD.cmd.
echo The original unpacked app, if complete, can be tested at dist\win-unpacked\Tubeium.exe
pause
exit /b 1
