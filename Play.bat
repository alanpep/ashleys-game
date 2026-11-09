@echo off
rem Double-click this file to start the game. It opens in your web browser.
cd /d "%~dp0"
if not exist node_modules (
  echo First time setup, installing... this takes a minute.
  call npm install
)
call npm run dev -- --open
