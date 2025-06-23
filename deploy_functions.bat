@echo off
echo "--- Changing directory to functions ---"
cd /d "C:\Users\user\Desktop\T-HOLDEM\functions"

echo "--- Building functions ---"
call npm run build

echo "--- Changing directory back to root ---"
cd /d "C:\Users\user\Desktop\T-HOLDEM"

echo "--- Deploying functions to Firebase ---"
call firebase deploy --only functions --project tholdem-ebc18

echo "--- Deployment script finished ---"
pause
