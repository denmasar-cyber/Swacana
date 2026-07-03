@echo off
setlocal enabledelayedexpansion

set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

if not exist "node_modules" (
  echo node_modules not found. Running npm install...
  npm install
)

echo Starting dev server...
call npm run dev

