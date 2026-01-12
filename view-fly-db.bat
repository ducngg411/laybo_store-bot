@echo off
echo ========================================
echo   VIEWING FLY.IO DATABASE
echo ========================================
echo.
echo [1/2] Starting proxy on port 5433...
start "Fly Database Proxy - Keep This Window Open" cmd /k "echo Proxy is running on localhost:5433 && echo Keep this window open while viewing database && echo. && fly proxy 5433:5432 -a laybo-store-db"
echo Waiting for proxy to start...
timeout /t 5 /nobreak >nul
echo.
echo [2/2] Opening Prisma Studio...
echo Browser will open at: http://localhost:5555
echo.
set DATABASE_URL=postgres://laybo_store_bot:N16PZBBxa0XHW4q@localhost:5433/laybo_store_bot?sslmode=disable
npm run db:studio
echo.
echo ========================================
echo   Prisma Studio closed
echo   Close the Proxy window when done
echo ========================================
pause
