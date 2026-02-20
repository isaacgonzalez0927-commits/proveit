@echo off
cd /d "%~dp0"
echo [1/3] Clearing .next...
if exist .next rmdir /s /q .next
echo [2/3] npm install...
call npm install
if errorlevel 1 (
  echo npm install failed. Free some disk space and try again.
  pause
  exit /b 1
)
echo [3/3] Starting dev server...
echo Open http://localhost:3000 when you see "Ready".
call npm run dev
pause
