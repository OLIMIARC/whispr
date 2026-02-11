@echo off
echo Attempting to open Port 5000 in Windows Firewall...
netsh advfirewall firewall delete rule name="Allow Expo Backend 5000" >nul
netsh advfirewall firewall add rule name="Allow Expo Backend 5000" dir=in action=allow protocol=TCP localport=5000
echo.
echo If you see "Ok." above, the rule was added successfully.
echo.
echo If you saw "The requested operation requires elevation", please:
echo 1. Close this window.
echo 2. Right-click this file.
echo 3. Select "Run as Administrator".
echo.
pause
