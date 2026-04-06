// ===== 分類設定 =====
const CATEGORIES = {
  taiwan:        { label: '台灣', icon: '🇹🇼' },
  usa:           { label: '美國', icon: '🇺🇸' },
  international: { label: '國際', icon: '🌏' },
  finance:       { label: '財經', icon: '💰' },
  tech:          { label: '科技', icon: '💻' },
  entertainment: { label: '娛樂', icon: '🎬' },
  sports:        { label: '體育', icon: '⚽' },
};

// WMO 天氣代碼對應
const WEATHER_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️', 77: '🌨️',
  80: '🌧️', 81: '🌧️', 82: '⛈️',
  85: '🌨️', 86: '🌨️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

let currentCat    = 'taiwan';
let currentPeriod = 'today';
let newsData      = null;

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  renderDate();
  loadNews();
  loadStocks();
  loadWeather();
  setupTabs();
  setupPeriod();
});

// ===== 今日日期 =====
function renderDate() {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const now = new Date();
  document.getElementById('today-date').textContent =
    `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
}

// ===== 載入新聞 =====
async function loadNews() {
  try {
    const res = await fetch(`data/news.json?t=${Date.now()}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    newsData = await res.json();
    showUpdateTime(newsData.updated);
    document.getElementById('loading').classList.add('hidden');
    renderNews();
  } catch (err) {
    console.error('新聞載入失敗：', err);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
  }
}

function showUpdateTime(isoString) {
  const label = document.getElementById('update-label');
  if (!isoString) { label.textContent = '資料已載入'; return; }
  const d = new Date(isoString);
  label.textContent = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} 更新`;
}

// ===== 載入股價（從 GitHub Actions 產生的 stocks.json）=====
async function loadStocks() {
  const ticker = document.getElementById('stock-ticker');
  try {
    const res = await fetch(`data/stocks.json?t=${Date.now()}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    renderStocks(data.stocks || []);
  } catch (_) {
    ticker.innerHTML = '<span class="ticker-label">📈</span><span class="ticker-loading">股價暫無資料</span>';
  }
}

function renderStocks(stocks) {
  const ticker = document.getElementById('stock-ticker');
  if (stocks.length === 0) {
    ticker.innerHTML = '<span class="ticker-label">📈</span><span class="ticker-loading">股價暫無資料</span>';
    return;
  }

  const parts = stocks.map((s, i) => {
    const up   = s.changePct >= 0;
    const sign = up ? '+' : '';
    const cls  = up ? 'up' : 'down';
    const divider = i < stocks.length - 1 ? '<span class="stock-divider">·</span>' : '';
    return `
      <span class="stock-item">
        <span class="stock-name">${escHtml(s.name)}</span>
        <span class="stock-price">${s.price.toLocaleString()}</span>
        <span class="stock-change ${cls}">${sign}${s.changePct}%</span>
      </span>${divider}
    `;
  });

  ticker.innerHTML = '<span class="ticker-label">📈</span>' + parts.join('');
}

// ===== 載入灣區天氣（Open-Meteo，免費無需 API key）=====
async function loadWeather() {
  const widget = document.getElementById('weather-widget');
  try {
    // San Francisco Bay Area: lat 37.7749, lon -122.4194
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&current=temperature_2m,weather_code&timezone=America%2FLos_Angeles';
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    const temp    = Math.round(data.current.temperature_2m);
    const code    = data.current.weather_code;
    const icon    = WEATHER_ICONS[code] || '🌡️';

    widget.innerHTML = `
      <span class="weather-icon">${icon}</span>
      <span class="weather-temp">${temp}°C</span>
      <span class="weather-city">灣區</span>
    `;
  } catch (_) {
    widget.innerHTML = '<span class="weather-loading">天氣暫無資料</span>';
  }
}

// ===== 分類 Tab =====
function setupTabs() {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      if (newsData) switchView();
    });
  });
}

// ===== 今日 / 本週 =====
function setupPeriod() {
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      if (newsData) switchView();
    });
  });
}

// ===== 切換（淡出動畫）=====
function switchView() {
  const grid = document.getElementById('news-grid');
  grid.classList.add('fading');
  setTimeout(() => {
    grid.classList.remove('fading');
    renderNews();
  }, 180);
}

// ===== 日期過濾 =====
function filterByPeriod(items) {
  const cutoff = currentPeriod === 'today'
    ? Date.now() - 24 * 60 * 60 * 1000
    : Date.now() - 7 * 24 * 60 * 60 * 1000;
  return items.filter(item => {
    if (!item.pubDate) return currentPeriod === 'week';
    return new Date(item.pubDate).getTime() > cutoff;
  });
}

// ===== 渲染新聞 =====
function renderNews() {
  const grid    = document.getElementById('news-grid');
  const countEl = document.getElementById('news-count');
  const emptyEl = document.getElementById('empty');

  grid.innerHTML = '';
  emptyEl.classList.add('hidden');

  const allItems = newsData?.categories?.[currentCat] || [];
  const items    = filterByPeriod(allItems);

  if (items.length === 0) {
    countEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    return;
  }

  const label = currentPeriod === 'today' ? '今日' : '本週';
  countEl.classList.remove('hidden');
  countEl.textContent = `${label} · 共 ${items.length} 則`;

  items.forEach((item, i) => {
    grid.appendChild(createCard(item, currentCat, i === 0));
  });
}

// ===== 建立卡片 =====
function createCard(item, cat, featured) {
  const a = document.createElement('a');
  a.className = 'news-card' + (featured ? ' featured' : '');
  a.dataset.cat = cat;
  a.href = item.link || '#';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';

  const timeStr = item.pubDate ? relativeTime(item.pubDate) : '';

  a.innerHTML = `
    <div class="card-meta">
      <span class="source-badge">${escHtml(item.source || '')}</span>
      <span class="card-time">${escHtml(timeStr)}</span>
    </div>
    <div class="card-title">${escHtml(item.title || '（無標題）')}</div>
    <span class="card-arrow">閱讀全文 →</span>
  `;

  return a;
}

// ===== 相對時間 =====
function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  if (isNaN(diff)) return '';
  if (diff < 60_000)      return '剛剛';
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)} 分鐘前`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)} 小時前`;
  if (diff < 172_800_000) return '昨天';
  const d = new Date(isoString);
  return `${d.getMonth()+1}/${d.getDate()}`;
}

// ===== 防 XSS =====
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
