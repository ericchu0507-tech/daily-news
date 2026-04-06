# daily-news — 每日新聞摘要

## 專案說明
自動抓取台灣、美國、國際新聞 RSS，每天台灣時間 07:00 透過 GitHub Actions 更新，部署在 GitHub Pages。同時顯示美股大盤股價（S&P 500、NASDAQ、道瓊、台灣加權）與舊金山灣區天氣。

## Live URL
https://ericchu0507-tech.github.io/daily-news/

## 技術架構
- **前端**：純 HTML + CSS + JS（無框架）
- **抓取腳本**：Node.js（`scripts/fetch-news.js`、`scripts/fetch-stocks.js`）
- **套件**：`rss-parser`（新聞）；股價使用 Yahoo Finance 非官方 API（Node 22 內建 fetch）；天氣使用 Open-Meteo（前端直接呼叫，免費無需 key）
- **自動化**：GitHub Actions（`.github/workflows/fetch-news.yml`）
- **資料格式**：`data/news.json`、`data/stocks.json`
- **部署**：GitHub Pages（main branch）

## 資料流
```
GitHub Actions (cron: 每天 UTC 23:00 = 台灣 07:00，美股收盤後)
    → scripts/fetch-news.js  → data/news.json  (7 天滾動視窗)
    → scripts/fetch-stocks.js → data/stocks.json (當日收盤價)
    → git commit & push
    → GitHub Pages 自動更新

天氣：前端頁面載入時直接呼叫 Open-Meteo API（不經 Actions）
```

## 新聞分類與 RSS 來源
| 分類 | 來源 |
|------|------|
| 🇹🇼 台灣 | 自由時報、ETtoday |
| 🇺🇸 美國 | BBC中文、RFI中文 |
| 🌏 國際 | BBC中文、自由國際 |
| 💰 財經 | 自由財經、鉅亨網 |
| 💻 科技 | iThome、科技新報 |
| 🎬 娛樂 | 自由娛樂、ETtoday娛樂 |
| ⚽ 體育 | 自由體育、ETtoday體育 |

三個地區分類（台灣/美國/國際）內容可以重疊，這是設計上的預期行為。

## 股價顯示（data/stocks.json）
- S&P 500、NASDAQ、道瓊、台灣加權
- 由 `scripts/fetch-stocks.js` 每日抓取 Yahoo Finance
- 顯示收盤價 + 漲跌幅（綠漲紅跌）

## 天氣顯示
- 舊金山灣區（lat 37.7749, lon -122.4194）
- 使用 Open-Meteo 免費 API，前端直接 fetch，不需 API key
- 顯示攝氏溫度 + WMO 天氣代碼對應 emoji

## 功能特色
- **今日 / 本週** 切換（7 天滾動資料）
- **Skeleton loading**（卡片載入動畫）
- **Featured card**（第一則新聞佔 2 欄，視覺突出）
- **卡片進場動畫**（fadeUp stagger）
- **分類切換淡出動畫**
- **RWD**：桌面 3 欄、平板 2 欄、手機 1 欄

## 檔案結構
```
daily-news/
├── index.html
├── css/style.css               ← 淺色主題設計
├── js/app.js                   ← 前端邏輯
├── scripts/
│   ├── fetch-news.js           ← RSS 抓取（7 天滾動）
│   └── fetch-stocks.js        ← 股價抓取
├── data/
│   ├── news.json               ← 自動產生，勿手動編輯
│   └── stocks.json             ← 自動產生，勿手動編輯
├── package.json
└── .github/workflows/
    └── fetch-news.yml
```

## 注意事項
- `data/` 下的 JSON 由 GitHub Actions 自動產生，不要手動編輯
- 新增 RSS 來源：修改 `scripts/fetch-news.js` 的 `SOURCES` 物件
- 新增股票：修改 `scripts/fetch-stocks.js` 的 `STOCKS` 陣列
- Node.js 版本：22.x
