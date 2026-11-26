@echo off
cd /d "%~dp0"
echo.
echo ====================================================
echo   GAU SAMVARDHAN - SHARED EXHIBITION SERVER + NGROK
echo ====================================================
echo.
echo Starting local SQLite server on http://127.0.0.1:3000 ...
start "Gau Samvardhan Server" cmd /k "node server/index.mjs"

timeout /t 2 /nobreak >nul

echo Opening Desktop Admin Dashboard...
start "" "http://localhost:3000/#/admin"

echo Starting ngrok tunnel on 127.0.0.1:3000 ...
echo Share the HTTPS ngrok URL shown below with visitors!
echo.
ngrok http 127.0.0.1:3000
