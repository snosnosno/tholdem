@echo off
echo Starting T-HOLDEM Development Environment...
echo.

echo 🔧 Starting Firebase Emulators...
start "Firebase Emulators" cmd /c "firebase emulators:start --only functions,auth,firestore"

echo ⏳ Waiting for emulators to start...
timeout /t 5 /nobreak >nul

echo 🚀 Starting React Development Server...
cd app2
npm start

pause