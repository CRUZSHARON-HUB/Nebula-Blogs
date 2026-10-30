@echo off
setlocal
cd /d "%~dp0backend"

if not exist "..\.venv\Scripts\python.exe" (
  echo Creating virtual environment...
  python -m venv ..\.venv || goto :error
  "..\.venv\Scripts\python.exe" -m pip install --upgrade pip
  "..\.venv\Scripts\python.exe" -m pip install -r requirements.txt || goto :error
)

"..\.venv\Scripts\python.exe" manage.py migrate
"..\.venv\Scripts\python.exe" manage.py runserver 8000
goto :eof

:error
echo.
echo Failed to start the backend. Install Python 3.12+ and make sure "python" is on PATH.
pause
