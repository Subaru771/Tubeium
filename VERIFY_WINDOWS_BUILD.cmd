@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Tubeium - Verify Windows build
echo =======================================================
echo         Tubeium - Windows Release Check
echo =======================================================
echo.
where node.exe >nul 2>nul || goto nonode
for /f "delims=" %%V in ('node scripts\fast-build-cache.js version') do set "TUBEIUM_VERSION=%%V"
if not defined TUBEIUM_VERSION goto fail
echo Checking Tubeium %TUBEIUM_VERSION%
call npm.cmd run verify:release
if errorlevel 1 goto fail
if not exist "dist\Tubeium-%TUBEIUM_VERSION%-Setup-x64.exe" goto nobuild
if not exist "dist\Tubeium-%TUBEIUM_VERSION%-Portable-x64.exe" goto nobuild
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $files=@('dist\Tubeium-%TUBEIUM_VERSION%-Setup-x64.exe','dist\Tubeium-%TUBEIUM_VERSION%-Portable-x64.exe'); $output=@(); foreach($f in $files){$i=Get-Item -LiteralPath $f; if($i.Length -lt 10MB){throw 'Suspiciously small EXE: '+$f};$hash=Get-FileHash -LiteralPath $f -Algorithm SHA256;$output+=($hash.Hash.ToLower()+'  '+$i.Name)};$output | Set-Content -Encoding ascii -LiteralPath 'dist\SHA256SUMS.txt';Write-Host 'PASS: both Windows EXEs exist. SHA256SUMS.txt written.'"
if errorlevel 1 goto fail
echo.
echo Files verified. This does NOT prove Google login or runtime compatibility.
echo Run both executables on a clean Windows PC and complete RELEASE_CHECKLIST.md.
pause
exit /b 0
:nobuild
echo Installer or portable EXE is missing. Run BUILD_WINDOWS_EXE.cmd first.
pause
exit /b 1
:nonode
echo Node.js is needed for source tests; install Node.js LTS.
pause
exit /b 1
:fail
echo Verification failed. Do not publish this build until the error is resolved.
pause
exit /b 1
