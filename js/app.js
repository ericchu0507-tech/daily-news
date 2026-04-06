// ===== 分類設定 =====
const CATEGORIES = {
  all:           { label: '綜合',  icon: '🗞️' },
  finance:       { label: '財經',  icon: '💰' },
  entertainment: { label: '娛樂',  icon: '🎬' },
  sports:        { label: '體育',  icon: '⚽' },
  international: { label: '國際',  icon: '🌏' },
};

let currentCat = 'all';
let newsData = null;

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  renderDate();
  loadNews();
  setupTabs();
});

// ===== 顯示今日日期 =====
function renderDate() {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const w = weekdays[now.getDay()];
  document.getElementById('today-date').textContent = `${y}年${m}月${d}日 星期${w}`;
}

// ===== 載入新聞 JSON =====
async function loadNews() {
  try {
    // 加上時間戳避免瀏覽器 cache
    const res = await fetch(`data/news.json?t=${Date.now()}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    newsData = await res.json();
    showUpdateTime(newsData.updated);
    renderNews(currentCat);
  } catch (err) {
    console.error('載入失敗：', err);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
  }
}

// ===== 顯示更新時間 =====
function showUpdateTime(isoString) {
  const label = document.getElementById('update-label');
  if (!isoString) {
    label.textContent = '資料已載入';
    return;
  }
  const date = new Date(isoString);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  label.textContent = `今日 ${h}:${m} 更新`;
}

// ===== Tab 切換 =====
function setupTabs() {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      if (newsData) renderNews(currentCat);
    });
  });
}

// ===== 渲染新聞卡片 =====
function renderNews(cat) {
  const grid = document.getElementById('news-grid');
  const loading = document.getElementById('loading');
  const countEl = document.getElementById('news-count');

  loading.classList.add('hidden');
  grid.innerHTML = '';

  const items = newsData?.categories?.[cat] || [];
  countEl.classList.remove('hidden');
  countEl.textContent = `共 ${items.length} 則新聞`;

  if (items.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-muted)">此分類暫無新聞</div>`;
    return;
  }

  items.forEach((item, i) => {
    const card = createCard(item, cat, i + 1);
    grid.appendChild(card);
  });
}

// ===== 建立單張卡片 =====
function createCard(item, cat, index) {
  const a = document.createElement('a');
  a.className = 'news-card';
  a.dataset.cat = cat;
  a.href = item.link || '#';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';

  const timeStr = item.pubDate ? relativeTime(item.pubDate) : '';
  const desc = item.description
    ? stripHtml(item.description).slice(0, 120).trim()
    : '';

  a.innerHTML = `
    <span class="card-number">#${index}</span>
    <div class="card-meta">
      <span class="source-badge">${escHtml(item.source || '')}</span>
      <span class="card-time">${escHtml(timeStr)}</span>
    </div>
    <div class="card-title">${escHtml(item.title || '（無標題）')}</div>
    ${desc ? `<div class="card-desc">${escHtml(desc)}</div>` : ''}
    <span class="card-arrow">閱讀全文 →</span>
  `;

  return a;
}

// ===== 相對時間（中文）=====
function relativeTime(isoString) {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = now - then;

  if (isNaN(diff)) return '';
  if (diff < 60_000) return '剛剛';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分鐘前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小時前`;
  if (diff < 172_800_000) return '昨天';

  const d = new Date(isoString);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ===== 工具：去除 HTML tag =====
function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}

// ===== 工具：HTML 跳脫（防 XSS）=====
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
