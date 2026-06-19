@echo off
echo =======================================================
echo    Aetherix Local OpenCode Proxy Setup (Windows)
echo =======================================================
echo.

:: Step 1: Install Node.js Dependencies
echo [1/3] Installing NPM dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm install failed. Please ensure Node.js is installed.
    exit /b %ERRORLEVEL%
)
echo Dependencies installed successfully.
echo.

:: Step 2: Check for OpenCode CLI
echo [2/3] Checking for OpenCode CLI...
where opencode >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo WARNING: 'opencode' command was not found in your PATH.
    echo.
    echo To use this proxy, please download and install OpenCode CLI:
    echo --^> https://opencode.ai
    echo.
    echo After installing, log in with:
    echo --^> opencode login
    echo.
) else (
    echo OpenCode CLI found!
    echo.
    echo [Important] Please make sure you have logged in:
    echo --^> opencode login
    echo.
)

:: Step 3: Instructions to run
echo [3/3] Setup complete!
echo =======================================================
echo To start the server and playground, run:
echo --^> npm start
echo.
echo Open http://localhost:4000 in your browser to test.
echo =======================================================
pause
