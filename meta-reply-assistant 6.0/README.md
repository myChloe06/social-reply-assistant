# Reply Assistant - AI 评论回复助手

一款 Chrome 浏览器插件，帮助你快速生成 AI 评论回复，支持多平台、多语言。

> ⚠️ **注意**：目前仅支持 OpenAI 兼容格式的 API，其他格式暂不支持。

## ✨ 功能特点

- 🤖 **AI 智能回复** - 选中评论文字，一键生成专业回复
- 🌍 **多语言支持** - 自动检测语言，非中英文评论会显示翻译
- 📍 **多平台配置** - 不同网站可设置不同的提示词和知识库
- 🔄 **多 API 支持** - 可配置多个 AI API，故障自动切换
- ✏️ **修改优化** - 对生成的回复提出修改意见，AI 会调整
- 📋 **一键复制** - 快速复制回复内容

## 📦 安装方法

1. 下载插件压缩包并解压到本地文件夹
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 打开右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择解压后的文件夹
6. 安装完成！工具栏会出现插件图标

## 🚀 快速上手

### 第一步：添加网站

1. 访问你要使用插件的网站（如 Instagram、Meta Business Suite 等）
2. 点击浏览器工具栏的插件图标
3. 点击「+ Add This Site」添加当前网站
4. 页面会自动刷新，右侧出现回复面板

### 第二步：配置 API

1. 点击回复面板的 ⚙️ 设置按钮
2. 在「API Configuration」部分点击「+ Add API」
3. 填写：
   - **API Name**：给 API 起个名字（如：GLM-4、DeepSeek）
   - **API URL**：API 地址（如：`https://api.xxx.com/v1/chat/completions`）
   - **API Key**：你的 API 密钥
   - **Model Name**：模型名称（如：`glm-4`、`deepseek-chat`）
4. 点击「Save」保存

### 第三步：配置平台提示词（可选）

1. 在设置中选择平台
2. 填写「System Prompt」- 设置 AI 的角色和回复风格
3. 填写「Knowledge Base」- 添加产品信息、FAQ 等知识
4. 点击「Save」保存

### 第四步：开始使用

1. 在网页上用鼠标选中评论文字
2. 点击「Generate Reply」生成回复
3. 如需调整，在「Revision Notes」输入修改意见，点击「Revise」
4. 满意后点击「Copy Reply」复制

## ⚙️ 设置说明

### 平台配置

预设平台：
- Meta Business Suite
- Instagram
- YouTube Studio
- TikTok Business
- Twitter/X
- Amazon Seller
- Shopify Admin

你也可以添加自定义平台，只需输入网站域名（如 `ebay.com`）。

### API 配置

支持 OpenAI 兼容格式的 API，包括：
- 智谱 GLM
- DeepSeek
- Kimi
- 通义千问
- 其他兼容接口

可以配置多个 API，当一个失败时会自动切换到下一个。

### 提示词示例

**System Prompt（角色提示词）示例：**
```
You are a professional customer service representative for [Brand Name].

Tone: Friendly, helpful, professional
Rules:
- Keep responses concise (1-2 sentences)
- Never include links
- Use maximum 2 emojis
- For complaints, apologize first then offer solutions
```

**Knowledge Base（知识库）示例：**
```
Product: Smart Cube
Price: $29.99
Features: Bluetooth connection, app tracking, suitable for ages 6+
Shipping: Free shipping worldwide, 7-14 business days
Return Policy: 30-day money-back guarantee
```

## 🌐 多语言说明

- **英文/中文评论**：直接生成回复
- **其他语言评论**（如西班牙语、德语、法语等）：显示三部分
  - 📖 评论翻译（翻译成中文）
  - 💬 回复内容（用原评论语言回复）
  - 🔤 回复翻译（回复的中文翻译）

## ❓ 常见问题

**Q: 插件在某个网站不显示？**

A: 需要先添加该网站。点击工具栏插件图标 → 点击「+ Add This Site」。

**Q: 生成速度很慢？**

A: 这通常是 API 服务商的响应速度问题，可以尝试更换其他 API。

**Q: 回复质量不好？**

A: 检查以下几点：
1. 提示词是否清晰描述了角色和要求
2. 知识库是否包含足够的产品信息
3. 尝试更换更好的模型

**Q: 如何删除已添加的自定义平台？**

A: 设置 → 选择该平台 → 点击右侧「× Delete」按钮。

**Q: 数据保存在哪里？**

A: 所有数据保存在浏览器本地（chrome.storage），不会上传到任何服务器。清除浏览器数据或卸载插件会删除配置。

## 📝 版本记录

### v5.4.0
- 修复最小化图标显示问题
- 修复中文反馈意见导致回复语言错误
- 添加作者署名（点击 ℹ️ 查看详情）
- 添加使用手册

### v5.3.0
- 新增工具栏弹出面板
- 未配置网站不再显示面板
- 新图标设计（对话气泡+闪电）

### v5.2.0
- 支持多平台配置
- 每个平台独立的提示词和知识库
- 下拉选择平台

### v5.1.0
- 多语言支持优化
- AI 自动检测语言
- 修复插件内选择文字的问题

### v5.0.0
- 支持多 API 配置
- API 故障自动切换
- API 选择器

## 💌 联系作者

Made by Chloe ❤️

📧 moyong06@foxmail.com
