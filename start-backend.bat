@echo off
echo Starting Whispr Backend Server...
echo.
echo Server will run on http://172.20.10.9:5000
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
npx tsx server/index.ts
