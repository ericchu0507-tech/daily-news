// fetch-stocks.js
// 每天由 GitHub Actions 執行，抓大盤股價 → 存成 data/stocks.json
// Node 22 內建 fetch，不需要額外套件

const fs   = require('fs');
const path = require('path');

const STOCKS = [
  { symbol: '^GSPC', name: 'S&P 500', short: 'SPX' },
  { symbol: '^IXIC', name: 'NASDAQ',  short: 'NDQ' },
  { symbol: '^DJI',  name: '道瓊',    short: 'DJI' },
  { symbol: '^TWII', name: '台灣加權', short: 'TWI' },
];

async function fetchStock(stock) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stock.symbol)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DailyNews/1.0)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data   = await res.json();
  const result = data.chart?.result?.[0];
  if (!result) throw new Error('無資料');

  const closes     = result.indicators?.quote?.[0]?.close || [];
  const validClose = closes.filter(c => c != null);
  if (validClose.length < 2) throw new Error('資料不足');

  const price     = validClose[validClose.length - 1];
  const prev      = validClose[validClose.length - 2];
  const change    = price - prev;
  const changePct = (change / prev) * 100;

  return {
    ...stock,
    price:     +price.toFixed(2),
    change:    +change.toFixed(2),
    changePct: +changePct.toFixed(2),
  };
}

async function main() {
  console.log('📈 開始抓取股價...\n');
  const results = [];

  for (const stock of STOCKS) {
    try {
      const data = await fetchStock(stock);
      results.push(data);
      const sign = data.changePct >= 0 ? '+' : '';
      console.log(`  ✓ ${data.name}: ${data.price.toLocaleString()} (${sign}${data.changePct}%)`);
    } catch (err) {
      console.warn(`  ✗ ${stock.name} 失敗：${err.message}`);
    }
  }

  const outPath = path.join(__dirname, '..', 'data', 'stocks.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ updated: new Date().toISOString(), stocks: results }, null, 2), 'utf-8');
  console.log('\n✅ 完成！已寫入 data/stocks.json');
}

main().catch(err => {
  console.error('❌ 執行失敗：', err);
  process.exit(1);
});
