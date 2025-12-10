// Meta Business Suite 评论回复助手 v5.1
// 更新：多语言逻辑修正、插件内选择修复、进度显示优化、内置提示词改英文
(function() {
  'use strict';

  const VERSION = '5.2.1';

  // 预设平台列表
  const PRESET_PLATFORMS = [
    { id: 'meta', name: 'Meta Business Suite', domain: 'business.facebook.com' },
    { id: 'instagram', name: 'Instagram', domain: 'instagram.com' },
    { id: 'youtube', name: 'YouTube Studio', domain: 'studio.youtube.com' },
    { id: 'tiktok', name: 'TikTok Business', domain: 'business.tiktok.com' },
    { id: 'twitter', name: 'Twitter/X', domain: 'twitter.com' },
    { id: 'amazon', name: 'Amazon Seller', domain: 'sellercentral.amazon.com' },
    { id: 'shopify', name: 'Shopify Admin', domain: 'admin.shopify.com' }
  ];

  // 默认配置
  const DEFAULT_CONFIG = {
    apis: [],
    activeApiIndex: 0,
    platforms: {},  // { platformId: { prompt: '', knowledge: '' } }
    customPlatforms: []  // [{ id: 'custom_xxx', name: 'xxx', domain: 'xxx.com' }]
  };

  const DEFAULT_PROMPT = `You are a professional social media customer service assistant.

Response requirements:
- Friendly and sincere tone
- Concise, 1-2 sentences
- Positive comments → Thank them
- Questions → Provide help
- Complaints → Apologize and offer solutions`;

  // 对话历史（用于修改回复）
  let conversationHistory = [];
  
  // 当前请求的 AbortController
  let currentAbortController = null;

  // 插件面板元素引用
  let panelElement = null;

  // ==================== 日志系统 ====================
  const Logger = {
    logs: [],
    maxLogs: 200,

    add(level, message, data = null) {
      const logEntry = {
        time: new Date().toISOString(),
        level,
        message,
        data
      };
      this.logs.push(logEntry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
      console.log(`[${level}] ${message}`, data || '');
      this.save();
    },

    info(message, data) { this.add('INFO', message, data); },
    error(message, data) { this.add('ERROR', message, data); },
    warn(message, data) { this.add('WARN', message, data); },

    save() {
      try {
        chrome.storage.local.set({ logs: this.logs });
      } catch (e) {
        console.error('保存日志失败', e);
      }
    },

    async load() {
      return new Promise((resolve) => {
        chrome.storage.local.get(['logs'], (result) => {
          if (result.logs) {
            this.logs = result.logs;
          }
          resolve(this.logs);
        });
      });
    },

    clear() {
      this.logs = [];
      this.save();
    },

    export() {
      return this.logs.map(log => 
        `[${log.time}] [${log.level}] ${log.message}${log.data ? '\n  Data: ' + JSON.stringify(log.data) : ''}`
      ).join('\n');
    }
  };

  // ==================== 进度管理 ====================
  const Progress = {
    startTime: null,
    timerInterval: null,
    statusEl: null,

    start(statusEl) {
      this.statusEl = statusEl;
      this.startTime = Date.now();
      this.update('Connecting...');
      
      this.timerInterval = setInterval(() => {
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        const currentText = this.statusEl.querySelector('.progress-text');
        if (currentText) {
          const statusPart = currentText.textContent.split(' (')[0];
          currentText.textContent = `${statusPart} (${elapsed}s)`;
        }
      }, 100);
    },

    update(status) {
      if (this.statusEl) {
        const elapsed = this.startTime ? ((Date.now() - this.startTime) / 1000).toFixed(1) : '0.0';
        this.statusEl.innerHTML = `
          <div class="progress-status">
            <span class="progress-text">${status} (${elapsed}s)</span>
          </div>
        `;
      }
    },

    success(message = 'Generated successfully') {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      const elapsed = this.startTime ? ((Date.now() - this.startTime) / 1000).toFixed(1) : '0';
      this.startTime = null;
      
      if (this.statusEl) {
        this.statusEl.innerHTML = `
          <div class="progress-status progress-success">
            <span class="progress-text">✓ ${message} (${elapsed}s)</span>
          </div>
        `;
      }
      return elapsed;
    },

    stop() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      const elapsed = this.startTime ? ((Date.now() - this.startTime) / 1000).toFixed(1) : '0';
      this.startTime = null;
      return elapsed;
    }
  };

  // ==================== 语言检测 ====================
  // 检测是否为英语
  function isEnglish(text) {
    const englishChars = text.match(/[a-zA-Z]/g) || [];
    const totalChars = text.replace(/\s/g, '').length;
    return totalChars > 0 && (englishChars.length / totalChars) > 0.7;
  }

  // 检测是否为中文（简体或繁体）
  function isChinese(text) {
    const chineseChars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || [];
    const totalChars = text.replace(/\s/g, '').length;
    return totalChars > 0 && (chineseChars.length / totalChars) > 0.3;
  }

  // 获取语言类型
  function getLanguageType(text) {
    if (isEnglish(text)) return 'english';
    if (isChinese(text)) return 'chinese';
    return 'other';
  }

  // 创建主面板
  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'meta-reply-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <span class="header-title">💬 Reply Assistant <span class="version">v${VERSION}</span></span>
        <div class="header-actions">
          <button class="header-btn log-btn" title="View Logs">📋</button>
          <button class="header-btn settings-btn" title="Settings">⚙️</button>
          <button class="collapse-btn" title="Collapse">−</button>
        </div>
      </div>
      <div class="panel-content">
        <div class="usage-hint">📌 Select comment text on page, then click "Generate Reply"</div>
        <div class="section">
          <div class="section-label">📍 Platform: <span id="current-platform">-</span></div>
        </div>
        <div class="section">
          <div class="section-label">🔌 API</div>
          <div class="api-selector" id="api-selector">
            <span class="no-api-hint">Please add API in settings</span>
          </div>
        </div>
        <div class="section">
          <div class="section-label">📝 Selected Comment</div>
          <div class="section-box empty" id="selected-comment">Select comment text on the page</div>
        </div>
        <div class="section" id="result-section" style="display: none;">
          <div class="section-label">🤖 AI Reply</div>
          <div id="result-area"></div>
        </div>
        <div class="section" id="revision-section" style="display: none;">
          <div class="section-label">✏️ Revision Notes</div>
          <textarea class="revision-input" id="revision-input" placeholder="Enter revision notes, e.g., more friendly, add discount info, shorter..."></textarea>
        </div>
        <div class="button-group">
          <button class="btn btn-primary" id="generate-btn">Generate Reply</button>
          <button class="btn btn-danger" id="abort-btn" style="display: none;">Stop</button>
          <button class="btn btn-secondary" id="copy-btn" style="display: none;">Copy Reply</button>
        </div>
        <div class="button-group" id="revision-buttons" style="display: none;">
          <button class="btn btn-primary" id="revise-btn">Revise</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    panelElement = panel;
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
          <span class="settings-title">⚙️ Settings</span>
          <button class="settings-close" id="settings-close">×</button>
        </div>
        <div class="settings-body">
          <div class="form-group">
            <label class="form-label">📍 Platform Configuration</label>
            <div class="platform-select-row">
              <select class="form-select" id="platform-select">
                <option value="">-- Select Platform --</option>
              </select>
              <button class="btn btn-secondary btn-small" id="add-custom-platform-btn">+ Custom</button>
            </div>
            <div id="custom-platform-input" class="custom-platform-input" style="display: none;">
              <input type="text" class="form-input" id="custom-platform-name" placeholder="Platform name, e.g., My Store">
              <input type="text" class="form-input" id="custom-platform-domain" placeholder="Domain, e.g., mystore.com">
              <div class="form-hint">💡 Enter main domain only, e.g., amazon.com, ebay.com</div>
              <div class="custom-platform-actions">
                <button class="btn btn-secondary btn-small" id="cancel-custom-platform">Cancel</button>
                <button class="btn btn-primary btn-small" id="save-custom-platform">Add</button>
              </div>
            </div>
            <div id="platform-config-area" class="platform-config-area" style="display: none;">
              <div class="platform-config-header">
                <span id="platform-config-title">Platform Settings</span>
                <button class="btn-delete-platform" id="delete-platform-btn" title="Delete this platform" style="display: none;">× Delete</button>
              </div>
              <div class="form-group">
                <label class="form-label">System Prompt</label>
                <textarea class="form-textarea" id="platform-prompt" placeholder="Set AI role, tone, response rules..."></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Knowledge Base</label>
                <textarea class="form-textarea" id="platform-knowledge" placeholder="Product info, pricing, FAQs..."></textarea>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">🔌 API Configuration</label>
            <div class="form-hint">Add multiple APIs. Auto-switch on failure.</div>
            <div class="api-list" id="api-list"></div>
            <button class="btn btn-secondary btn-small" id="add-api-btn">+ Add API</button>
          </div>
        </div>
        <div class="settings-footer">
          <button class="btn btn-danger" id="settings-clear">🗑️ Clear All</button>
          <div style="flex: 1;"></div>
          <button class="btn btn-secondary" id="settings-cancel">Cancel</button>
          <button class="btn btn-primary" id="settings-save">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  // 创建日志面板
  function createLogPanel() {
    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.id = 'log-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="settings-panel log-panel">
        <div class="settings-header">
          <span class="settings-title">📋 Logs</span>
          <button class="settings-close" id="log-close">×</button>
        </div>
        <div class="settings-body">
          <div class="log-content" id="log-content"></div>
        </div>
        <div class="settings-footer">
          <button class="btn btn-danger" id="log-clear">Clear Logs</button>
          <div style="flex: 1;"></div>
          <button class="btn btn-secondary" id="log-export">Export</button>
          <button class="btn btn-primary" id="log-close-btn">Close</button>
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
      chrome.storage.local.get(['apis', 'activeApiIndex', 'platforms', 'customPlatforms'], (result) => {
        resolve({
          apis: result.apis || DEFAULT_CONFIG.apis,
          activeApiIndex: result.activeApiIndex || DEFAULT_CONFIG.activeApiIndex,
          platforms: result.platforms || DEFAULT_CONFIG.platforms,
          customPlatforms: result.customPlatforms || DEFAULT_CONFIG.customPlatforms
        });
      });
    });
  }

  // 获取所有平台（预设 + 自定义）
  function getAllPlatforms(config) {
    const custom = (config.customPlatforms || []).map(p => ({
      ...p,
      isCustom: true
    }));
    return [...PRESET_PLATFORMS, ...custom];
  }

  // 根据当前 URL 匹配平台
  function matchPlatform(config) {
    const hostname = window.location.hostname;
    const allPlatforms = getAllPlatforms(config);
    
    for (const platform of allPlatforms) {
      if (hostname.includes(platform.domain)) {
        return platform;
      }
    }
    return null;
  }

  // 获取平台配置（提示词和知识库）
  function getPlatformConfig(config, platformId) {
    return config.platforms[platformId] || { prompt: DEFAULT_PROMPT, knowledge: '' };
  }

  // 保存配置
  async function saveConfig(config) {
    return new Promise((resolve) => {
      chrome.storage.local.set(config, resolve);
    });
  }

  // 调用单个 API
  async function callSingleAPI(api, messages, signal, progressCallback) {
    if (progressCallback) progressCallback(`Calling ${api.name}...`);

    const response = await fetch(api.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api.key}`
      },
      body: JSON.stringify({
        model: api.model,
        messages: messages,
        temperature: 0.7
      }),
      signal: signal
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${api.name} failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // 调用 AI API（支持中止和故障切换）
  async function callAI(config, platform, comment, isRevision = false, revisionNote = '', progressCallback, startApiIndex = null) {
    if (!config.apis || config.apis.length === 0) {
      throw new Error('Please add API configuration in settings');
    }

    // 获取平台配置
    const platformConfig = platform ? getPlatformConfig(config, platform.id) : { prompt: DEFAULT_PROMPT, knowledge: '' };

    // 创建新的 AbortController
    currentAbortController = new AbortController();
    
    // 组合系统提示词
    let fullSystemPrompt = platformConfig.prompt || DEFAULT_PROMPT;
    if (platformConfig.knowledge && platformConfig.knowledge.trim()) {
      fullSystemPrompt += `\n\n---\n[Knowledge Base]\n${platformConfig.knowledge}`;
    }

    let messages = [
      { role: 'system', content: fullSystemPrompt }
    ];

    if (isRevision && conversationHistory.length > 0) {
      messages = messages.concat(conversationHistory);
      messages.push({
        role: 'user',
        content: `Please revise the reply based on these notes:\n\nRevision notes: ${revisionNote}\n\nKeep the same output format as before.`
      });
    } else {
      // Let AI detect language and decide output format
      let userPrompt = `Please generate a reply for this comment.

Comment: ${comment}

Instructions:
1. First, detect the language of the comment
2. If the comment is in English or Chinese (Simplified/Traditional): output ONLY the reply, nothing else
3. If the comment is in ANY OTHER language (Spanish, German, French, Japanese, Korean, Arabic, etc.): output in this exact format:
[Comment Translation] (translate the comment to Chinese)
[Reply] (reply in the SAME language as the original comment)
[Reply Translation] (translate the reply to Chinese)

Important: For non-English/non-Chinese comments, you MUST use the three-part format with labels.`;
      
      messages.push({ role: 'user', content: userPrompt });
    }

    // 从指定索引或当前激活的 API 开始尝试
    const startIndex = startApiIndex !== null ? startApiIndex : config.activeApiIndex;
    let lastError = null;

    for (let i = 0; i < config.apis.length; i++) {
      const apiIndex = (startIndex + i) % config.apis.length;
      const api = config.apis[apiIndex];

      Logger.info('Trying API', { 
        name: api.name,
        url: api.url, 
        model: api.model,
        attempt: i + 1
      });

      try {
        const assistantMessage = await callSingleAPI(
          api, 
          messages, 
          currentAbortController.signal,
          progressCallback
        );

        Logger.info('API success', { 
          name: api.name,
          responseLength: assistantMessage.length
        });

        // 更新对话历史
        if (!isRevision) {
          conversationHistory = [
            messages[messages.length - 1],
            { role: 'assistant', content: assistantMessage }
          ];
        } else {
          conversationHistory.push(
            { role: 'user', content: `Please revise the reply based on these notes:\n\nRevision notes: ${revisionNote}\n\nKeep the same output format as before.` },
            { role: 'assistant', content: assistantMessage }
          );
        }

        return {
          content: assistantMessage,
          usedApi: api.name
        };

      } catch (error) {
        if (error.name === 'AbortError') {
          throw error;
        }
        
        lastError = error;
        Logger.warn(`API ${api.name} failed, trying next`, { error: error.message });
        
        if (progressCallback) {
          progressCallback(`${api.name} failed, switching...`);
        }
      }
    }

    Logger.error('All APIs failed', { lastError: lastError?.message });
    throw new Error(`All APIs failed. Last error: ${lastError?.message}`);
  }

  // 中止当前请求
  function abortCurrentRequest() {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
      Logger.warn('Request aborted by user');
    }
  }

  // 解析多语言回复
  function parseMultilingualResponse(content) {
    const result = {
      commentTranslation: '',
      reply: '',
      replyTranslation: ''
    };

    // 支持中英文标签
    const commentMatch = content.match(/\[Comment Translation\](.+?)(?=\[|$)/s) || 
                         content.match(/【评论翻译】(.+?)(?=【|$)/s);
    const replyMatch = content.match(/\[Reply\](.+?)(?=\[|$)/s) || 
                       content.match(/【回复内容】(.+?)(?=【|$)/s) ||
                       content.match(/【回复】(.+?)(?=【|$)/s);
    const replyTransMatch = content.match(/\[Reply Translation\](.+?)(?=\[|$)/s) || 
                            content.match(/【回复翻译】(.+?)(?=【|$)/s);

    if (commentMatch) result.commentTranslation = commentMatch[1].trim();
    if (replyMatch) result.reply = replyMatch[1].trim();
    if (replyTransMatch) result.replyTranslation = replyTransMatch[1].trim();

    if (!result.reply) {
      result.reply = content;
    }

    return result;
  }

  // 渲染结果
  function renderResult(resultArea, aiResponse) {
    const usedApiHtml = aiResponse.usedApi ? 
      `<div class="used-api-hint">Used: ${aiResponse.usedApi}</div>` : '';

    // Check if response contains the three-part format
    const hasTranslationFormat = aiResponse.content.includes('[Comment Translation]') || 
                                  aiResponse.content.includes('[Reply]') ||
                                  aiResponse.content.includes('【评论翻译】') ||
                                  aiResponse.content.includes('【回复】');

    if (!hasTranslationFormat) {
      // Simple reply (English or Chinese comment)
      resultArea.innerHTML = `${usedApiHtml}<div class="section-box">${aiResponse.content}</div>`;
    } else {
      // Three-part format (other languages)
      const parsed = parseMultilingualResponse(aiResponse.content);
      resultArea.innerHTML = `
        ${usedApiHtml}
        ${parsed.commentTranslation ? `
          <div class="translation-block">
            <div class="translation-label">📖 Comment Translation</div>
            <div class="translation-content">${parsed.commentTranslation}</div>
          </div>
        ` : ''}
        <div class="translation-block">
          <div class="translation-label">💬 Reply</div>
          <div class="translation-content">${parsed.reply}</div>
        </div>
        ${parsed.replyTranslation ? `
          <div class="translation-block">
            <div class="translation-label">🔤 Reply Translation</div>
            <div class="translation-content">${parsed.replyTranslation}</div>
          </div>
        ` : ''}
      `;
    }
  }

  // 获取要复制的回复内容
  function getReplyContent(resultArea) {
    // First try to find the Reply block (for three-part format)
    const blocks = resultArea.querySelectorAll('.translation-block');
    for (const block of blocks) {
      const label = block.querySelector('.translation-label');
      if (label && label.textContent.includes('Reply') && !label.textContent.includes('Translation')) {
        const content = block.querySelector('.translation-content');
        return content ? content.textContent : '';
      }
    }
    
    // If no translation blocks, get the simple reply box
    const box = resultArea.querySelector('.section-box');
    return box ? box.textContent : '';
  }

  // 渲染日志内容
  function renderLogs(logContent) {
    const logs = Logger.logs;
    if (logs.length === 0) {
      logContent.innerHTML = '<div class="log-empty">No logs</div>';
      return;
    }

    logContent.innerHTML = logs.slice().reverse().map(log => {
      const levelClass = log.level.toLowerCase();
      const time = new Date(log.time).toLocaleString();
      return `
        <div class="log-entry log-${levelClass}">
          <span class="log-time">${time}</span>
          <span class="log-level">[${log.level}]</span>
          <span class="log-message">${log.message}</span>
          ${log.data ? `<pre class="log-data">${JSON.stringify(log.data, null, 2)}</pre>` : ''}
        </div>
      `;
    }).join('');
  }

  // 渲染 API 列表（设置面板中）
  function renderApiList(apiListEl, apis) {
    if (apis.length === 0) {
      apiListEl.innerHTML = '<div class="no-api-message">No API added</div>';
      return;
    }

    apiListEl.innerHTML = apis.map((api, index) => `
      <div class="api-item" data-index="${index}">
        <div class="api-item-header">
          <span class="api-item-name">${api.name || 'Unnamed API'}</span>
          <button class="api-item-delete" data-index="${index}" title="Delete">×</button>
        </div>
        <div class="api-item-fields">
          <input type="text" class="form-input api-field-name" placeholder="API Name" value="${api.name || ''}" data-index="${index}" data-field="name">
          <input type="text" class="form-input api-field-url" placeholder="API URL" value="${api.url || ''}" data-index="${index}" data-field="url">
          <input type="password" class="form-input api-field-key" placeholder="API Key" value="${api.key || ''}" data-index="${index}" data-field="key">
          <input type="text" class="form-input api-field-model" placeholder="Model Name" value="${api.model || ''}" data-index="${index}" data-field="model">
        </div>
      </div>
    `).join('');
  }

  // 渲染 API 选择器（主面板中）
  function renderApiSelector(selectorEl, apis, activeIndex, onChange) {
    if (apis.length === 0) {
      selectorEl.innerHTML = '<span class="no-api-hint">Please add API in settings</span>';
      return;
    }

    selectorEl.innerHTML = apis.map((api, index) => `
      <label class="api-radio-label" title="${api.url}">
        <input type="radio" name="api-select" value="${index}" ${index === activeIndex ? 'checked' : ''}>
        <span class="api-radio-dot"></span>
        <span class="api-radio-name">${api.name || 'Unnamed'}</span>
      </label>
    `).join('');

    selectorEl.querySelectorAll('input[name="api-select"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const newIndex = parseInt(e.target.value);
        onChange(newIndex);
      });
    });
  }

  // 检查选择是否在插件面板内
  function isSelectionInsidePanel(selection) {
    if (!selection || !selection.anchorNode || !panelElement) return false;
    
    let node = selection.anchorNode;
    while (node) {
      if (node === panelElement) return true;
      if (node.id === 'meta-reply-panel') return true;
      if (node.id === 'settings-overlay') return true;
      if (node.id === 'log-overlay') return true;
      node = node.parentNode;
    }
    return false;
  }

  // 主初始化函数
  async function init() {
    Logger.info(`Plugin initialized v${VERSION}`);
    await Logger.load();

    // 创建面板
    const panel = createPanel();
    const settingsOverlay = createSettingsPanel();
    const logOverlay = createLogPanel();

    // 获取元素
    const selectedCommentEl = document.getElementById('selected-comment');
    const resultSection = document.getElementById('result-section');
    const resultArea = document.getElementById('result-area');
    const generateBtn = document.getElementById('generate-btn');
    const abortBtn = document.getElementById('abort-btn');
    const copyBtn = document.getElementById('copy-btn');
    const settingsBtn = panel.querySelector('.settings-btn');
    const logBtn = panel.querySelector('.log-btn');
    const collapseBtn = panel.querySelector('.collapse-btn');
    const apiSelector = document.getElementById('api-selector');

    // 修改意见相关元素
    const revisionSection = document.getElementById('revision-section');
    const revisionInput = document.getElementById('revision-input');
    const revisionButtons = document.getElementById('revision-buttons');
    const reviseBtn = document.getElementById('revise-btn');

    // 设置面板元素
    const settingsClose = document.getElementById('settings-close');
    const settingsCancel = document.getElementById('settings-cancel');
    const settingsSave = document.getElementById('settings-save');
    const settingsClear = document.getElementById('settings-clear');
    const addApiBtn = document.getElementById('add-api-btn');
    const apiListEl = document.getElementById('api-list');
    
    // 平台配置元素
    const platformSelect = document.getElementById('platform-select');
    const addCustomPlatformBtn = document.getElementById('add-custom-platform-btn');
    const customPlatformInput = document.getElementById('custom-platform-input');
    const customPlatformName = document.getElementById('custom-platform-name');
    const customPlatformDomain = document.getElementById('custom-platform-domain');
    const cancelCustomPlatform = document.getElementById('cancel-custom-platform');
    const saveCustomPlatform = document.getElementById('save-custom-platform');
    const platformConfigArea = document.getElementById('platform-config-area');
    const platformConfigTitle = document.getElementById('platform-config-title');
    const deletePlatformBtn = document.getElementById('delete-platform-btn');
    const platformPrompt = document.getElementById('platform-prompt');
    const platformKnowledge = document.getElementById('platform-knowledge');
    const currentPlatformEl = document.getElementById('current-platform');

    // 日志面板元素
    const logClose = document.getElementById('log-close');
    const logCloseBtn = document.getElementById('log-close-btn');
    const logClear = document.getElementById('log-clear');
    const logExport = document.getElementById('log-export');
    const logContent = document.getElementById('log-content');

    let currentComment = '';
    let isGenerating = false;
    let tempApis = [];
    let tempPlatforms = {};  // 临时平台配置
    let tempCustomPlatforms = [];  // 临时自定义平台
    let currentPlatform = null;  // 当前匹配的平台
    let selectedPlatformId = null;  // 设置中选中的平台

    // 渲染平台下拉选择
    function renderPlatformSelect(config) {
      const allPlatforms = getAllPlatforms(config);
      platformSelect.innerHTML = '<option value="">-- Select Platform --</option>' +
        allPlatforms.map(p => `<option value="${p.id}">${p.name}${p.isCustom ? ' (Custom)' : ''}</option>`).join('');
    }

    // 加载并显示当前平台
    async function refreshCurrentPlatform() {
      const config = await loadConfig();
      currentPlatform = matchPlatform(config);
      if (currentPlatform) {
        currentPlatformEl.textContent = currentPlatform.name;
        panel.style.display = 'flex';
      } else {
        currentPlatformEl.textContent = 'Not configured';
        // 仍然显示面板，让用户可以配置
        panel.style.display = 'flex';
      }
    }

    // 加载并渲染 API 选择器
    async function refreshApiSelector() {
      const config = await loadConfig();
      renderApiSelector(apiSelector, config.apis, config.activeApiIndex, async (newIndex) => {
        await saveConfig({ ...config, activeApiIndex: newIndex });
        Logger.info('Switched API', { name: config.apis[newIndex]?.name });
      });
    }

    await refreshApiSelector();
    await refreshCurrentPlatform();

    // 监听文本选择（排除插件面板内的选择）
    document.addEventListener('mouseup', (e) => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      // 检查是否在插件面板内选择
      if (isSelectionInsidePanel(selection)) {
        return; // 忽略插件内的选择
      }
      
      if (selectedText && selectedText.length > 0) {
        currentComment = selectedText;
        selectedCommentEl.textContent = selectedText;
        selectedCommentEl.classList.remove('empty');
        Logger.info('Selected comment', { length: selectedText.length });
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
      tempApis = JSON.parse(JSON.stringify(config.apis));
      tempPlatforms = JSON.parse(JSON.stringify(config.platforms || {}));
      tempCustomPlatforms = JSON.parse(JSON.stringify(config.customPlatforms || []));
      renderApiList(apiListEl, tempApis);
      renderPlatformSelect({ ...config, customPlatforms: tempCustomPlatforms });
      
      // 重置平台配置区域
      platformSelect.value = '';
      platformConfigArea.style.display = 'none';
      customPlatformInput.style.display = 'none';
      selectedPlatformId = null;
      
      settingsOverlay.style.display = 'flex';
    });

    // 平台选择变化
    platformSelect.addEventListener('change', () => {
      const platformId = platformSelect.value;
      if (!platformId) {
        platformConfigArea.style.display = 'none';
        selectedPlatformId = null;
        return;
      }
      
      selectedPlatformId = platformId;
      const allPlatforms = [...PRESET_PLATFORMS, ...tempCustomPlatforms];
      const platform = allPlatforms.find(p => p.id === platformId);
      const platformConf = tempPlatforms[platformId] || { prompt: DEFAULT_PROMPT, knowledge: '' };
      
      platformConfigTitle.textContent = platform ? platform.name : 'Platform Settings';
      platformPrompt.value = platformConf.prompt || DEFAULT_PROMPT;
      platformKnowledge.value = platformConf.knowledge || '';
      
      // 只有自定义平台才能删除
      const isCustom = tempCustomPlatforms.some(p => p.id === platformId);
      deletePlatformBtn.style.display = isCustom ? 'inline-block' : 'none';
      
      platformConfigArea.style.display = 'block';
    });

    // 平台配置输入变化时保存到临时对象
    platformPrompt.addEventListener('input', () => {
      if (selectedPlatformId) {
        if (!tempPlatforms[selectedPlatformId]) {
          tempPlatforms[selectedPlatformId] = { prompt: '', knowledge: '' };
        }
        tempPlatforms[selectedPlatformId].prompt = platformPrompt.value;
      }
    });

    platformKnowledge.addEventListener('input', () => {
      if (selectedPlatformId) {
        if (!tempPlatforms[selectedPlatformId]) {
          tempPlatforms[selectedPlatformId] = { prompt: '', knowledge: '' };
        }
        tempPlatforms[selectedPlatformId].knowledge = platformKnowledge.value;
      }
    });

    // 显示添加自定义平台输入框
    addCustomPlatformBtn.addEventListener('click', () => {
      customPlatformInput.style.display = 'block';
      customPlatformName.value = '';
      customPlatformDomain.value = '';
      customPlatformName.focus();
    });

    // 取消添加自定义平台
    cancelCustomPlatform.addEventListener('click', () => {
      customPlatformInput.style.display = 'none';
    });

    // 保存自定义平台
    saveCustomPlatform.addEventListener('click', () => {
      const name = customPlatformName.value.trim();
      const domain = customPlatformDomain.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      
      if (!name || !domain) {
        showToast('Please enter platform name and domain');
        return;
      }
      
      const id = 'custom_' + Date.now();
      tempCustomPlatforms.push({ id, name, domain });
      renderPlatformSelect({ customPlatforms: tempCustomPlatforms });
      platformSelect.value = id;
      platformSelect.dispatchEvent(new Event('change'));
      customPlatformInput.style.display = 'none';
      showToast('Platform added');
    });

    // 删除自定义平台
    deletePlatformBtn.addEventListener('click', () => {
      if (!selectedPlatformId) return;
      
      const platform = tempCustomPlatforms.find(p => p.id === selectedPlatformId);
      if (!platform) return;
      
      if (confirm(`Delete platform "${platform.name}"?`)) {
        tempCustomPlatforms = tempCustomPlatforms.filter(p => p.id !== selectedPlatformId);
        delete tempPlatforms[selectedPlatformId];
        renderPlatformSelect({ customPlatforms: tempCustomPlatforms });
        platformSelect.value = '';
        platformConfigArea.style.display = 'none';
        selectedPlatformId = null;
        showToast('Platform deleted');
      }
    });

    // 添加 API
    addApiBtn.addEventListener('click', () => {
      tempApis.push({ name: '', url: '', key: '', model: '' });
      renderApiList(apiListEl, tempApis);
    });

    // API 列表事件委托
    apiListEl.addEventListener('input', (e) => {
      if (e.target.classList.contains('form-input')) {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        if (tempApis[index] && field) {
          tempApis[index][field] = e.target.value;
          if (field === 'name') {
            const nameSpan = e.target.closest('.api-item').querySelector('.api-item-name');
            if (nameSpan) nameSpan.textContent = e.target.value || 'Unnamed API';
          }
        }
      }
    });

    apiListEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('api-item-delete')) {
        const index = parseInt(e.target.dataset.index);
        if (confirm(`Delete "${tempApis[index]?.name || 'Unnamed API'}"?`)) {
          tempApis.splice(index, 1);
          renderApiList(apiListEl, tempApis);
        }
      }
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
      const config = await loadConfig();
      const validApis = tempApis.filter(api => api.url && api.key);
      if (validApis.length === 0 && tempApis.length > 0) {
        showToast('Please complete at least one API (URL and Key)');
        return;
      }
      
      let newActiveIndex = config.activeApiIndex;
      if (newActiveIndex >= validApis.length) {
        newActiveIndex = 0;
      }

      await saveConfig({
        apis: validApis,
        activeApiIndex: newActiveIndex,
        platforms: tempPlatforms,
        customPlatforms: tempCustomPlatforms
      });
      
      await refreshApiSelector();
      await refreshCurrentPlatform();
      Logger.info('Settings saved', { apiCount: validApis.length, platformCount: Object.keys(tempPlatforms).length });
      showToast('Settings saved');
      closeSettings();
    });

    // 清除所有数据
    settingsClear.addEventListener('click', async () => {
      if (confirm('Delete all data?\n\nThis will remove all API configs, platform settings, and custom platforms.\n\nThis cannot be undone!')) {
        await new Promise((resolve) => {
          chrome.storage.local.clear(resolve);
        });
        tempApis = [];
        tempPlatforms = {};
        tempCustomPlatforms = [];
        renderApiList(apiListEl, tempApis);
        renderPlatformSelect({ customPlatforms: [] });
        platformSelect.value = '';
        platformConfigArea.style.display = 'none';
        await refreshApiSelector();
        await refreshCurrentPlatform();
        Logger.info('All data cleared');
        showToast('All data cleared');
        closeSettings();
      }
    });

    // 打开日志
    logBtn.addEventListener('click', () => {
      renderLogs(logContent);
      logOverlay.style.display = 'flex';
    });

    // 关闭日志
    const closeLog = () => {
      logOverlay.style.display = 'none';
    };
    logClose.addEventListener('click', closeLog);
    logCloseBtn.addEventListener('click', closeLog);
    logOverlay.addEventListener('click', (e) => {
      if (e.target === logOverlay) closeLog();
    });

    // 清空日志
    logClear.addEventListener('click', () => {
      if (confirm('Clear all logs?')) {
        Logger.clear();
        renderLogs(logContent);
        showToast('Logs cleared');
      }
    });

    // 导出日志
    logExport.addEventListener('click', () => {
      const logText = Logger.export();
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meta-reply-log-${new Date().toISOString().slice(0,10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Logs exported');
    });

    // 生成回复
    generateBtn.addEventListener('click', async () => {
      if (!currentComment) {
        showToast('Please select comment text first');
        return;
      }

      const config = await loadConfig();
      if (!config.apis || config.apis.length === 0) {
        showToast('Please add API in settings');
        settingsBtn.click();
        return;
      }

      // 检查当前平台是否有配置
      if (!currentPlatform) {
        showToast('Current site not configured. Please add in settings.');
        settingsBtn.click();
        return;
      }

      isGenerating = true;
      generateBtn.style.display = 'none';
      abortBtn.style.display = 'block';
      resultSection.style.display = 'block';
      copyBtn.style.display = 'none';
      revisionSection.style.display = 'none';
      revisionButtons.style.display = 'none';

      Progress.start(resultArea);

      try {
        const aiResponse = await callAI(config, currentPlatform, currentComment, false, '', (status) => {
          Progress.update(status);
        });
        const elapsed = Progress.success('Generated successfully');
        
        // 延迟一下再显示结果，让用户看到成功提示
        setTimeout(() => {
          renderResult(resultArea, aiResponse);
          copyBtn.style.display = 'block';
          revisionSection.style.display = 'block';
          revisionButtons.style.display = 'flex';
          revisionInput.value = '';
        }, 500);
        
        Logger.info('Generation complete', { elapsed: elapsed + 's', usedApi: aiResponse.usedApi, platform: currentPlatform?.name });
      } catch (error) {
        Progress.stop();
        if (error.name === 'AbortError') {
          resultArea.innerHTML = `<div class="error-message">⏹️ Stopped</div>`;
        } else {
          Logger.error('Generation failed', { error: error.message });
          resultArea.innerHTML = `<div class="error-message">❌ ${error.message}</div>`;
        }
      } finally {
        isGenerating = false;
        generateBtn.style.display = 'block';
        abortBtn.style.display = 'none';
      }
    });

    // 中止生成
    abortBtn.addEventListener('click', () => {
      abortCurrentRequest();
      Progress.stop();
      isGenerating = false;
      generateBtn.style.display = 'block';
      abortBtn.style.display = 'none';
      showToast('Stopped');
    });

    // 根据意见修改回复
    reviseBtn.addEventListener('click', async () => {
      const revisionNote = revisionInput.value.trim();
      if (!revisionNote) {
        showToast('Please enter revision notes');
        return;
      }

      const config = await loadConfig();

      isGenerating = true;
      reviseBtn.disabled = true;
      reviseBtn.textContent = 'Revising...';
      copyBtn.style.display = 'none';

      Progress.start(resultArea);

      try {
        const aiResponse = await callAI(config, currentPlatform, currentComment, true, revisionNote, (status) => {
          Progress.update(status);
        });
        const elapsed = Progress.success('Revised successfully');
        
        setTimeout(() => {
          renderResult(resultArea, aiResponse);
          copyBtn.style.display = 'block';
          revisionInput.value = '';
        }, 500);
        
        Logger.info('Revision complete', { elapsed: elapsed + 's', usedApi: aiResponse.usedApi });
        showToast('Reply updated');
      } catch (error) {
        Progress.stop();
        if (error.name === 'AbortError') {
          resultArea.innerHTML = `<div class="error-message">⏹️ Stopped</div>`;
        } else {
          Logger.error('Revision failed', { error: error.message });
          resultArea.innerHTML = `<div class="error-message">❌ ${error.message}</div>`;
        }
      } finally {
        isGenerating = false;
        reviseBtn.disabled = false;
        reviseBtn.textContent = 'Revise';
      }
    });

    // 复制回复
    copyBtn.addEventListener('click', async () => {
      const reply = getReplyContent(resultArea);
      if (reply) {
        await navigator.clipboard.writeText(reply);
        Logger.info('Copied reply');
        showToast('Copied to clipboard');
        copyBtn.textContent = 'Copied ✓';
        copyBtn.classList.add('btn-success');
        setTimeout(() => {
          copyBtn.textContent = 'Copy Reply';
          copyBtn.classList.remove('btn-success');
        }, 2000);
      }
    });

    Logger.info('Plugin ready');
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
