@echo off
cd /d "%~dp0"
py -3.11 -m venv .venv || exit /b 1
.venv\Scripts\python.exe -m pip install -r requirements.txt || exit /b 1
.venv\Scripts\python.exe -m scripts.download_models || exit /b 1
call START.bat
