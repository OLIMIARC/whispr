@echo off
echo ============================================
echo Expo Firewall Configuration
echo ============================================
echo.
echo This script will add Windows Firewall rules to allow:
echo   - Expo Metro Bundler (port 8081)
echo   - Backend Server (port 5000)
echo.
echo NOTE: This requires Administrator privileges
echo.
pause

echo Adding firewall rule for Metro Bundler (port 8081)...
netsh advfirewall firewall add rule name="Expo Metro Bundler" dir=in action=allow protocol=TCP localport=8081

echo Adding firewall rule for Backend Server (port 5000)...
netsh advfirewall firewall add rule name="Expo Backend Server" dir=in action=allow protocol=TCP localport=5000

echo.
echo ============================================
echo Firewall rules added successfully!
echo ============================================
echo.
echo You can now connect your iPhone and Android devices!
echo.
pause
