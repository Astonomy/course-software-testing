@echo off
setlocal
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)" >nul 2>&1
if not errorlevel 1 (
    goto run_py
)
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)" >nul 2>&1
if not errorlevel 1 (
    goto run_python
)
python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)" >nul 2>&1
if not errorlevel 1 (
    goto run_python3
)
echo Error: Python 3.8+ was not found. Install Python yourself; this script does not download dependencies. 1>&2
echo After installing Python, run manually in Windows Command Prompt: 1>&2
echo   cd /d "%~dp0" 1>&2
echo   py -3 start.py --port auto 1>&2
exit /b 1

:run_py
py -3 "%~dp0start.py" %*
exit /b %errorlevel%

:run_python
python "%~dp0start.py" %*
exit /b %errorlevel%

:run_python3
python3 "%~dp0start.py" %*
exit /b %errorlevel%
