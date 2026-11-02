@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
title Tubeium - Run Without Building
color 0B

echo.
echo Tubeium quick launch: no installer / portable EXE packaging.
call scripts\fast-build-deps.cmd
if errorlevel 1 goto fail
call npm.cmd start
if errorlevel 1 goto fail
exit /b 0
:fail
echo.
echo Could not start Tubeium. Check the message above.
pause
exit /b 1
