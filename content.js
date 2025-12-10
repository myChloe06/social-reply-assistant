// Meta Business Suite 评论回复助手
(function() {
  'use strict';

  // 默认配置
  const DEFAULT_CONFIG = {
    apiUrl: '',
    apiKey: '',
    modelName: 'gpt-3.5-turbo',
    systemPrompt: `你是一个专业的社交媒体客服助手。

回复要求：
- 语气友好、真诚
- 简洁明了，1-2句话
- 好评→感谢，问题→帮助，投诉→道歉+解决方案`,
    knowledgeBase: ''
  };

  // 对话历史（用于修改回复）
  let conversationHistory = [];
  
  // 当前请求的 AbortController
  let currentAbortController = null;

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
      this.update('连接中...');
      
      this.timerInterval = setInterval(() => {
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        const currentStatus = this.statusEl.querySelector('.progress-text')?.textContent?.split(' (')[0] || '处理中';
        this.update(`${currentStatus} (${elapsed}s)`);
      }, 100);
    },

    update(status) {
      if (this.statusEl) {
        const elapsed = this.startTime ? ((Date.now() - this.startTime) / 1000).toFixed(1) : '0.0';
        this.statusEl.innerHTML = `
          <div class="progress-status">
            <div class="loading-spinner"></div>
            <span class="progress-text">${status}</span>
          </div>
        `;
      }
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

  // 创建主面板
  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'meta-reply-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <span class="header-title">💬 评论回复助手</span>
        <div class="header-actions">
          <button class="header-btn log-btn" title="查看日志">📋</button>
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
        <div class="section" id="revision-section" style="display: none;">
          <div class="section-label">✏️ 修改意见</div>
          <textarea class="revision-input" id="revision-input" placeholder="输入修改意见，例如：语气再热情一点、加上优惠信息、更简短一些..."></textarea>
        </div>
        <div class="button-group">
          <button class="btn btn-primary" id="generate-btn">生成回复</button>
          <button class="btn btn-danger" id="abort-btn" style="display: none;">停止生成</button>
          <button class="btn btn-secondary" id="copy-btn" style="display: none;">复制回复</button>
        </div>
        <div class="button-group" id="revision-buttons" style="display: none;">
          <button class="btn btn-primary" id="revise-btn">根据意见修改</button>
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
            <div class="form-hint">设置 AI 的角色、语气、回复规则等（基本不变的内容）</div>
            <textarea class="form-textarea" id="setting-prompt" placeholder="例如：你是XX品牌客服，语气热情友好，回复简洁..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">知识库</label>
            <div class="form-hint">产品信息、价格、常见问题等（经常更新的内容）</div>
            <textarea class="form-textarea" id="setting-knowledge" placeholder="例如：产品A售价99元，适合6岁以上..."></textarea>
          </div>
        </div>
        <div class="settings-footer">
          <button class="btn btn-danger" id="settings-clear">🗑️ 清除所有数据</button>
          <div style="flex: 1;"></div>
          <button class="btn btn-secondary" id="settings-cancel">取消</button>
          <button class="btn btn-primary" id="settings-save">保存设置</button>
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
          <span class="settings-title">📋 运行日志</span>
          <button class="settings-close" id="log-close">×</button>
        </div>
        <div class="settings-body">
          <div class="log-content" id="log-content"></div>
        </div>
        <div class="settings-footer">
          <button class="btn btn-danger" id="log-clear">清空日志</button>
          <div style="flex: 1;"></div>
          <button class="btn btn-secondary" id="log-export">导出日志</button>
          <button class="btn btn-primary" id="log-close-btn">关闭</button>
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
      chrome.storage.local.get(['apiUrl', 'apiKey', 'modelName', 'systemPrompt', 'knowledgeBase'], (result) => {
        resolve({
          apiUrl: result.apiUrl || DEFAULT_CONFIG.apiUrl,
          apiKey: result.apiKey || DEFAULT_CONFIG.apiKey,
          modelName: result.modelName || DEFAULT_CONFIG.modelName,
          systemPrompt: result.systemPrompt || DEFAULT_CONFIG.systemPrompt,
          knowledgeBase: result.knowledgeBase || DEFAULT_CONFIG.knowledgeBase
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
    const englishChars = text.match(/[a-zA-Z]/g) || [];
    const totalChars = text.replace(/\s/g, '').length;
    return totalChars > 0 && (englishChars.length / totalChars) > 0.7;
  }

  // 调用 AI API（支持中止）
  async function callAI(config, comment, isRevision = false, revisionNote = '', progressCallback) {
    const isEng = isEnglish(comment);
    
    // 创建新的 AbortController
    currentAbortController = new AbortController();
    
    // 组合系统提示词
    let fullSystemPrompt = config.systemPrompt;
    if (config.knowledgeBase && config.knowledgeBase.trim()) {
      fullSystemPrompt += `\n\n---\n【产品知识库】\n${config.knowledgeBase}`;
    }

    let messages = [
      { role: 'system', content: fullSystemPrompt }
    ];

    if (isRevision && conversationHistory.length > 0) {
      messages = messages.concat(conversationHistory);
      messages.push({
        role: 'user',
        content: `请根据以下修改意见调整回复：\n\n修改意见：${revisionNote}\n\n请保持之前的输出格式。`
      });
    } else {
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
      messages.push({ role: 'user', content: userPrompt });
    }

    Logger.info('发送 API 请求', { 
      url: config.apiUrl, 
      model: config.modelName,
      commentLength: comment.length,
      isRevision 
    });

    if (progressCallback) progressCallback('请求发送中...');

    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: messages,
        temperature: 0.7
      }),
      signal: currentAbortController.signal
    });

    if (progressCallback) progressCallback('等待响应...');

    if (!response.ok) {
      const error = await response.text();
      Logger.error('API 请求失败', { status: response.status, error });
      throw new Error(`API 请求失败: ${response.status} - ${error}`);
    }

    if (progressCallback) progressCallback('解析响应...');

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    Logger.info('API 响应成功', { 
      responseLength: assistantMessage.length,
      usage: data.usage 
    });

    // 更新对话历史
    if (!isRevision) {
      conversationHistory = [
        messages[messages.length - 1],
        { role: 'assistant', content: assistantMessage }
      ];
    } else {
      conversationHistory.push(
        { role: 'user', content: `请根据以下修改意见调整回复：\n\n修改意见：${revisionNote}\n\n请保持之前的输出格式。` },
        { role: 'assistant', content: assistantMessage }
      );
    }

    return {
      content: assistantMessage,
      isEnglish: isEng
    };
  }

  // 中止当前请求
  function abortCurrentRequest() {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
      Logger.warn('用户中止了请求');
    }
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

  // 渲染日志内容
  function renderLogs(logContent) {
    const logs = Logger.logs;
    if (logs.length === 0) {
      logContent.innerHTML = '<div class="log-empty">暂无日志</div>';
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

  // 主初始化函数
  async function init() {
    Logger.info('插件初始化');
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
    const settingApiUrl = document.getElementById('setting-api-url');
    const settingApiKey = document.getElementById('setting-api-key');
    const settingModel = document.getElementById('setting-model');
    const settingPrompt = document.getElementById('setting-prompt');
    const settingKnowledge = document.getElementById('setting-knowledge');

    // 日志面板元素
    const logClose = document.getElementById('log-close');
    const logCloseBtn = document.getElementById('log-close-btn');
    const logClear = document.getElementById('log-clear');
    const logExport = document.getElementById('log-export');
    const logContent = document.getElementById('log-content');

    let currentComment = '';
    let currentIsEnglish = true;
    let isGenerating = false;

    // 监听文本选择
    document.addEventListener('mouseup', () => {
      const selection = window.getSelection().toString().trim();
      if (selection && selection.length > 0) {
        currentComment = selection;
        selectedCommentEl.textContent = selection;
        selectedCommentEl.classList.remove('empty');
        Logger.info('选中评论', { length: selection.length });
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
      settingKnowledge.value = config.knowledgeBase;
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
        systemPrompt: settingPrompt.value.trim(),
        knowledgeBase: settingKnowledge.value.trim()
      });
      Logger.info('设置已保存');
      showToast('设置已保存');
      closeSettings();
    });

    // 清除所有数据
    settingsClear.addEventListener('click', async () => {
      if (confirm('确定要清除所有数据吗？\n\n这将删除您保存的 API Key、API 地址、模型名称、提示词和知识库。\n\n此操作不可恢复！')) {
        await new Promise((resolve) => {
          chrome.storage.local.clear(resolve);
        });
        settingApiUrl.value = '';
        settingApiKey.value = '';
        settingModel.value = DEFAULT_CONFIG.modelName;
        settingPrompt.value = DEFAULT_CONFIG.systemPrompt;
        settingKnowledge.value = '';
        Logger.info('所有数据已清除');
        showToast('所有数据已清除');
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
      if (confirm('确定要清空所有日志吗？')) {
        Logger.clear();
        renderLogs(logContent);
        showToast('日志已清空');
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
      showToast('日志已导出');
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

      isGenerating = true;
      generateBtn.style.display = 'none';
      abortBtn.style.display = 'block';
      resultSection.style.display = 'block';
      copyBtn.style.display = 'none';
      revisionSection.style.display = 'none';
      revisionButtons.style.display = 'none';

      Progress.start(resultArea);

      try {
        const aiResponse = await callAI(config, currentComment, false, '', (status) => {
          Progress.update(status);
        });
        const elapsed = Progress.stop();
        currentIsEnglish = aiResponse.isEnglish;
        renderResult(resultArea, aiResponse);
        copyBtn.style.display = 'block';
        revisionSection.style.display = 'block';
        revisionButtons.style.display = 'flex';
        revisionInput.value = '';
        Logger.info('生成完成', { elapsed: elapsed + 's' });
      } catch (error) {
        Progress.stop();
        if (error.name === 'AbortError') {
          resultArea.innerHTML = `<div class="error-message">⏹️ 已停止生成</div>`;
        } else {
          Logger.error('生成失败', { error: error.message });
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
      showToast('已停止生成');
    });

    // 根据意见修改回复
    reviseBtn.addEventListener('click', async () => {
      const revisionNote = revisionInput.value.trim();
      if (!revisionNote) {
        showToast('请输入修改意见');
        return;
      }

      const config = await loadConfig();

      isGenerating = true;
      reviseBtn.disabled = true;
      reviseBtn.textContent = '修改中...';
      copyBtn.style.display = 'none';

      Progress.start(resultArea);

      try {
        const aiResponse = await callAI(config, currentComment, true, revisionNote, (status) => {
          Progress.update(status);
        });
        const elapsed = Progress.stop();
        renderResult(resultArea, aiResponse);
        copyBtn.style.display = 'block';
        revisionInput.value = '';
        Logger.info('修改完成', { elapsed: elapsed + 's' });
        showToast('回复已更新');
      } catch (error) {
        Progress.stop();
        if (error.name === 'AbortError') {
          resultArea.innerHTML = `<div class="error-message">⏹️ 已停止生成</div>`;
        } else {
          Logger.error('修改失败', { error: error.message });
          resultArea.innerHTML = `<div class="error-message">❌ ${error.message}</div>`;
        }
      } finally {
        isGenerating = false;
        reviseBtn.disabled = false;
        reviseBtn.textContent = '根据意见修改';
      }
    });

    // 复制回复
    copyBtn.addEventListener('click', async () => {
      const reply = getReplyContent(resultArea, currentIsEnglish);
      if (reply) {
        await navigator.clipboard.writeText(reply);
        Logger.info('复制回复');
        showToast('已复制到剪贴板');
        copyBtn.textContent = '已复制 ✓';
        copyBtn.classList.add('btn-success');
        setTimeout(() => {
          copyBtn.textContent = '复制回复';
          copyBtn.classList.remove('btn-success');
        }, 2000);
      }
    });

    Logger.info('插件初始化完成');
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
