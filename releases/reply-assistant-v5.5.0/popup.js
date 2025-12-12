// Reply Assistant Popup Script

const PRESET_PLATFORMS = [
  { id: 'meta', name: 'Meta Business Suite', domain: 'business.facebook.com' },
  { id: 'instagram', name: 'Instagram', domain: 'instagram.com' },
  { id: 'youtube', name: 'YouTube Studio', domain: 'studio.youtube.com' },
  { id: 'tiktok', name: 'TikTok Business', domain: 'business.tiktok.com' },
  { id: 'twitter', name: 'Twitter/X', domain: 'twitter.com' },
  { id: 'amazon', name: 'Amazon Seller', domain: 'sellercentral.amazon.com' },
  { id: 'shopify', name: 'Shopify Admin', domain: 'admin.shopify.com' }
];

let currentTab = null;
let currentDomain = '';

// 获取当前标签页
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// 从 URL 提取域名
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

// 加载配置
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apis', 'platforms', 'customPlatforms'], (result) => {
      resolve({
        apis: result.apis || [],
        platforms: result.platforms || {},
        customPlatforms: result.customPlatforms || []
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

// 匹配平台
function matchPlatform(config, hostname) {
  const allPlatforms = [...PRESET_PLATFORMS, ...(config.customPlatforms || [])];
  for (const platform of allPlatforms) {
    if (hostname.includes(platform.domain)) {
      return platform;
    }
  }
  return null;
}

// 发送消息到 content script
async function sendMessage(action, data = {}) {
  if (!currentTab?.id) return;
  try {
    await chrome.tabs.sendMessage(currentTab.id, { action, ...data });
  } catch (e) {
    console.log('Could not send message to content script:', e);
  }
}

// 初始化
async function init() {
  currentTab = await getCurrentTab();
  
  if (!currentTab?.url) {
    document.getElementById('current-domain').textContent = 'Unable to detect';
    return;
  }
  
  currentDomain = extractDomain(currentTab.url);
  document.getElementById('current-domain').textContent = currentDomain;
  
  const config = await loadConfig();
  const platform = matchPlatform(config, currentDomain);
  
  if (platform) {
    // 已配置
    document.getElementById('status-configured').classList.remove('hidden');
    document.getElementById('platform-name').textContent = platform.name;
    document.getElementById('btn-open-panel').textContent = 'Open Reply Panel';
  } else {
    // 未配置
    document.getElementById('status-not-configured').classList.remove('hidden');
    document.getElementById('add-section').classList.remove('hidden');
    document.getElementById('btn-open-panel').textContent = 'Open Reply Panel';
  }
}

// 打开面板
document.getElementById('btn-open-panel').addEventListener('click', async () => {
  await sendMessage('togglePanel', { show: true });
  window.close();
});

// 添加当前网站
document.getElementById('btn-add-site').addEventListener('click', async () => {
  const config = await loadConfig();
  
  // 创建新的自定义平台
  const id = 'custom_' + Date.now();
  const name = currentDomain.replace(/^www\./, '').split('.')[0];
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  
  const newPlatform = {
    id,
    name: capitalizedName,
    domain: currentDomain
  };
  
  config.customPlatforms = config.customPlatforms || [];
  config.customPlatforms.push(newPlatform);
  
  await saveConfig(config);
  
  // 刷新页面显示
  document.getElementById('status-not-configured').classList.add('hidden');
  document.getElementById('add-section').classList.add('hidden');
  document.getElementById('status-configured').classList.remove('hidden');
  document.getElementById('platform-name').textContent = capitalizedName;
  
  // 通知 content script 刷新
  await sendMessage('refreshPlatform');
});

// 打开设置
document.getElementById('btn-settings').addEventListener('click', async () => {
  await sendMessage('openSettings');
  window.close();
});

// 初始化
init();

// 署名信息按钮
document.getElementById('credits-info-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('credits-detail').classList.toggle('show');
});

document.addEventListener('click', (e) => {
  const detail = document.getElementById('credits-detail');
  const btn = document.getElementById('credits-info-btn');
  if (!detail.contains(e.target) && e.target !== btn) {
    detail.classList.remove('show');
  }
});
