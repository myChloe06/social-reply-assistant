@echo off
:: Meta Reply Assistant 版本更新脚本
:: 使用方法: update-version.bat [版本号] [变更说明]
:: 示例: update-version.bat "5.1.0" "添加了新的回复模板功能"

set VERSION=%1
set DESCRIPTION=%2

if "%VERSION%"=="" (
    echo 错误：请提供版本号
    echo 使用方法: update-version.bat [版本号] [变更说明]
    echo 示例: update-version.bat "5.1.0" "添加了新的回复模板功能"
    exit /b 1
)

if "%DESCRIPTION%"=="" (
    set DESCRIPTION=版本更新
)

echo.
echo =================================
echo Meta Reply Assistant 版本更新
echo =================================
echo.
echo 新版本: %VERSION%
echo 变更说明: %DESCRIPTION%
echo.

:: 确认操作
set /p CONFIRM="确认更新版本? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo 操作已取消
    exit /b 0
)

:: 创建新分支
echo.
echo 1. 创建新分支 version/v%VERSION%...
git checkout -b version/v%VERSION%
if %errorlevel% neq 0 (
    echo 错误：创建分支失败
    exit /b 1
)

:: 备份当前版本（可选）
echo.
echo 2. 备份当前版本...
if not exist "backups" mkdir backups
set BACKUP_DIR=backups\%date:~0,10%
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
git archive HEAD -o "%BACKUP_DIR%\meta-reply-assistant-v%VERSION%-backup.zip"

:: 等待用户替换文件
echo.
echo 3. 文件准备...
echo    请将Claude生成的新文件复制到当前目录
echo    注意: 不要删除 .git 和 backups 文件夹
echo.
set /p READY="文件已替换完成? (y/n): "
if /i not "%READY%"=="y" (
    echo 操作已取消
    exit /b 0
)

:: 更新版本号
echo.
echo 4. 更新版本号...

:: 更新 manifest.json
powershell -Command "(Get-Content manifest.json) -replace '\"version\": \"[^\"]+\"', '\"version\": \"%VERSION%\"' | Set-Content manifest.json"

:: 更新 content.js 中的版本变量
powershell -Command "(Get-Content content.js) -replace \"const VERSION = '[^\"]+'\", \"const VERSION = '%VERSION%'\" | Set-Content content.js"

:: 提交更改
echo.
echo 5. 提交新版本...
git add -A
git commit -m "Release v%VERSION% - %DESCRIPTION%"

:: 合并到主分支
echo.
echo 6. 合并到主分支...
git checkout master
git merge version/v%VERSION%

:: 创建标签
echo.
echo 7. 创建版本标签...
git tag -a v%VERSION% -m "Version %VERSION% - %DESCRIPTION%"

echo.
echo =================================
echo 版本更新完成！
echo =================================
echo.
echo 下一步操作：
echo 1. 推送到GitHub: git push origin master --tags
echo 2. 删除分支: git branch -d version/v%VERSION%
echo 3. 更新CHANGELOG.md文件
echo.
echo 查看版本历史: git tag -l
echo 查看版本差异: git diff v5.0.0 v%VERSION%
echo.