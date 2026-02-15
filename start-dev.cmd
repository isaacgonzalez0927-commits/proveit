@echo off
cd /d "%~dp0"
echo Starting ProveIt dev server...
echo Open http://localhost:3000 in your browser when ready.
call npm run dev
pause
