@echo off
setlocal
cd /d "%~dp0frontend"

if not exist node_modules (
  echo Installing frontend dependencies...
  call npm install || goto :error
)

call npm run dev
goto :eof

:error
echo.
echo Failed to start the frontend. Install Node.js 20+ and make sure "npm" is on PATH.
pause
