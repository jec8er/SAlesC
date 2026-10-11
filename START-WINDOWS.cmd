@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto :missingnode
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 goto :missingnode
if not exist node_modules (
  call npm ci --ignore-scripts --no-audit --no-fund
  if errorlevel 1 goto :failed
)
if not exist .env (
  call npm run setup
  if errorlevel 1 goto :failed
)
if not exist dist\index.html (
  call npm run build
  if errorlevel 1 goto :failed
)
echo.
echo Open http://127.0.0.1:3001 in your browser after the server starts.
echo Keep this window open while using the application. Ctrl+C stops it.
echo.
call npm start
if errorlevel 1 goto :failed
exit /b 0
:missingnode
echo This application requires Node.js 24 or newer.
echo Install Node.js, then run this file again.
pause
exit /b 1
:failed
echo Startup failed. Review the error above; your saved data has not been deleted.
pause
exit /b 1
