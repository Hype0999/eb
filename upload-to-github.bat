@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ====================================================
echo   GAU SAMVARDHAN - AUTO UPLOAD TO GITHUB PAGES
echo ====================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not installed or not in PATH.
  echo Install Git from https://git-scm.com/download/win and run this file again.
  pause
  exit /b 1
)

if not exist ".git" (
  echo [1/4] Initializing Git repository on branch main...
  git init -b main
  if errorlevel 1 (
    git init
    git branch -M main
  )
) else (
  git branch -M main >nul 2>nul
)

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo.
  set /p REPO_URL="Paste your GitHub repository URL (e.g. https://github.com/username/gau-samvardhan.git): "
  if "!REPO_URL!"=="" (
    echo [ERROR] Repository URL cannot be empty.
    pause
    exit /b 1
  )
  git remote add origin "!REPO_URL!"
)

echo [2/4] Staging all project files...
git add -A

git diff --cached --quiet
if errorlevel 1 (
  for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set TODAY=%%c-%%a-%%b
  echo [3/4] Committing changes...
  git commit -m "Deploy Gau Samvardhan feedback app (%date% %time%)"
) else (
  echo [3/4] No new file changes to commit.
)

echo [4/4] Pushing to GitHub (main)...
git push -u origin main
if errorlevel 1 (
  echo.
  echo [ERROR] Push failed. Make sure you are signed in to GitHub and the repo URL is correct.
  pause
  exit /b 1
)

echo.
echo ====================================================
echo   UPLOAD COMPLETE!
echo   First-time setup on GitHub (takes 10 seconds):
echo   1. Open your repo on GitHub.com
echo   2. Go to Settings ^> Pages
echo   3. Under "Build and deployment", set Source = "GitHub Actions"
echo   Your live site will be ready in ~1 minute!
echo ====================================================
echo.
pause
