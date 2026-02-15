@echo off
cd /d "%~dp0"
echo Using npm.cmd to install...
call npm.cmd install
if errorlevel 1 (
  echo Install failed.
  pause
  exit /b 1
)
echo Done. Run "npm.cmd run dev" or run.bat to start.
pause
