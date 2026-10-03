@echo off
echo ========================================================
echo    Starting WAT Analyzer (MERN + Python AI Architecture)
echo ========================================================

echo [1/3] Starting Python AI Microservice on port 8000...
start "Python AI Microservice" cmd /k "cd /d %~dp0api && venv\Scripts\python -m uvicorn main:app --port 8000"

echo [2/3] Starting Node.js / Express Backend on port 5000...
start "Express Backend Gateway" cmd /k "cd /d %~dp0server && npm start"

echo [3/3] Starting React Vite Frontend on port 3000...
start "React Frontend" cmd /k "cd /d %~dp0web && npm run dev"

echo ========================================================
echo All services launched!
echo Web App:    http://localhost:3000
echo Express API: http://localhost:5000/health
echo Python AI:  http://localhost:8000/docs
echo ========================================================
pause
