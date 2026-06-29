@echo off
echo ========================================
echo   SalmanSaaS Dev Server
echo ========================================

REM Add venv to PATH so prisma-client-py is found
set PATH=%~dp0venv\Scripts;%PATH%

REM Activate venv
call venv\Scripts\activate.bat

echo [1/2] Starting FastAPI backend...
start "FastAPI Backend" cmd /k "set PATH=%~dp0venv\Scripts;%PATH% && venv\Scripts\uvicorn.exe app.main:app --reload --port 8000"

echo [2/2] Starting React frontend...
start "React Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo Docs:     http://localhost:8000/docs
echo.
echo Press any key to stop...
pause >nul
