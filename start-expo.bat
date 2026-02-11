@echo off
echo Starting Whispr Expo Dev Server...
echo.
echo After the QR code appears:
echo   - iPhone: Open Camera app and scan QR code
echo   - Android: Open Expo Go app and scan QR code
echo.
echo Your local IP: 172.20.10.9
echo.

cd /d "%~dp0"
npx expo start
