// ════════════════════════════════════════════════════════════════
// LAYER 1: DATA LAYER
// ════════════════════════════════════════════════════════════════

function normalizeTicker(input) {
  const t = (input || '').trim().toUpperCase();
  const map = {
    'GOOGLE':'GOOG','ALPHABET':'GOOG','TESLA':'TSLA',
    'FACEBOOK':'META','META PLATFORMS':'META',
    'AMAZON':'AMZN','APPLE':'AAPL','NVIDIA':'NVDA',
    'INTEL':'INTC','MICROSOFT':'MSFT','NETFLIX':'NFLX',
  };
  return map[t] || t;
}

// Returns: 'open' | 'closed' | 'pre' | 'after'
function getMarketStatus() {
  const now = new Date();
  // Convert to US Eastern Time
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay(); // 0=Sun, 6=Sat
  const h = et.getHours();
  const m = et.getMinutes();
  const mins = h * 60 + m;
  if (day === 0 || day === 6) return 'closed';
  if (mins >= 570 && mins < 960) return 'open';    // 9:30–16:00
  if (mins >= 240 && mins < 570) return 'pre';     // 4:00–9:30
  if (mins >= 960 && mins < 1200) return 'after';  // 16:00–20:00
  return 'closed';
}

function buildStockResult(d, ticker, source) {
  return {
    success: true, source, raw: d, ticker,
    price: d.price, changePercent: d.change_pct,
    rsi: d.rsi14, atr: d.atr14,
    ema21: d.ema21, ema50: d.ema50, ema200: d.ema200,
    volRatio: d.vol_ratio, avgVol: d.avg_vol, curVol: d.cur_vol,
    high52: d.high_52w, low52: d.low_52w, distFrom52h: d.dist_from_52h,
    prevClose: d.prev_close, sector: d.sector,
    shortTerm: d.short_term === 'bullish' ? 'BULL' : 'BEAR',
    longTerm:  d.long_term  === 'bullish' ? 'BULL' : 'BEAR',
    regime: d.regime || 'unknown', emaAlign: d.ema_align ?? 0,
  };
}

