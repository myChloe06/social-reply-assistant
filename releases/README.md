# Reply Assistant v5.2.1

一个AI驱动的Chrome扩展，帮助你快速生成专业的社交媒体评论回复。

## 📦 安装方法

### 方式1：直接下载安装（推荐）

1. 下载 [reply-assistant-v5.2.1.zip](./reply-assistant-v5.2.1.zip)
2. 解压zip文件到任意文件夹
3. 打开Chrome浏览器，访问 `chrome://extensions/`
4. 开启右上角的「开发者模式」
5. 点击「加载已解压的扩展程序」
6. 选择刚才解压的文件夹
7. 完成！扩展已安装

### 方式2：从源码安装

```bash
# 克隆仓库
git clone https://github.com/myChloe06/social-reply-assistant.git
cd social-reply-assistant

# 查看可用版本
git tag -l

# 切换到想要的版本（例如 v5.2.1）
git checkout v5.2.1
```

然后按照方式1的步骤3-7操作。

## ✨ 功能特性

- 🤖 **AI智能回复**：基于评论内容自动生成合适的回复
- 🌐 **多语言翻译**：支持多语言评论自动翻译
- 🔄 **多API配置**：支持配置多个API并自动故障切换
- 📝 **知识库**：自定义知识库内容，让AI更了解你的业务
- 📊 **对话历史**：保存对话历史，支持修改回复
- 📋 **日志系统**：完整的操作日志记录

## 🎯 使用说明

### 首次配置

1. 安装扩展后，访问支持的网站（默认支持所有https和http网站）
2. 点击页面上的「AI助手配置」按钮
3. 配置你的API信息：
   - API地址
   - API密钥
   - 模型名称
4. （可选）设置系统提示词和知识库内容

### 生成回复

1. 在评论列表中找到需要回复的评论
2. 点击评论旁边的「生成回复」按钮
3. 等待AI生成回复（会显示进度和耗时）
4. 可以使用「修改回复」功能调整生成的内容
5. 满意后点击「使用此回复」

## 📝 更新日志

查看完整的版本历史和变更：[CHANGELOG.md](../CHANGELOG.md)

## ⚠️ 注意事项

- 需要配置有效的OpenAI兼容API
- 建议在Meta Business Suite等社交媒体管理平台使用
- 首次使用请先配置系统提示词以获得更好的回复质量

## 🔗 相关链接

- GitHub仓库：https://github.com/myChloe06/social-reply-assistant
- 问题反馈：https://github.com/myChloe06/social-reply-assistant/issues

## 📄 许可证

MIT License
