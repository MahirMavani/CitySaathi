@echo off
title CitySaathi - AI-Powered Civic Complaint & Resolution System
cls
echo ======================================================================
echo   CITYSAATHI — "Your City. Your Voice. Your Saathi."
echo   Full-Stack AI-Powered Civic Management & Resolution Verification
echo ======================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [NOTICE] Node.js is not found in PATH.
  echo Opening standalone interface in your default browser...
  start "" "%~dp0index.html"
  goto done
)

echo [1/2] Launching CitySaathi Full-Stack Node.js REST API Server...
echo [2/2] Opening http://localhost:5000 in your browser...
echo.

start "" "http://localhost:5000"
node src/server.js

:done
echo.
pause
