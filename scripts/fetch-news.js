// fetch-news.js
// 每天由 GitHub Actions 執行，抓 RSS → 合併 7 天滾動視窗 → 存成 data/news.json

const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DailyNews/1.0)' },
});

// ===== RSS 來源設定 =====
const SOURCES = {
  taiwan: [
    { name: '自由時報', url: 'https://news.ltn.com.tw/rss/all.xml' },
    { name: 'ETtoday',  url: 'https://feeds.feedburner.com/ettoday/news' },
  ],
  usa: [
    { name: 'BBC中文',  url: 'https://feeds.bbci.co.uk/zhongwen/trad/rss.xml' },
    { name: 'RFI中文',  url: 'https://www.rfi.fr/cn/rss' },
  ],
  international: [
    { name: 'BBC中文',  url: 'https://feeds.bbci.co.uk/zhongwen/trad/rss.xml' },
    { name: '自由國際', url: 'https://news.ltn.com.tw/rss/world.xml' },
  ],
  finance: [
    { name: '自由財經', url: 'https://news.ltn.com.tw/rss/business.xml' },
    { name: '鉅亨網',   url: 'https://news.cnyes.com/rss/api/news/id/headline' },
  ],
  tech: [
    { name: 'iThome',  url: 'https://www.ithome.com.tw/rss' },
    { name: '科技新報', url: 'https://technews.tw/feed/' },
  ],
  entertainment: [
    { name: '自由娛樂',    url: 'https://news.ltn.com.tw/rss/entertainment.xml' },
    { name: 'ETtoday娛樂', url: 'https://feeds.feedburner.com/ettoday/entertainment' },
  ],
  sports: [
    { name: '自由體育',    url: 'https://news.ltn.com.tw/rss/sports.xml' },
    { name: 'ETtoday體育', url: 'https://feeds.feedburner.com/ettoday/sports' },
  ],
};

const MAX_PER_SOURCE = 30;
const DAYS_TO_KEEP   = 7;

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || []).slice(0, MAX_PER_SOURCE).map(item => ({
      title:   (item.title || '').trim(),
      link:    item.link || item.guid || '',
      source:  source.name,
      pubDate: item.isoDate || item.pubDate || '',
      description: (item.contentSnippet || item.content || item.summary || '').trim(),
    }));
    console.log(`  ✓ ${source.name} — ${items.length} 則`);
    return items;
  } catch (err) {
    console.warn(`  ✗ ${source.name} 失敗：${err.message}`);
    return [];
  }
}

function sortByDate(items) {
  return [...items].sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });
}

async function main() {
  console.log('📰 開始抓取新聞（7 天滾動視窗）...\n');

  const outPath = path.join(__dirname, '..', 'data', 'news.json');

  let existing = { categories: {} };
  try {
    existing = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    console.log('📂 載入既有資料成功\n');
  } catch (_) {
    console.log('📂 無既有資料，從零開始\n');
  }

  const cutoffMs = Date.now() - DAYS_TO_KEEP * 24 * 60 * 60 * 1000;
  const result   = { updated: new Date().toISOString(), categories: {} };

  for (const [cat, sources] of Object.entries(SOURCES)) {
    console.log(`[${cat}]`);

    const fresh = [];
    for (const source of sources) {
      fresh.push(...await fetchFeed(source));
    }

    const old = (existing.categories?.[cat] || [])
      .filter(a => a.pubDate && new Date(a.pubDate).getTime() > cutoffMs);

    const freshLinks = new Set(fresh.map(a => a.link).filter(Boolean));
    const merged = [...fresh, ...old.filter(a => a.link && !freshLinks.has(a.link))];

    result.categories[cat] = sortByDate(merged);
    console.log(`  → 共 ${result.categories[cat].length} 則（含 ${old.length} 則歷史）\n`);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`✅ 完成！已寫入 data/news.json`);
  console.log(`   更新時間：${result.updated}`);
}

main().catch(err => {
  console.error('❌ 執行失敗：', err);
  process.exit(1);
});
