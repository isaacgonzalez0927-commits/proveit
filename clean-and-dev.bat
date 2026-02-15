@echo off
cd /d "%~dp0"
if exist .next rmdir /s /q .next
call npm.cmd run dev
