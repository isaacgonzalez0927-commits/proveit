@echo off
cd /d "%~dp0"
echo Clearing .next cache...
if exist .next rmdir /s /q .next
echo Running npm install...
call npm install
echo Done. Run start-dev.cmd to start the app.
pause
