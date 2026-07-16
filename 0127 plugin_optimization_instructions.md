# 社媒助手插件优化任务

> 请按顺序执行以下修改，每个修改完成后进行测试验证

---

## 修改1：翻译功能Prompt重写（紧急）

**文件**：`content.js`  
**位置**：第54-66行  
**任务**：将 `DEFAULT_TRANSLATE_PROMPT` 的值替换为以下内容

```javascript
const DEFAULT_TRANSLATE_PROMPT = `You are a professional translator for social media customer service.

CRITICAL TASK: Translate the user's draft reply into the SAME LANGUAGE as the original comment.

Step-by-step workflow:
1. Detect the language of the original comment (English, Spanish, Japanese, etc.)
2. Translate the user's draft INTO that detected language
3. Polish the translation to sound natural and professional
4. Match the tone of the original comment

Output requirements:
- ONLY output the final translated reply in the target language
- NO explanations, NO original text, NO labels like "[Reply]"
- If original comment is English → output English reply
- If original comment is Spanish → output Spanish reply
- If original comment is Chinese → output Chinese reply

Example:
Original comment: "¿Cuánto cuesta?" (Spanish)
User's draft: "价格是99元"
Your output: "El precio es 99 yuanes."

DO NOT output: "价格是99元" ← This is WRONG
DO output: "El precio es 99 yuanes." ← This is CORRECT`;
```

**修改原因**：明确"翻译成原评论语言"是主任务，避免AI理解错误导致只润色中文。

---

## 修改2：强化知识库使用指令（紧急）

**文件**：`content.js`  
**位置**：第866行之后（在知识库注入代码之后）  
**任务**：将原来的知识库注入代码：

```javascript
if (platformConfig.knowledge && platformConfig.knowledge.trim()) {
  fullSystemPrompt += `\n\n---\n[Knowledge Base]\n${platformConfig.knowledge}`;
}
```

**替换为**：

```javascript
if (platformConfig.knowledge && platformConfig.knowledge.trim()) {
  fullSystemPrompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 KNOWLEDGE BASE (USE THIS FIRST!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${platformConfig.knowledge}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ CRITICAL INSTRUCTION:
1. ALWAYS check Knowledge Base FIRST before answering
2. If KB has the answer → Use it (paraphrase naturally, don't copy-paste)
3. If KB doesn't cover the question → Say "Great question! Email shop@giiker.com 💛"
4. NEVER make up product info not in the KB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}
```

**修改原因**：用视觉分隔符和明确指令强调知识库优先级，避免AI忽略知识库自由发挥。

---

## 修改3：小语种输出格式优化（紧急）

### 3.1 修改User Prompt构建逻辑

**文件**：`content.js`  
**位置**：第871-883行  
**任务**：将原来的User Prompt构建代码替换为以下代码

```javascript
let userPrompt;
const isEng = isEnglish(comment);
const isCh = isChinese(comment);

if (isEng || isCh) {
  // 英文/中文：直接输出回复
  userPrompt = `Reply to this comment:\n\n${comment}\n\nOutput ONLY your reply.`;
} else {
  // 小语种：JSON格式输出（更紧凑，节省20-25% token）
  userPrompt = `Reply to this comment:\n\n${comment}\n\nOutput as JSON (no markdown, no code block):
{
  "commentTranslation": "评论的中文翻译",
  "reply": "用原评论语言的回复",
  "replyTranslation": "回复的中文翻译"
}

Keep all fields concise.`;
}
```

### 3.2 修改响应解析函数

**文件**：`content.js`  
**位置**：第968-1033行（`parseMultilingualResponse` 函数）  
**任务**：将整个函数替换为以下代码

```javascript
function parseMultilingualResponse(content) {
  // 尝试解析JSON格式（新格式）
  try {
    const cleaned = content.replace(/```json|```/g, '').trim();
    const json = JSON.parse(cleaned);
    return {
      commentTranslation: json.commentTranslation || '',
      reply: json.reply || '',
      replyTranslation: json.replyTranslation || ''
    };
  } catch (e) {
    // 如果JSON解析失败，回退到旧的三段式文本解析（向后兼容）
    const result = { commentTranslation: '', reply: '', replyTranslation: '' };
    
    // 支持中英文标签
    const commentMatch = content.match(/\[Comment Translation\](.+?)(?=\[|$)/s) || 
                        content.match(/\[评论翻译\](.+?)(?=\[|$)/s);
    const replyMatch = content.match(/\[Reply\](.+?)(?=\[|$)/s) || 
                      content.match(/\[回复\](.+?)(?=\[|$)/s);
    const replyTransMatch = content.match(/\[Reply Translation\](.+?)(?=\[|$)/s) || 
                           content.match(/\[回复翻译\](.+?)(?=\[|$)/s);
    
    if (commentMatch) result.commentTranslation = commentMatch[1].trim();
    if (replyMatch) result.reply = replyMatch[1].trim();
    if (replyTransMatch) result.replyTranslation = replyTransMatch[1].trim();
    
    return result;
  }
}
```

