@echo off
cd /d "%~dp0"
echo Using npm.cmd to install and start...
call npm.cmd install
if errorlevel 1 (
  echo Install failed. Check disk space and try again.
  pause
  exit /b 1
)
call npm.cmd run dev
pause
