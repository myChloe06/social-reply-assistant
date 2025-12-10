// Meta Business Suite 评论回复助手
(function() {
  'use strict';

  // 默认配置
  const DEFAULT_CONFIG = {
    apiUrl: '',
    apiKey: '',
    modelName: 'gpt-3.5-turbo',
    systemPrompt: `你是一个专业的社交媒体客服助手。请根据用户的评论生成友好、专业的回复。

回复要求：
- 语气友好、真诚
- 简洁明了，不要太长
- 如果是好评，表示感谢
- 如果是问题，提供帮助
- 如果是投诉，表示歉意并提供解决方案`
  };

  // 创建主面板
  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'meta-reply-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <span class="header-title">💬 评论回复助手</span>
        <div class="header-actions">
          <button class="header-btn settings-btn" title="设置">⚙️</button>
          <button class="collapse-btn" title="收起">−</button>
        </div>
      </div>
      <div class="panel-content">
        <div class="section">
          <div class="section-label">📝 选中的评论</div>
          <div class="section-box empty" id="selected-comment">请用鼠标选中页面上的评论文字</div>
        </div>
        <div class="section" id="result-section" style="display: none;">
          <div class="section-label">🤖 AI 回复</div>
          <div id="result-area"></div>
        </div>
        <div class="button-group">
          <button class="btn btn-primary" id="generate-btn">生成回复</button>
          <button class="btn btn-secondary" id="copy-btn" style="display: none;">复制回复</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    return panel;
  }

  // 创建设置面板
  function createSettingsPanel() {
    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.id = 'settings-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="settings-panel">
        <div class="settings-header">
          <span class="settings-title">⚙️ 设置</span>
          <button class="settings-close" id="settings-close">×</button>
        </div>
        <div class="settings-body">
          <div class="form-group">
            <label class="form-label">API 地址</label>
            <div class="form-hint">OpenAI 兼容格式，例如：https://api.openai.com/v1/chat/completions</div>
            <input type="text" class="form-input" id="setting-api-url" placeholder="输入 API 地址">
          </div>
          <div class="form-group">
            <label class="form-label">API Key</label>
            <input type="password" class="form-input" id="setting-api-key" placeholder="输入 API Key">
          </div>
          <div class="form-group">
            <label class="form-label">模型名称</label>
            <div class="form-hint">例如：gpt-3.5-turbo、qwen-turbo、deepseek-chat</div>
            <input type="text" class="form-input" id="setting-model" placeholder="输入模型名称">
          </div>
          <div class="form-group">
            <label class="form-label">角色提示词</label>
            <div class="form-hint">设置 AI 的回复风格、品牌信息、产品介绍等</div>
            <textarea class="form-textarea" id="setting-prompt" placeholder="输入角色提示词..."></textarea>
          </div>
        </div>
        <div class="settings-footer">
          <button class="btn btn-secondary" id="settings-cancel">取消</button>
          <button class="btn btn-primary" id="settings-save">保存设置</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  // 显示提示消息
  function showToast(message, duration = 2000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), duration);
  }

  // 加载配置
  async function loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiUrl', 'apiKey', 'modelName', 'systemPrompt'], (result) => {
        resolve({
          apiUrl: result.apiUrl || DEFAULT_CONFIG.apiUrl,
          apiKey: result.apiKey || DEFAULT_CONFIG.apiKey,
          modelName: result.modelName || DEFAULT_CONFIG.modelName,
          systemPrompt: result.systemPrompt || DEFAULT_CONFIG.systemPrompt
        });
      });
    });
  }

  // 保存配置
  async function saveConfig(config) {
    return new Promise((resolve) => {
      chrome.storage.local.set(config, resolve);
    });
  }

  // 检测语言是否为英语
  function isEnglish(text) {
    // 简单检测：如果大部分字符是英文字母则认为是英语
    const englishChars = text.match(/[a-zA-Z]/g) || [];
    const totalChars = text.replace(/\s/g, '').length;
    return totalChars > 0 && (englishChars.length / totalChars) > 0.7;
  }

  // 调用 AI API
  async function callAI(config, comment) {
    const isEng = isEnglish(comment);
    
    let userPrompt;
    if (isEng) {
      userPrompt = `请根据以下评论生成回复：

评论内容：${comment}

请直接输出回复内容，不需要任何解释。`;
    } else {
      userPrompt = `请根据以下评论生成回复。由于评论不是英语，请按以下格式输出：

评论内容：${comment}

请按以下格式输出（保持格式标签）：
【评论翻译】（将评论翻译成中文）
【回复内容】（用评论的原始语言回复）
【回复翻译】（将回复翻译成中文）`;
    }

    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      isEnglish: isEng
    };
  }

  // 解析多语言回复
  function parseMultilingualResponse(content) {
    const result = {
      commentTranslation: '',
      reply: '',
      replyTranslation: ''
    };

    const commentMatch = content.match(/【评论翻译】(.+?)(?=【|$)/s);
    const replyMatch = content.match(/【回复内容】(.+?)(?=【|$)/s);
    const replyTransMatch = content.match(/【回复翻译】(.+?)(?=【|$)/s);

    if (commentMatch) result.commentTranslation = commentMatch[1].trim();
    if (replyMatch) result.reply = replyMatch[1].trim();
    if (replyTransMatch) result.replyTranslation = replyTransMatch[1].trim();

    // 如果解析失败，整个内容作为回复
    if (!result.reply) {
      result.reply = content;
    }

    return result;
  }

  // 渲染结果
  function renderResult(resultArea, aiResponse) {
    if (aiResponse.isEnglish) {
      resultArea.innerHTML = `<div class="section-box">${aiResponse.content}</div>`;
    } else {
      const parsed = parseMultilingualResponse(aiResponse.content);
      resultArea.innerHTML = `
        ${parsed.commentTranslation ? `
          <div class="translation-block">
            <div class="translation-label">📖 评论翻译</div>
            <div class="translation-content">${parsed.commentTranslation}</div>
          </div>
        ` : ''}
        <div class="translation-block">
          <div class="translation-label">💬 回复内容</div>
          <div class="translation-content">${parsed.reply}</div>
        </div>
        ${parsed.replyTranslation ? `
          <div class="translation-block">
            <div class="translation-label">🔤 回复翻译</div>
            <div class="translation-content">${parsed.replyTranslation}</div>
          </div>
        ` : ''}
      `;
    }
  }

  // 获取要复制的回复内容
  function getReplyContent(resultArea, isEnglish) {
    if (isEnglish) {
      const box = resultArea.querySelector('.section-box');
      return box ? box.textContent : '';
    } else {
      const replyBlock = resultArea.querySelectorAll('.translation-block')[1];
      if (replyBlock) {
        const content = replyBlock.querySelector('.translation-content');
        return content ? content.textContent : '';
      }
      return '';
    }
  }

  // 主初始化函数
  async function init() {
    // 创建面板
    const panel = createPanel();
    const settingsOverlay = createSettingsPanel();

    // 获取元素
    const selectedCommentEl = document.getElementById('selected-comment');
    const resultSection = document.getElementById('result-section');
    const resultArea = document.getElementById('result-area');
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const settingsBtn = panel.querySelector('.settings-btn');
    const collapseBtn = panel.querySelector('.collapse-btn');

    // 设置面板元素
    const settingsClose = document.getElementById('settings-close');
    const settingsCancel = document.getElementById('settings-cancel');
    const settingsSave = document.getElementById('settings-save');
    const settingApiUrl = document.getElementById('setting-api-url');
    const settingApiKey = document.getElementById('setting-api-key');
    const settingModel = document.getElementById('setting-model');
    const settingPrompt = document.getElementById('setting-prompt');

    let currentComment = '';
    let currentIsEnglish = true;

    // 监听文本选择
    document.addEventListener('mouseup', () => {
      const selection = window.getSelection().toString().trim();
      if (selection && selection.length > 0) {
        currentComment = selection;
        selectedCommentEl.textContent = selection;
        selectedCommentEl.classList.remove('empty');
      }
    });

    // 收起/展开
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('collapsed');
      collapseBtn.textContent = panel.classList.contains('collapsed') ? '💬' : '−';
    });

    panel.addEventListener('click', () => {
      if (panel.classList.contains('collapsed')) {
        panel.classList.remove('collapsed');
        collapseBtn.textContent = '−';
      }
    });

    // 打开设置
    settingsBtn.addEventListener('click', async () => {
      const config = await loadConfig();
      settingApiUrl.value = config.apiUrl;
      settingApiKey.value = config.apiKey;
      settingModel.value = config.modelName;
      settingPrompt.value = config.systemPrompt;
      settingsOverlay.style.display = 'flex';
    });

    // 关闭设置
    const closeSettings = () => {
      settingsOverlay.style.display = 'none';
    };
    settingsClose.addEventListener('click', closeSettings);
    settingsCancel.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', (e) => {
      if (e.target === settingsOverlay) closeSettings();
    });

    // 保存设置
    settingsSave.addEventListener('click', async () => {
      await saveConfig({
        apiUrl: settingApiUrl.value.trim(),
        apiKey: settingApiKey.value.trim(),
        modelName: settingModel.value.trim(),
        systemPrompt: settingPrompt.value.trim()
      });
      showToast('设置已保存');
      closeSettings();
    });

    // 生成回复
    generateBtn.addEventListener('click', async () => {
      if (!currentComment) {
        showToast('请先选中评论文字');
        return;
      }

      const config = await loadConfig();
      if (!config.apiUrl || !config.apiKey) {
        showToast('请先在设置中配置 API 信息');
        settingsBtn.click();
        return;
      }

      // 显示加载状态
      generateBtn.disabled = true;
      generateBtn.textContent = '生成中...';
      resultSection.style.display = 'block';
      resultArea.innerHTML = `<div class="loading"><div class="loading-spinner"></div><span>正在生成回复...</span></div>`;
      copyBtn.style.display = 'none';

      try {
        const aiResponse = await callAI(config, currentComment);
        currentIsEnglish = aiResponse.isEnglish;
        renderResult(resultArea, aiResponse);
        copyBtn.style.display = 'block';
      } catch (error) {
        resultArea.innerHTML = `<div class="error-message">❌ ${error.message}</div>`;
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = '生成回复';
      }
    });

    // 复制回复
    copyBtn.addEventListener('click', async () => {
      const reply = getReplyContent(resultArea, currentIsEnglish);
      if (reply) {
        await navigator.clipboard.writeText(reply);
        showToast('已复制到剪贴板');
        copyBtn.textContent = '已复制 ✓';
        copyBtn.classList.add('btn-success');
        setTimeout(() => {
          copyBtn.textContent = '复制回复';
          copyBtn.classList.remove('btn-success');
        }, 2000);
      }
    });
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
