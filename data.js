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
    // Do NOT auto-fallback to sample — return FETCH_FAILED
    // (sample is only loaded manually via TEST button)
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