@echo off
rem FolderCraft を Windows でダブルクリック起動するためのバッチ。
rem Python がインストールされている必要があります。
cd /d "%~dp0"
python -m foldercraft %*
if errorlevel 1 pause
