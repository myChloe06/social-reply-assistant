# Reply Assistant - AI评论回复助手

一个AI驱动的Chrome扩展，帮助你快速生成专业的社交媒体评论回复。

[![GitHub release](https://img.shields.io/github/v/release/myChloe06/social-reply-assistant)](https://github.com/myChloe06/social-reply-assistant/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 功能特性

- 🤖 **AI智能回复**：基于评论内容自动生成合适的回复
- 🌐 **多语言翻译**：支持多语言评论自动翻译
- 🔄 **多API配置**：支持配置多个API并自动故障切换
- 📝 **知识库**：自定义知识库内容，让AI更了解你的业务
- 📊 **对话历史**：保存对话历史，支持修改回复
- 📋 **日志系统**：完整的操作日志记录

## 📥 安装方法

### 方式1：从Release下载（推荐）

1. 访问 [Releases页面](https://github.com/myChloe06/social-reply-assistant/releases/latest)
2. 下载最新版本的 `reply-assistant-vX.X.X.zip` 文件
3. 解压到任意文件夹
4. 打开Chrome浏览器，访问 `chrome://extensions/`
5. 开启右上角的「开发者模式」
6. 点击「加载已解压的扩展程序」
7. 选择解压的文件夹

### 方式2：克隆仓库

```bash
git clone https://github.com/myChloe06/social-reply-assistant.git
cd social-reply-assistant
```

然后按照方式1的步骤4-7操作

## 🚀 使用说明

### 首次配置

1. 安装扩展后，点击浏览器工具栏的扩展图标
2. 或者访问支持的网站，点击页面上的「AI助手配置」按钮
3. 配置你的API信息：
   - **API地址**：OpenAI兼容的API端点
   - **API密钥**：你的API密钥
   - **模型名称**：使用的模型（如gpt-3.5-turbo）
4. （可选）设置系统提示词和知识库内容，让AI更懂你的业务

### 生成回复

1. 在评论列表中找到需要回复的评论
2. 点击评论旁边的「生成回复」按钮
3. 等待AI生成回复（会显示进度和耗时）
4. 可以使用「修改回复」功能调整生成的内容
5. 满意后点击「使用此回复」

### 多API配置

支持配置多个API端点，当一个API失败时自动切换到下一个：

1. 在配置面板中点击「添加API」
2. 填写新的API信息
3. 可以通过拖拽调整API优先级
4. 使用「切换API」功能手动选择使用的API

## 📋 更新日志

查看所有版本的详细更新内容：[CHANGELOG.md](CHANGELOG.md)

最新版本功能请访问 [Releases页面](https://github.com/myChloe06/social-reply-assistant/releases)

## 🛠️ 技术栈

- Chrome Extension Manifest V3
- Vanilla JavaScript
- Chrome Storage API
- OpenAI Compatible API

## ❓ 常见问题

### API连接失败怎么办？

- 检查API地址是否正确（需要完整的URL，包括https://）
- 确认API密钥有效且有足够额度
- 点击「查看日志」按钮查看详细错误信息

### 回复生成很慢？

- 这取决于你使用的AI模型和API响应速度
- 可以尝试切换到其他配置的API
- 或者选择响应更快的模型

### 支持哪些网站？

目前支持所有https和http网站，特别针对Meta Business Suite等社交媒体管理平台优化。

## 🤝 贡献

欢迎提交Issue和Pull Request！如果你有好的想法或发现了bug，请不要犹豫。

## 📄 许可证

本项目采用 MIT License 开源协议。

## 👤 作者

**Chloe**

- 📧 邮箱：moyong06@foxmail.com
- 💻 GitHub：[@myChloe06](https://github.com/myChloe06)

---

⭐ 如果觉得这个项目有帮助，欢迎给个Star支持一下！
