// ════════════════════════════════════
// STATE
// ════════════════════════════════════
let watchlist = [];
let journalEntries = [];
let selectedEmo = '';
let totalShares = 0;
let entryPrice = 0;
let riskDollar = 0;
let liveData = {};

// ════════════════════════════════════
// TABS
// ════════════════════════════════════
function switchTab(n, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + n).classList.add('active');
  el.classList.add('active');
  document.getElementById('h-step').textContent = n;
}

// ════════════════════════════════════
// YAHOO FINANCE FETCH — multi-proxy fallback
// ════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// LAYER 0: CONSTANTS & SAMPLE DATA
// ════════════════════════════════════════════════════════════════
const API_BASE = 'https://its-pro.onrender.com';

const SAMPLE_DATA = {
  AAPL: { price:211.50, change_pct:0.44, rsi14:58.2, atr14:4.21, ema21:208.10, ema50:205.30, ema200:196.40, vol_ratio:1.12, high_52w:237.23, low_52w:164.08, dist_from_52h:10.8, prev_close:210.58, avg_vol:52000000, cur_vol:58000000, sector:'Technology', short_term:'bullish', long_term:'bullish', regime:'strong_uptrend', ema_align:3 },
  AMZN: { price:212.80, change_pct:1.20, rsi14:64.5, atr14:5.80, ema21:208.50, ema50:201.20, ema200:188.60, vol_ratio:1.35, high_52w:242.52, low_52w:151.61, dist_from_52h:12.2, prev_close:210.28, avg_vol:38000000, cur_vol:51000000, sector:'Consumer Discretionary', short_term:'bullish', long_term:'bullish', regime:'strong_uptrend', ema_align:3 },
  GOOG: { price:172.40, change_pct:0.85, rsi14:61.3, atr14:4.10, ema21:169.20, ema50:165.80, ema200:158.30, vol_ratio:0.95, high_52w:207.05, low_52w:140.53, dist_from_52h:16.7, prev_close:170.93, avg_vol:22000000, cur_vol:20900000, sector:'Technology', short_term:'bullish', long_term:'bullish', regime:'strong_uptrend', ema_align:3 },
  META: { price:584.50, change_pct:1.55, rsi14:66.8, atr14:14.20, ema21:570.10, ema50:548.30, ema200:498.20, vol_ratio:1.28, high_52w:638.40, low_52w:390.93, dist_from_52h:8.5, prev_close:575.62, avg_vol:14000000, cur_vol:17920000, sector:'Technology', short_term:'bullish', long_term:'bullish', regime:'strong_uptrend', ema_align:3 },
  TSLA: { price:284.80, change_pct:-1.20, rsi14:52.1, atr14:12.50, ema21:280.30, ema50:272.10, ema200:248.60, vol_ratio:1.05, high_52w:414.50, low_52w:138.80, dist_from_52h:31.2, prev_close:288.22, avg_vol:82000000, cur_vol:86100000, sector:'Consumer Discretionary', short_term:'bullish', long_term:'bullish', regime:'strong_uptrend', ema_align:3 },
  NVDA: { price:876.40, change_pct:2.10, rsi14:71.2, atr14:28.50, ema21:848.20, ema50:810.30, ema200:682.10, vol_ratio:1.62, high_52w:974.00, low_52w:462.36, dist_from_52h:10.0, prev_close:858.22, avg_vol:42000000, cur_vol:67920000, sector:'Technology', short_term:'bullish', long_term:'bullish', regime:'strong_uptrend', ema_align:3 },
  AMD:  { price:158.30, change_pct:0.65, rsi14:55.4, atr14:6.20, ema21:155.10, ema50:150.80, ema200:148.20, vol_ratio:0.88, high_52w:227.30, low_52w:122.17, dist_from_52h:30.3, prev_close:157.28, avg_vol:48000000, cur_vol:42240000, sector:'Technology', short_term:'bullish', long_term:'bullish', regime:'strong_uptrend', ema_align:3 },
  INTC: { price:22.10, change_pct:-0.45, rsi14:38.2, atr14:0.92, ema21:23.40, ema50:25.10, ema200:30.20, vol_ratio:0.72, high_52w:46.45, low_52w:18.51, dist_from_52h:52.4, prev_close:22.20, avg_vol:62000000, cur_vol:44640000, sector:'Technology', short_term:'bearish', long_term:'bearish', regime:'downtrend', ema_align:0 },
  DUOL: { price:348.20, change_pct:1.85, rsi14:68.4, atr14:12.80, ema21:338.50, ema50:318.20, ema200:268.40, vol_ratio:1.42, high_52w:388.90, low_52w:152.57, dist_from_52h:10.5, prev_close:341.84, avg_vol:1800000, cur_vol:2556000, sector:'Technology', short_term:'bullish', long_term:'bullish', regime:'strong_uptrend', ema_align:3 },
};