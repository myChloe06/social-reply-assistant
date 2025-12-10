# 版本管理快速指南

## 当前版本：5.0.0

## 📋 快速开始（3种方式）

### 方式1：使用脚本（最简单）
```bash
# Windows用户
update-version.bat "5.1.0" "添加了新功能"

# 脚本会自动：
# - 创建新分支
# - 备份当前版本
# - 等待你替换文件
# - 更新版本号
# - 提交并合并
# - 创建版本标签
```

### 方式2：手动命令（推荐熟悉Git的用户）
```bash
# 1. 创建新分支
git checkout -b version/v5.1.0

# 2. 替换为新版本文件（从Claude）
# - 删除旧文件（保留.git）
# - 复制Claude生成的新文件

# 3. 更新版本号
# - 修改 manifest.json 中的 "version": "5.1.0"
# - 修改 content.js 中的 const VERSION = '5.1.0'

# 4. 提交新版本
git add .
git commit -m "Release v5.1.0 - 你的变更说明"

# 5. 合并到主分支
git checkout master
git merge version/v5.1.0

# 6. 创建标签并推送
git tag v5.1.0
git push origin master --tags
```

### 方式3：超级简单（适合新手）
```bash
# 1. 备份当前版本
git archive HEAD -o backup-v5.0.0.zip

# 2. 直接在主分支替换文件
# - 删除旧文件
# - 复制新文件
# - 更新版本号

# 3. 提交并推送
git add -A
git commit -m "$(date '+%Y-%m-%d %H:%M') 更新 - 变更说明"
git push origin master
```

## 📚 常用命令

```bash
# 查看所有版本
git tag -l

# 查看版本差异
git diff v5.0.0 v5.1.0

# 切换到某个版本（查看）
git checkout v5.1.0

# 查看提交历史
git log --oneline --graph --all

# 查看当前状态
git status

# 恢复到某个版本（谨慎使用）
git reset --hard v5.1.0
```

## 📝 版本号规则

- **主版本号**（如 6.0.0）：重大更新，可能不兼容
- **次版本号**（如 5.1.0）：新功能，保持兼容
- **修订号**（如 5.0.1）：错误修复

## ⚠️ 注意事项

1. **版本号要统一**：manifest.json 和 content.js 中的版本必须一致
2. **提交信息要清晰**：方便以后查找和回滚
3. **重要版本要备份**：使用脚本会自动备份
4. **推送前要测试**：确保新版本功能正常

## 🆘 遇到问题？

```bash
# 如果合并失败
git merge --abort

# 如果提交错了
git reset HEAD~1

# 如果需要查看某个文件的历史
git log --follow filename

# 如果需要恢复删除的文件
git checkout HEAD~1 -- filename
```

## 📊 版本历史

- v5.0.0 (2025-12-10) - 初始版本发布
- v5.1.0 (待发布) - ???

---

💡 提示：建议使用方式1（脚本）或方式2（手动命令），这样可以保留完整的版本历史。