// Inline fallback — works even if config.js loads late
const FALLBACK_SAMPLE = {
  AAPL:{price:211.50,change_pct:0.44,rsi14:58.2,atr14:4.21,ema21:208.10,ema50:205.30,ema200:196.40,vol_ratio:1.12,high_52w:237.23,low_52w:164.08,dist_from_52h:10.8,prev_close:210.58,avg_vol:52000000,cur_vol:58000000,sector:'Technology',short_term:'bullish',long_term:'bullish',regime:'strong_uptrend',ema_align:3},
  AMZN:{price:212.80,change_pct:1.20,rsi14:64.5,atr14:5.80,ema21:208.50,ema50:201.20,ema200:188.60,vol_ratio:1.35,high_52w:242.52,low_52w:151.61,dist_from_52h:12.2,prev_close:210.28,avg_vol:38000000,cur_vol:51000000,sector:'Consumer Discretionary',short_term:'bullish',long_term:'bullish',regime:'strong_uptrend',ema_align:3},
  GOOG:{price:172.40,change_pct:0.85,rsi14:61.3,atr14:4.10,ema21:169.20,ema50:165.80,ema200:158.30,vol_ratio:0.95,high_52w:207.05,low_52w:140.53,dist_from_52h:16.7,prev_close:170.93,avg_vol:22000000,cur_vol:20900000,sector:'Technology',short_term:'bullish',long_term:'bullish',regime:'strong_uptrend',ema_align:3},
  META:{price:584.50,change_pct:1.55,rsi14:66.8,atr14:14.20,ema21:570.10,ema50:548.30,ema200:498.20,vol_ratio:1.28,high_52w:638.40,low_52w:390.93,dist_from_52h:8.5,prev_close:575.62,avg_vol:14000000,cur_vol:17920000,sector:'Technology',short_term:'bullish',long_term:'bullish',regime:'strong_uptrend',ema_align:3},
  TSLA:{price:284.80,change_pct:-1.20,rsi14:52.1,atr14:12.50,ema21:280.30,ema50:272.10,ema200:248.60,vol_ratio:1.05,high_52w:414.50,low_52w:138.80,dist_from_52h:31.2,prev_close:288.22,avg_vol:82000000,cur_vol:86100000,sector:'Consumer Discretionary',short_term:'bullish',long_term:'bullish',regime:'strong_uptrend',ema_align:3},
  NVDA:{price:876.40,change_pct:2.10,rsi14:71.2,atr14:28.50,ema21:848.20,ema50:810.30,ema200:682.10,vol_ratio:1.62,high_52w:974.00,low_52w:462.36,dist_from_52h:10.0,prev_close:858.22,avg_vol:42000000,cur_vol:67920000,sector:'Technology',short_term:'bullish',long_term:'bullish',regime:'strong_uptrend',ema_align:3},
  AMD: {price:158.30,change_pct:0.65,rsi14:55.4,atr14:6.20,ema21:155.10,ema50:150.80,ema200:148.20,vol_ratio:0.88,high_52w:227.30,low_52w:122.17,dist_from_52h:30.3,prev_close:157.28,avg_vol:48000000,cur_vol:42240000,sector:'Technology',short_term:'bullish',long_term:'bullish',regime:'strong_uptrend',ema_align:3},
  INTC:{price:22.10,change_pct:-0.45,rsi14:38.2,atr14:0.92,ema21:23.40,ema50:25.10,ema200:30.20,vol_ratio:0.72,high_52w:46.45,low_52w:18.51,dist_from_52h:52.4,prev_close:22.20,avg_vol:62000000,cur_vol:44640000,sector:'Technology',short_term:'bearish',long_term:'bearish',regime:'downtrend',ema_align:0},
  DUOL:{price:348.20,change_pct:1.85,rsi14:68.4,atr14:12.80,ema21:338.50,ema50:318.20,ema200:268.40,vol_ratio:1.42,high_52w:388.90,low_52w:152.57,dist_from_52h:10.5,prev_close:341.84,avg_vol:1800000,cur_vol:2556000,sector:'Technology',short_term:'bullish',long_term:'bullish',regime:'strong_uptrend',ema_align:3},
  MSFT:{price:415.20,change_pct:0.72,rsi14:60.1,atr14:8.90,ema21:410.30,ema50:402.10,ema200:378.50,vol_ratio:1.05,high_52w:468.35,low_52w:344.79,dist_from_52h:11.4,prev_close:412.22,avg_vol:21000000,cur_vol:22050000,sector:'Technology',short_term:'bullish',long_term:'bullish',regime:'strong_uptrend',ema_align:3},
  NFLX:{price:985.30,change_pct:1.10,rsi14:63.2,atr14:22.40,ema21:968.10,ema50:940.20,ema200:842.30,vol_ratio:1.18,high_52w:1065.00,low_52w:542.01,dist_from_52h:7.5,prev_close:974.52,avg_vol:4200000,cur_vol:4956000,sector:'Technology',short_term:'bullish',long_term:'bullish',regime:'strong_uptrend',ema_align:3},
};

function getSampleData(ticker) {
  // Try config.js SAMPLE_DATA first, then inline fallback
  if (typeof SAMPLE_DATA !== 'undefined' && SAMPLE_DATA[ticker]) return SAMPLE_DATA[ticker];
  return FALLBACK_SAMPLE[ticker] || null;
}

