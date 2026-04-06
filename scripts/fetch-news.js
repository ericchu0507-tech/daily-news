// fetch-news.js
// 每天由 GitHub Actions 執行，抓 RSS → 存成 data/news.json
// 執行方式：node scripts/fetch-news.js

const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DailyNews/1.0)' },
});

// ===== RSS 來源設定 =====
// 若某個 URL 失效，把它刪掉或換成新的即可
const SOURCES = {
  all: [
    { name: '自由時報', url: 'https://news.ltn.com.tw/rss/all.xml' },
    { name: 'ETtoday',  url: 'https://feeds.feedburner.com/ettoday/news' },
  ],
  finance: [
    { name: '自由財經', url: 'https://news.ltn.com.tw/rss/business.xml' },
    { name: '鉅亨網',   url: 'https://news.cnyes.com/rss/api/news/id/headline' },
  ],
  entertainment: [
    { name: '自由娛樂',    url: 'https://news.ltn.com.tw/rss/entertainment.xml' },
    { name: 'ETtoday娛樂', url: 'https://feeds.feedburner.com/ettoday/entertainment' },
  ],
  sports: [
    { name: '自由體育',    url: 'https://news.ltn.com.tw/rss/sports.xml' },
    { name: 'ETtoday體育', url: 'https://feeds.feedburner.com/ettoday/sports' },
  ],
  international: [
    { name: 'BBC中文',  url: 'https://feeds.bbci.co.uk/zhongwen/trad/rss.xml' },
    { name: '自由國際', url: 'https://news.ltn.com.tw/rss/world.xml' },
  ],
};

const TOP_N = 10; // 每分類取前幾則

// ===== 抓單一 RSS Feed =====
async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || []).slice(0, 20).map(item => ({
      title:       (item.title || '').trim(),
      link:        item.link || item.guid || '',
      source:      source.name,
      pubDate:     item.isoDate || item.pubDate || '',
      description: (item.contentSnippet || item.content || item.summary || '').trim(),
    }));
    console.log(`  ✓ ${source.name} — ${items.length} 則`);
    return items;
  } catch (err) {
    console.warn(`  ✗ ${source.name} 失敗：${err.message}`);
    return [];
  }
}

// ===== 排序（最新優先）=====
function sortByDate(items) {
  return [...items].sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });
}

// ===== 主流程 =====
async function main() {
  console.log('📰 開始抓取新聞...\n');
  const result = { updated: new Date().toISOString(), categories: {} };

  for (const [cat, sources] of Object.entries(SOURCES)) {
    console.log(`[${cat}]`);
    const allItems = [];

    for (const source of sources) {
      const items = await fetchFeed(source);
      allItems.push(...items);
    }

    const sorted = sortByDate(allItems);
    result.categories[cat] = sorted.slice(0, TOP_N);
    console.log(`  → 保留前 ${result.categories[cat].length} 則\n`);
  }

  // 寫入 JSON
  const outPath = path.join(__dirname, '..', 'data', 'news.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`✅ 完成！已寫入 data/news.json`);
  console.log(`   更新時間：${result.updated}`);
}

main().catch(err => {
  console.error('❌ 執行失敗：', err);
  process.exit(1);
});
