@echo off
echo ========================================
echo   SEEDING FLY.IO DATABASE
echo ========================================
echo.
echo [STEP 1] Checking proxy connection...
echo Please ensure proxy is running in another terminal:
echo   fly proxy 5433:5432 -a laybo-store-db
echo.
pause
echo.
echo [STEP 2] Starting seed process...
echo.
set DATABASE_URL=postgres://laybo_store_bot:N16PZBBxa0XHW4q@localhost:5433/laybo_store_bot?sslmode=disable
npm run db:seed
echo.
echo ========================================
if %errorlevel% equ 0 (
    echo   SEED COMPLETED SUCCESSFULLY!
) else (
    echo   SEED FAILED - Check errors above
)
echo ========================================
echo.
pause
