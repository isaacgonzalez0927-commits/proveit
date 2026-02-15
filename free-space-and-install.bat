@echo off
echo Freeing space by removing rebuildable folders...
if exist "node_modules" rd /s /q "node_modules"
if exist ".next" rd /s /q ".next"
if exist "%LOCALAPPDATA%\npm-cache" rd /s /q "%LOCALAPPDATA%\npm-cache"
echo Done. Running npm.cmd install...
call npm.cmd install
echo.
echo If install worked, run: npm.cmd run dev
pause