**修改原因**：JSON格式比三段式文本更紧凑，减少20-25% token消耗，提升响应速度。同时保持向后兼容。

---

## 修改4：配置导出/导入功能（中期优化）

### 4.1 修改popup.html

**文件**：`popup.html`  
**位置**：在设置页面的合适位置（建议在API配置区域下方）  
**任务**：添加以下HTML代码

```html
<div class="config-backup-section">
  <h3>配置备份</h3>
  <div class="button-group">
    <button id="exportConfig" class="secondary-button">📥 导出配置</button>
    <button id="importConfig" class="secondary-button">📤 导入配置</button>
  </div>
  <input type="file" id="configFile" style="display:none" accept=".json">
  <p class="hint">更新插件前建议导出配置，避免数据丢失</p>
</div>
```

### 4.2 修改popup.js

**文件**：`popup.js`  
**位置**：在文件末尾添加以下代码  
**任务**：添加配置导出/导入逻辑

```javascript
// ============================================
// 配置导出/导入功能
// ============================================

// 导出配置
document.getElementById('exportConfig')?.addEventListener('click', async () => {
  try {
    const config = await chrome.storage.local.get(null);
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giiker-assistant-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ 配置导出成功');
  } catch (error) {
    console.error('❌ 配置导出失败:', error);
    alert('配置导出失败：' + error.message);
  }
});

// 导入配置
document.getElementById('importConfig')?.addEventListener('click', () => {
  document.getElementById('configFile').click();
});

document.getElementById('configFile')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const config = JSON.parse(text);
    
    // 验证配置格式
    if (!config || typeof config !== 'object') {
      throw new Error('配置文件格式无效');
    }
    
    await chrome.storage.local.set(config);
    alert('✅ 配置导入成功！页面将刷新以应用新配置。');
    location.reload();
  } catch (error) {
    console.error('❌ 配置导入失败:', error);
    alert('配置导入失败：' + error.message);
  } finally {
    // 清除文件选择，允许重复导入同一文件
    e.target.value = '';
  }
});
```

**修改原因**：解决每次更新插件需要重新配置API和知识库的痛点，一键备份恢复。

---

## 修改5：知识库智能检索（可选优化）

**适用场景**：如果完成修改1-4后，回复质量仍不满意，再执行此优化。

### 5.1 添加检索函数

**文件**：`content.js`  
**位置**：在文件顶部（建议在常量定义之后）  
**任务**：添加以下函数

```javascript
// ============================================
// 知识库智能检索功能
// ============================================

/**
 * 预处理知识库：按section分段并提取关键词
 * @param {string} knowledgeText - 原始知识库文本
 * @returns {Array} 索引后的知识库数组
 */
function indexKnowledge(knowledgeText) {
  // 按三级标题（###）分割section
  const sections = knowledgeText.split('###').filter(s => s.trim());
  
  return sections.map(section => {
    const keywords = extractKeywords(section);
    return { 
      text: section.trim(), 
      keywords: keywords.join(' ').toLowerCase() 
    };
  });
}

/**
 * 提取文本关键词
 * @param {string} text - 输入文本
 * @returns {Array} 关键词数组
 */
function extractKeywords(text) {
  // 提取2-15个字符的英文单词和中文词
  const words = text.match(/[\w\u4e00-\u9fff]{2,15}/g) || [];
  
  // 去重并限制数量
  return [...new Set(words)].slice(0, 30);
}

/**
 * 根据评论内容搜索相关知识库段落
 * @param {Array} indexedKB - 索引后的知识库
 * @param {string} comment - 用户评论
 * @returns {string} 相关知识库内容
 */
function searchKnowledge(indexedKB, comment) {
  const commentKeywords = extractKeywords(comment).join(' ').toLowerCase();
  
  // 计算每个section的相关度分数
  const scored = indexedKB.map(section => {
    const matches = section.keywords.split(' ').filter(kw => 
      commentKeywords.includes(kw)
    ).length;
    return { text: section.text, score: matches };
  });
  
  // 返回最相关的2个section
  const relevant = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .filter(s => s.score > 0)
    .map(s => s.text)
    .join('\n\n');
  
  return relevant;
}

// 缓存索引后的知识库（避免重复处理）
let cachedKnowledgeIndex = null;
let cachedKnowledgeHash = null;

/**
 * 获取缓存的知识库索引（带缓存机制）
 */
function getCachedKnowledgeIndex(knowledge) {
  const hash = knowledge.substring(0, 100); // 简单hash
  
  if (cachedKnowledgeHash === hash && cachedKnowledgeIndex) {
    return cachedKnowledgeIndex;
  }
  
  cachedKnowledgeIndex = indexKnowledge(knowledge);
  cachedKnowledgeHash = hash;
  return cachedKnowledgeIndex;
}
```

