@echo off
setlocal
cd /d "%~dp0"
echo ================================================
echo Tubeium - GitHub source publisher
echo ================================================
where git >nul 2>nul || (echo Git is required: https://git-scm.com/download/win & pause & exit /b 1)
if not exist "package.json" (echo ERROR: package.json not found. & pause & exit /b 1)
if exist ".git" (echo ERROR: this folder is already a git repository. & pause & exit /b 1)
echo.
echo Preparing a fresh GitHub upload...
git init -b main || goto :error
git remote add origin https://github.com/Subaru771/Tubeium.git || goto :error
git fetch origin main || goto :error
git checkout -B main origin/main || goto :error
git add -A || goto :error
git diff --cached --quiet && (echo No new files to upload. & pause & exit /b 0)
git -c user.name=Subaru771 -c user.email=Subaru771@users.noreply.github.com commit -m "Publish cleaned Tubeium source" || goto :error
git push -u origin main || goto :error
echo.
echo SUCCESS: https://github.com/Subaru771/Tubeium
pause
exit /b 0
:error
echo.
echo Upload stopped. Read the error above. No force push was attempted.
pause
exit /b 1
