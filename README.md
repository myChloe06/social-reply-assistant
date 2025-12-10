# Meta Business Suite 评论回复助手

一个AI驱动的Chrome扩展，帮助你快速生成专业的社交媒体评论回复。

## 功能特性

- 🤖 **AI智能回复**：基于评论内容自动生成合适的回复
- 🌐 **多语言翻译**：支持多语言评论自动翻译
- 🔄 **多API配置**：支持配置多个API并自动故障切换
- 📝 **知识库**：自定义知识库内容，让AI更了解你的业务
- 📊 **对话历史**：保存对话历史，支持修改回复
- 📋 **日志系统**：完整的操作日志记录

## 安装方法

1. 下载本项目文件
2. 打开Chrome浏览器，进入 `chrome://extensions/`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择本项目文件夹

## 使用说明

### 首次配置

1. 安装扩展后，访问 [Meta Business Suite](https://business.facebook.com)
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

### 多API配置

支持配置多个API端点，当一个API失败时自动切换到下一个：

1. 在配置面板中点击「添加API」
2. 填写新的API信息
3. 可以通过拖拽调整API优先级
4. 使用「切换API」功能手动选择使用的API

## 版本管理

### 查看版本历史

```bash
# 查看所有版本标签
git tag -l

# 查看版本差异
git diff v5.0.0 v5.1.0

# 切换到特定版本
git checkout v5.1.0
```

### 更新到新版本

当Claude给你新版本文件夹时：

1. 将新版本文件复制到本仓库
2. 更新 `manifest.json` 和 `content.js` 中的版本号
3. 提交并打标签：
```bash
git add .
git commit -m "Release v5.x.x - 变更说明"
git tag v5.x.x
git push origin master --tags
```

详细的版本管理说明请查看 [VERSION-GUIDE.md](VERSION-GUIDE.md)

## 版本历史

### 当前版本（Master分支）
- **v5.1.1** (2025-12-10) - Bug修复版本
- **v5.1.0** (2025-12-10) - 功能增强版本
- **v5.0.0** (2025-12-10) - 初始发布版本
  - AI驱动的评论回复生成
  - 支持多API配置和自动故障切换
  - 内置多语言翻译功能
  - 完整的日志系统和进度管理

### 历史版本（Archive分支）
所有历史版本都已存档，可以通过分支和标签访问：

- **v4.0.0** - 分支：`archive/v4.0` | 标签：`v4.0.0`
- **v3.0.0** - 分支：`archive/v3.0` | 标签：`v3.0.0`
- **v2.0.0** - 分支：`archive/v2.0` | 标签：`v2.0.0`
- **v1.0.0** - 分支：`archive/v1.0` | 标签：`v1.0.0`

#### 如何查看历史版本
```bash
# 查看所有版本
git tag -l

# 切换到特定版本
git checkout archive/v1.0  # 或使用标签 git checkout v1.0.0

# 查看某个版本的代码
git show v2.0.0:content.js

# 比较两个版本的差异
git diff v1.0.0 v2.0.0
```

查看完整变更日志：[CHANGELOG.md](CHANGELOG.md)

## 技术栈

- Chrome Extension Manifest V3
- Vanilla JavaScript
- Chrome Storage API
- OpenAI Compatible API

## 文件结构

```
meta-reply-assistant/
├── content.js          # 主功能脚本
├── styles.css          # 样式文件
├── manifest.json       # 扩展配置
├── icons/              # 图标资源
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md           # 使用说明（本文件）
├── CHANGELOG.md        # 变更日志
├── VERSION-GUIDE.md    # 版本管理指南
└── update-version.bat  # 版本更新脚本
```

## 常见问题

### API连接失败

- 检查API地址是否正确
- 确认API密钥有效
- 查看日志了解详细错误信息

### 回复生成很慢

- 这取决于你使用的AI模型和API响应速度
- 可以尝试切换到其他配置的API

### 如何查看日志

点击「查看日志」按钮，可以看到所有操作记录和错误信息。

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License

## 联系方式

GitHub: [https://github.com/myChloe06/social-reply-assistant](https://github.com/myChloe06/social-reply-assistant)