### 5.2 修改知识库注入逻辑

**文件**：`content.js`  
**位置**：第864-866行（知识库注入部分）  
**任务**：将修改2中的知识库注入代码进一步优化为：

```javascript
if (platformConfig.knowledge && platformConfig.knowledge.trim()) {
  // 使用智能检索获取相关段落
  const indexed = getCachedKnowledgeIndex(platformConfig.knowledge);
  const relevantKB = searchKnowledge(indexed, comment);
  
  // 如果没有匹配到相关内容，使用完整知识库
  const kbContent = relevantKB || platformConfig.knowledge;
  
  fullSystemPrompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 KNOWLEDGE BASE (USE THIS FIRST!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${kbContent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ CRITICAL INSTRUCTION:
1. ALWAYS check Knowledge Base FIRST before answering
2. If KB has the answer → Use it (paraphrase naturally, don't copy-paste)
3. If KB doesn't cover the question → Say "Great question! Email shop@giiker.com 💛"
4. NEVER make up product info not in the KB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}
```

**修改原因**：只传递相关段落，Prompt缩短50-60%，响应速度提升30-40%，同时提高回复精准度。

---

## 测试清单

完成所有修改后，请测试以下场景：

### ✅ 测试1：翻译功能
**场景**：英文评论 + 中文草稿
- 评论：`"How much is it?"`
- 草稿：`"价格是99元"`
- **预期输出**：`"The price is 99 yuan."` （英文回复）
- **错误输出**：`"价格是99元"` （如果还输出中文说明修改失败）

### ✅ 测试2：小语种回复
**场景**：日语评论
- 评论：`"これはいくらですか？"`
- **预期输出**：JSON格式的三段式回复
```json
{
  "commentTranslation": "这个多少钱？",
  "reply": "99元です。",
  "replyTranslation": "是99元。"
}
```

### ✅ 测试3：知识库使用
**场景**：产品相关问题
- 评论：`"Is Super Decoder suitable for colorblind people?"`
- **预期输出**：回复应包含知识库中的信息 `"This one relies on color hints, so might be tricky for colorblind players 💡"`
- **错误输出**：编造的答案或"我不知道"

### ✅ 测试4：配置导出
**操作**：点击"导出配置"按钮
- **预期结果**：下载一个JSON文件，文件名类似 `giiker-assistant-config-2026-01-27.json`
- **验证**：打开JSON文件，应包含apis、platforms等配置

### ✅ 测试5：配置导入
**操作**：点击"导入配置"→ 选择刚才导出的JSON文件
- **预期结果**：弹出"配置导入成功"提示，页面刷新后配置恢复
- **验证**：检查API、知识库等配置是否正确恢复

### ✅ 测试6：知识库检索（如果执行了修改5）
**场景**：问到特定产品
- 评论：`"Tell me about Super Blocks"`
- **预期行为**：只传递Super Blocks相关的section给AI（可在console查看API请求内容验证）
- **回复质量**：应准确提及"1000+ levels, real-time sensing, age 3+"等关键信息

---

## 预期效果总结

| 问题 | 修改前 | 修改后 |
|-----|--------|--------|
| 翻译失败 | 中文草稿→输出中文 | 中文草稿→准确翻译成原评论语言 ✅ |
| 回复质量 | AI忽略知识库 | AI优先使用知识库，信息准确 ✅ |
| 小语种速度 | 约7-11秒 | 约5-8秒（提升20-25%）✅ |
| 配置丢失 | 每次更新需重新配置 | 一键导出/导入，10秒恢复 ✅ |
| 知识库效率 | 完整2500字传给AI | 只传相关段落（可选优化）✅ |

---

## 注意事项

1. **按顺序执行**：修改1-3是紧急修复，必须先完成
2. **测试后再继续**：每个修改完成后立即测试，确认无问题再进行下一个
3. **保留旧版本**：修改前备份一份旧代码，如果出问题可以回滚
4. **修改5可选**：如果修改1-4后效果已满意，可以跳过修改5

---

## 如果遇到问题

请报告以下信息：
1. 哪个修改出现问题
2. 具体错误信息（console报错）
3. 测试场景和实际输出
4. 是否有文件找不到或代码位置不匹配

祝修改顺利！🚀
