---
description: 发布新版本到GitHub，包括Git提交、打标签、创建Release包和上传
---

# 发布新版本

请帮我发布一个新版本到GitHub。

## 需要你做的事情：

1. **检查是否有新版本文件夹**
   - 查看当前目录下是否有新的 `meta-reply-assistant X.X.X` 文件夹
   - 如果没有，询问用户新版本号是多少

2. **读取新版本号**
   - 从新版本文件夹的 manifest.json 中读取版本号
   - 例如：如果是 `meta-reply-assistant 5.3`，读取其中的 manifest.json 获取准确版本号（如 5.3.0）

3. **复制文件到根目录**
   ```bash
   cp "meta-reply-assistant X.X.X/"*.{js,css,json} .
   ```

4. **提交到Git并打标签**
   ```bash
   git add content.js styles.css manifest.json
   git commit -m "Release vX.X.X - 版本更新"
   git tag vX.X.X
   ```

5. **创建Release包**
   ```bash
   # 创建发布目录
   mkdir -p releases/reply-assistant-vX.X.X

   # 复制必要文件
   cp content.js styles.css manifest.json releases/reply-assistant-vX.X.X/
   cp -r icons releases/reply-assistant-vX.X.X/

   # 打包成zip
   cd releases
   powershell Compress-Archive -Path reply-assistant-vX.X.X -DestinationPath reply-assistant-vX.X.X.zip -Force
   cd ..
   ```

6. **提交Release包**
   ```bash
   git add releases/
   git commit -m "release: 添加vX.X.X发布包"
   ```

7. **推送到GitHub**
   ```bash
   git push origin master --tags
   ```

8. **创建GitHub Release**
   ```bash
   'C:\Program Files\GitHub CLI\gh.exe' release create vX.X.X releases/reply-assistant-vX.X.X.zip \
     --title "Reply Assistant vX.X.X" \
     --notes "## ✨ 功能特性

- 🤖 **AI智能回复**：基于评论内容自动生成合适的回复
- 🌐 **多语言翻译**：支持多语言评论自动翻译
- 🔄 **多API配置**：支持配置多个API并自动故障切换
- 📝 **知识库**：自定义知识库内容，让AI更了解你的业务
- 📊 **对话历史**：保存对话历史，支持修改回复
- 📋 **日志系统**：完整的操作日志记录

## 📦 安装方法

1. 下载下方的 **reply-assistant-vX.X.X.zip** 文件
2. 解压到任意文件夹
3. 打开Chrome浏览器，访问 \`chrome://extensions/\`
4. 开启右上角的「开发者模式」
5. 点击「加载已解压的扩展程序」
6. 选择解压的文件夹
7. 完成安装！

## 📝 更新内容

[根据实际情况填写更新内容]

---

💡 **首次使用**：安装后需要配置API信息才能使用"
   ```

9. **最后报告**
   - 显示GitHub Release链接
   - 显示下载链接
   - 告诉用户发布成功

## 重要提示：
- 确保所有步骤都成功执行
- 如果某个步骤失败，停止并报告错误
- 版本号要与manifest.json中的版本号完全一致
- 使用TodoWrite工具追踪每个步骤的进度
