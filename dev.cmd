@echo off
setlocal
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0tools\launcher\dev.ps1" %*
exit /b %ERRORLEVEL%
