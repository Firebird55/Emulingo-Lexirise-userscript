@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is optional for manual installation. Opening the browser installation guide.
  start "" "%~dp0INSTALL.html"
  exit /b 0
)
node scripts\install.mjs %*
if errorlevel 1 pause