async function fetchStockData(ticker) {
  const marketStatus = getMarketStatus();
  // Try real API first (always — API returns latest available data regardless of hours)
  try {
    const res = await fetch(`${API_BASE}/quote/${ticker}`, {
      signal: AbortSignal.timeout(20000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    if (!d.price || d.price === 0) throw new Error('price missing');

    // Determine source label based on market status
    const source = marketStatus === 'open' ? 'LIVE_REALTIME'
      : (marketStatus === 'pre' || marketStatus === 'after') ? 'LIVE_REALTIME'
      : 'MARKET_CLOSED_LAST_DATA';

    console.log(`✅ API data [${source}]:`, ticker, d.price);
    return { ...buildStockResult(d, ticker, source), marketStatus };

  } catch (apiErr) {
    console.warn('⚠️ API failed:', apiErr.message, '— market:', marketStatus);
    // Auto-fallback to sample data (Messenger / restricted browser)
    const sampleD = getSampleData(ticker);
    if (sampleD) {
      console.log('📦 Auto-fallback to sample:', ticker);
      const d = sampleD;
      return { ...buildStockResult(d, ticker, 'SAMPLE_DATA'), marketStatus };
    }
    return { success: false, ticker, error: 'FETCH_FAILED',
      message: apiErr.message, marketStatus };
  }
}

async function fetchMarketData() {
  const results = await Promise.allSettled([
    fetch(`${API_BASE}/quote/%5EVIX`, { signal: AbortSignal.timeout(10000) }).then(r=>r.json()),
    fetch(`${API_BASE}/quote/SPY`,   { signal: AbortSignal.timeout(10000) }).then(r=>r.json()),
    fetch(`${API_BASE}/quote/XLK`,   { signal: AbortSignal.timeout(10000) }).then(r=>r.json()),
    fetch(`${API_BASE}/quote/XLF`,   { signal: AbortSignal.timeout(10000) }).then(r=>r.json()),
    fetch(`${API_BASE}/quote/XLE`,   { signal: AbortSignal.timeout(10000) }).then(r=>r.json()),
    fetch(`${API_BASE}/quote/XLV`,   { signal: AbortSignal.timeout(10000) }).then(r=>r.json()),
    fetch(`${API_BASE}/quote/XLY`,   { signal: AbortSignal.timeout(10000) }).then(r=>r.json()),
  ]);
  const get = (r) => r.status === 'fulfilled' && !r.value?.error ? r.value : null;
  const vix = get(results[0]); const spy = get(results[1]);
  const etfs = { XLK: get(results[2]), XLF: get(results[3]), XLE: get(results[4]), XLV: get(results[5]), XLY: get(results[6]) };
  const names = { XLK:'Tech', XLF:'Financial', XLE:'Energy', XLV:'Healthcare', XLY:'Consumer' };
  const spyPrice = spy?.price || 500;
  const sectorRanked = Object.entries(etfs)
    .filter(([,d]) => d?.price)
    .map(([sym, d]) => ({ sym, name: names[sym], rs: d.price / spyPrice }))
    .sort((a, b) => b.rs - a.rs);
  return {
    vixPrice: vix?.price || 20,
    spyPrice, spyEMA200: spy?.ema200 || 0,
    spyAbove200: spyPrice > (spy?.ema200 || 0),
    sectorRanked,
  };
}

// Compatibility shim for watchlist
async function fetchQuote(ticker) {
  const data = await fetchStockData(ticker);
  if (data.success) return data.raw || {};
  throw new Error(data.message || 'Fetch failed');
}

// RSI calculation
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - (100 / (1 + rs)));
}

// EMA calculation
function calcEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) ema = data[i] * k + ema * (1 - k);
  return ema;
}

// ATR calculation
function calcATR(highs, lows, closes, period = 14) {
  let trs = [];
  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1]));
    trs.push(tr);
  }
  const recent = trs.slice(-period);
  return recent.reduce((a,b) => a+b, 0) / recent.length;
}

function showErr(msg) {
  const t = document.getElementById('err-toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 6000);
  // Show download guidance if proxy fails
  if (msg.includes('proxy') || msg.includes('fetch') || msg.includes('Алдаа')) {
    document.getElementById('dl-banner').style.display = 'block';
  }
}

function setFetchMsg(msg) {
  document.getElementById('fetch-msg').textContent = msg;
}