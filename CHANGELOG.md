# 更新日志

所有重要的项目变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [5.0.0] - 2025-12-10

### 初始版本发布
- AI驱动的评论回复生成
- 支持多API配置和自动故障切换
- 内置多语言翻译功能
- 完整的日志系统和进度管理
- 支持对话历史记录
- 知识库功能
- 为Meta Business Suite优化

### 技术特性
- Chrome扩展 Manifest V3
- 本地存储用户配置
- 实时UI更新
- 错误处理和恢复机制

### 文件结构
```
meta-reply-assistant/
├── content.js          # 主功能脚本
├── styles.css          # 样式文件
├── manifest.json       # 扩展配置
└── icons/              # 图标资源
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 版本管理说明

### 版本命名规则
- 主版本号：重大功能更新或不兼容更改
- 次版本号：新功能添加（保持兼容）
- 修订号：错误修复和小改进

### 版本管理流程
1. 每次Claude生成新版本时，创建新分支
2. 更新版本号（manifest.json 和 content.js）
3. 测试新功能
4. 合并到主分支并创建标签
5. 更新此CHANGELOG.md文件

### 如何使用版本历史
- 查看所有版本标签：`git tag -l`
- 比较版本差异：`git diff v5.0.0 v5.1.0`
- 切换到特定版本：`git checkout v5.0.0`