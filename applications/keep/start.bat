@echo off
setlocal
node -e "var v=process.versions.node.split('.').map(Number);process.exit(v[0]>18||(v[0]===18&&v[1]>=0)?0:1)" >nul 2>&1
if errorlevel 1 goto missing_node
node "%~dp0start.cjs" %*
exit /b %errorlevel%
:missing_node
echo Error: Node.js 18.0+ was not found. Install it yourself; no dependencies are downloaded. 1>&2
echo After installing Node.js, retry in Windows Command Prompt: 1>&2
echo   cd /d "%~dp0" 1>&2
echo   node start.cjs --port auto 1>&2
exit /b 1
