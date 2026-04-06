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

// 每個時段最多顯示幾則（精選 digest 風格）
const LIMIT = { today: 5, week: 10 };

// WMO 天氣代碼
const WEATHER_ICONS = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌦️',
  61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'❄️', 73:'❄️', 75:'❄️', 77:'🌨️',
  80:'🌧️', 81:'🌧️', 82:'⛈️',
  95:'⛈️', 96:'⛈️', 99:'⛈️',
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

function renderDate() {
  const weekdays = ['日','一','二','三','四','五','六'];
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

// ===== 載入股價 =====
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
  if (!stocks.length) {
    ticker.innerHTML = '<span class="ticker-label">📈</span><span class="ticker-loading">股價暫無資料</span>';
    return;
  }
  const parts = stocks.map((s, i) => {
    const up   = s.changePct >= 0;
    const sign = up ? '+' : '';
    const div  = i < stocks.length - 1 ? '<span class="stock-divider">·</span>' : '';
    return `<span class="stock-item">
      <span class="stock-name">${escHtml(s.name)}</span>
      <span class="stock-price">${s.price.toLocaleString()}</span>
      <span class="stock-change ${up ? 'up' : 'down'}">${sign}${s.changePct}%</span>
    </span>${div}`;
  });
  ticker.innerHTML = '<span class="ticker-label">📈</span>' + parts.join('');
}

// ===== 載入灣區天氣 =====
async function loadWeather() {
  const widget = document.getElementById('weather-widget');
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&current=temperature_2m,weather_code&timezone=America%2FLos_Angeles';
    const res  = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const temp = Math.round(data.current.temperature_2m);
    const icon = WEATHER_ICONS[data.current.weather_code] || '🌡️';
    widget.innerHTML = `<span>${icon}</span><span class="weather-temp">${temp}°C</span><span class="weather-city">灣區</span>`;
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

function switchView() {
  const grid = document.getElementById('news-grid');
  grid.classList.add('fading');
  setTimeout(() => { grid.classList.remove('fading'); renderNews(); }, 180);
}

// ===== 日期過濾 + 數量限制 =====
function filterArticles(items) {
  const cutoff = currentPeriod === 'today'
    ? Date.now() - 24 * 60 * 60 * 1000
    : Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filtered = items.filter(item => {
    if (!item.pubDate) return currentPeriod === 'week';
    return new Date(item.pubDate).getTime() > cutoff;
  });
  return filtered.slice(0, LIMIT[currentPeriod]);
}

// ===== 渲染新聞 =====
function renderNews() {
  const grid    = document.getElementById('news-grid');
  const countEl = document.getElementById('news-count');
  const emptyEl = document.getElementById('empty');

  grid.innerHTML = '';
  emptyEl.classList.add('hidden');

  const allItems = newsData?.categories?.[currentCat] || [];
  const items    = filterArticles(allItems);

  if (!items.length) {
    countEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    return;
  }

  const label = currentPeriod === 'today' ? '今日精選' : '本週精選';
  countEl.classList.remove('hidden');
  countEl.textContent = `${label} · ${items.length} 則`;

  items.forEach(item => grid.appendChild(createCard(item, currentCat)));
}

// ===== 建立卡片（digest 風格，內容在頁面上顯示）=====
function createCard(item, cat) {
  const card = document.createElement('div');
  card.className = 'news-card';
  card.dataset.cat = cat;

  const icon     = CATEGORIES[cat]?.icon || '📰';
  const hasImage = !!item.image;
  const timeStr  = item.pubDate ? relativeTime(item.pubDate) : '';
  const desc     = item.description ? stripHtml(item.description) : '';

  card.innerHTML = `
    <div class="card-banner ${hasImage ? 'has-image' : ''}">
      ${hasImage ? `<img class="banner-img" src="${escHtml(item.image)}" alt="" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.remove('has-image')">` : ''}
      <span class="banner-emoji">${icon}</span>
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span class="source-badge">${escHtml(item.source || '')}</span>
        <span class="card-time">${escHtml(timeStr)}</span>
      </div>
      <div class="card-title">${escHtml(item.title || '（無標題）')}</div>
      ${desc ? `<div class="card-desc">${escHtml(desc)}</div>` : ''}
      ${item.link ? `
      <div class="card-footer">
        <a class="card-link" href="${escHtml(item.link)}" target="_blank" rel="noopener noreferrer">
          原文連結 ↗
        </a>
      </div>` : ''}
    </div>
  `;

  return card;
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

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
