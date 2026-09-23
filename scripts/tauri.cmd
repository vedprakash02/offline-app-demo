@echo off
setlocal
if not defined CARGO_TARGET_DIR set "CARGO_TARGET_DIR=%LOCALAPPDATA%\Vidya Prabandh Demo\cargo-target"
if not defined TEMP set "TEMP=%LOCALAPPDATA%\Vidya Prabandh Demo\tmp"
if not defined TMP set "TMP=%LOCALAPPDATA%\Vidya Prabandh Demo\tmp"

if not exist "%CARGO_TARGET_DIR%" mkdir "%CARGO_TARGET_DIR%"
if not exist "%TEMP%" mkdir "%TEMP%"

call "%~dp0..\node_modules\.bin\tauri.cmd" %*
endlocal
