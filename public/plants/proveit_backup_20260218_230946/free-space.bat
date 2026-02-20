@echo off
cd /d "%~dp0"
echo Freeing space: clearing npm cache and project cache...
call npm.cmd cache clean --force
if exist .next rmdir /s /q .next
if exist node_modules rmdir /s /q node_modules
echo Done. Run install.bat then run.bat to reinstall and start.
pause
