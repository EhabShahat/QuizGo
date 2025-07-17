@echo off
echo 🚀 Auto-deploying QuizGo to GitHub and Railway...
echo.

echo 📦 Adding all changes...
git add .

echo 💬 Committing changes...
git commit -m "Deploy QuizGo with Railway configuration and health checks"

echo 🔄 Pushing to GitHub...
git push origin main

echo.
echo ✅ Code pushed to GitHub successfully!
echo 🚀 Railway will automatically deploy your changes.
echo.
echo 📋 Next steps:
echo 1. Check Railway dashboard for deployment status
echo 2. Add Redis database if not done yet
echo 3. Configure environment variables
echo 4. Test your health endpoint
echo.
pause