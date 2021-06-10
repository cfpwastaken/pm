@echo off
title PM Installation
echo Installing PM
echo.
echo Downloading Node Modules...
call npm i
echo.
echo Linking pm using node...
call npm link --force
echo.
echo Refreshing package list...
call pm refresh