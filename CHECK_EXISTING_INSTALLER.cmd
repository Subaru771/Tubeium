@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
title Tubeium - Check Existing Setup
color 0B
where node.exe >nul 2>nul || goto nonode
for /f "delims=" %%V in ('node scripts\fast-build-cache.js version') do set "TUBEIUM_VERSION=%%V"
if not defined TUBEIUM_VERSION goto fail
set "SETUP=dist\Tubeium-%TUBEIUM_VERSION%-Setup-x64.exe"
echo.
echo Checking for Tubeium %TUBEIUM_VERSION% setup...
if not exist "%SETUP%" goto notfound
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $f=Get-Item -LiteralPath $env:SETUP; if ($f.Length -lt 10MB){throw ('Installer is unexpectedly small: '+$f.Length+' bytes')}; $st=[IO.File]::OpenRead($f.FullName); try{if($st.ReadByte() -ne 77 -or $st.ReadByte() -ne 90){throw 'Installer is not an EXE (missing MZ header)'}} finally{$st.Close()}; Write-Host ('Found: '+$f.Name); Write-Host ('Size: '+[math]::Round($f.Length / 1MB, 1)+' MB'); Write-Host ('SHA256: '+(Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash); Write-Host 'Basic file checks passed. Installation must still be tested on Windows.'"
if errorlevel 1 goto fail
explorer.exe "%CD%\dist"
echo.
echo If this is the current version, you do NOT need to rebuild it.
pause
exit /b 0
:notfound
echo No matching %TUBEIUM_VERSION% setup was found at %SETUP%.
echo Try FAST_BUILD_WINDOWS_EXE.cmd to create it.
pause
exit /b 1
:nonode
echo Node.js is not in PATH.
pause
exit /b 1
:fail
echo Setup check failed. Do not distribute a damaged or incomplete EXE.
pause
exit /b 1
