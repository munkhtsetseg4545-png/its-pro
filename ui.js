// ════════════════════════════════════════════════════════════════
// LAYER 4: UI FUNCTIONS
// ════════════════════════════════════════════════════════════════

function clearUI(ticker) {
  liveData = {};
  const panel = document.getElementById('data-panel');
  const grid  = document.getElementById('data-grid');
  if (panel) panel.classList.remove('visible');
  if (grid)  grid.innerHTML = '';
  document.getElementById('h-score').textContent = '0';
  const regime = document.getElementById('h-regime');
  if (regime) { regime.className = 'badge b-neutral'; regime.textContent = 'NEUTRAL'; }
  document.getElementById('h-last-fetch').textContent = 'МЭДЭЭЛЭЛ БАЙХГҮЙ';
  document.getElementById('prog-fill').style.width = '0%';
  document.getElementById('h-pct').textContent = '0';
  document.getElementById('h-step').textContent = '1';
  document.getElementById('data-live-badge').style.display = 'none';
  const macroEl = document.getElementById('macro-auto-result');
  if (macroEl) macroEl.innerHTML = 'Өгөгдөл татаагүй байна...';
  const sectorEl = document.getElementById('sector-auto-result');
  if (sectorEl) sectorEl.innerHTML = 'Өгөгдөл татаагүй байна...';
  const rs = document.getElementById('rscore');
  if (rs) rs.textContent = '0.0';
}

function renderError(ticker, error, marketStatus) {
  const panel = document.getElementById('data-panel');
  const grid  = document.getElementById('data-grid');
  const mkt = marketStatus || getMarketStatus();
  const mktLabel = { open:'Зах зээл нээлттэй', pre:'Pre-market', after:'After-hours', closed:'Зах зээл хаалттай' }[mkt] || '';
  if (panel && grid) {
    panel.classList.add('visible');
    grid.innerHTML = `<div style="padding:12px;color:var(--red);font-family:var(--mono);font-size:13px;">
      ❌ <b>${ticker}</b> — Өгөгдөл авч чадсангүй<br>
      <span style="color:var(--txt2);font-size:11px;">
        ${mktLabel} · Сервер хариу өгөхгүй байна.<br>
        Safari/Chrome дээр нээгээд дахин оролдоно уу.
      </span><br>
      <span style="color:var(--txt2);font-size:11px;margin-top:6px;display:block;">
        💡 TEST товч → <b>AAPL · META · TSLA · NVDA</b> гэх мэт sample data ашиглана уу
      </span>
    </div>`;
  }
  const v = document.getElementById('rverdict');
  if (v) { v.className='banner b-r vis'; v.textContent=`❌ ${ticker} — Өгөгдөл байхгүй`; }
  document.getElementById('h-last-fetch').textContent = `❌ ${mktLabel||'Амжилтгүй'}`;
}

function renderStockData(data, market) {
  liveData = {
    ticker: data.ticker,
    currentPrice: data.price, prevClose: data.prevClose,
    change: data.changePercent,
    weekHigh52: data.high52, weekLow52: data.low52,
    distFrom52High: data.distFrom52h,
    ema21: data.ema21, ema50: data.ema50, ema200: data.ema200,
    rsi14: data.rsi, atr14: data.atr,
    avgVol: data.avgVol, curVol: data.curVol, volRatio: data.volRatio,
    baseDepth: data.distFrom52h, sector: data.sector,
    epsGrowth: null, revGrowth: null, nextEarnings: 'N/A',
    vixPrice: market.vixPrice, spyPrice: market.spyPrice,
    spyEMA200: market.spyEMA200, spyAbove200: market.spyAbove200,
    sectorRanked: market.sectorRanked,
    fetchTime: new Date().toLocaleTimeString(),
    short_term: data.shortTerm, long_term: data.longTerm,
    regime: data.regime, momentum: getMomentum(data.rsi),
    ema_align: data.emaAlign, dataSource: data.source,
  };
  updateDataPanel();
  autoFillRegime();
  autoFillSetup();
  autoFillTimeframe();
  autoFillPosition();
  autoFillFundamentals();
  const statusBadge = {
    'LIVE_REALTIME':        `🟢 LIVE ${liveData.fetchTime}`,
    'MARKET_CLOSED_LAST_DATA': `🔵 Хаалттай — Сүүлийн өгөгдөл ${liveData.fetchTime}`,
    'SAMPLE_DATA':          `🟡 SAMPLE ${liveData.fetchTime}`,
    'sample':               `🟡 SAMPLE ${liveData.fetchTime}`,
  };
  const badge = statusBadge[data.source] || `🟢 ${liveData.fetchTime}`;
  document.getElementById('h-last-fetch').textContent = badge;
  document.getElementById('data-live-badge').style.display = 'inline';
  const dlb = document.getElementById('dl-banner');
  if (dlb) dlb.style.display = 'none';
  calcAll();
  save();
}

async function loadSampleData(ticker) {
  if (!SAMPLE_DATA[ticker]) { showErr(`Sample байхгүй: ${ticker}`); return; }
  document.getElementById('h-ticker').value = ticker;
  clearUI(ticker);
  const d = SAMPLE_DATA[ticker];
  const stock = { success:true, source:'SAMPLE_DATA', ticker, price:d.price,
    changePercent:d.change_pct, rsi:d.rsi14, atr:d.atr14,
    ema21:d.ema21, ema50:d.ema50, ema200:d.ema200,
    volRatio:d.vol_ratio, avgVol:d.avg_vol, curVol:d.cur_vol,
    high52:d.high_52w, low52:d.low_52w, distFrom52h:d.dist_from_52h,
    prevClose:d.prev_close, sector:d.sector,
    shortTerm:d.short_term==='bullish'?'BULL':'BEAR',
    longTerm:d.long_term==='bullish'?'BULL':'BEAR',
    regime:d.regime, emaAlign:d.ema_align,
  };
  const market = { vixPrice:20, spyPrice:500, spyEMA200:480, spyAbove200:true, sectorRanked:[] };
  renderStockData(stock, market);
}

// ════════════════════════════════════════════════════════════════
// MAIN FETCH FLOW
// ════════════════════════════════════════════════════════════════

async function fetchAllData() {
  const raw = document.getElementById('h-ticker').value;
  const ticker = normalizeTicker(raw);
  if (!ticker) { showErr('Ticker оруулна уу'); return; }

  clearUI(ticker);

  const overlay = document.getElementById('fetch-overlay');
  const btn = document.getElementById('fetch-btn');
  overlay.classList.add('vis');
  btn.classList.add('loading');
  btn.textContent = '⏳ ТАТАЖ БАЙНА...';

  try {
    setFetchMsg(`${ticker} өгөгдөл татаж байна...`);
    const [stockData, marketData] = await Promise.all([
      fetchStockData(ticker),
      fetchMarketData().catch(() => ({
        vixPrice:20, spyPrice:500, spyEMA200:480,
        spyAbove200:true, sectorRanked:[]
      }))
    ]);

    if (!stockData.success) {
      renderError(ticker, stockData.error, stockData.marketStatus);
      return;
    }
    setFetchMsg('Тооцоолж байна...');
    renderStockData(stockData, marketData);

  } catch (err) {
    console.error('fetchAllData:', err);
    renderError(ticker, 'FETCH_FAILED');
  } finally {
    overlay.classList.remove('vis');
    btn.classList.remove('loading');
    btn.textContent = '⚡ AUTO FETCH';
  }
}

// ════════════════════════════════════
// DATA PANEL
// ════════════════════════════════════
function updateDataPanel() {
  const d = liveData;
  const panel = document.getElementById('data-panel');
  panel.classList.add('visible');

  const chgColor = d.change >= 0 ? 'var(--green)' : 'var(--red)';
  const chgSign = d.change >= 0 ? '+' : '';

  const regimeMap = {
    'strong_uptrend':      { mn: 'Хүчтэй өсөлт',     color: 'var(--green)' },
    'counter_trend_rally': { mn: 'Эсрэг чиглэлийн өсөлт', color: 'var(--yellow)' },
    'pullback':            { mn: 'Буцалт',             color: 'var(--yellow)' },
    'downtrend':           { mn: 'Уналт',              color: 'var(--red)' },
  };
  const regimeInfo = regimeMap[d.regime] || { mn: d.regime || 'N/A', color: 'var(--txt2)' };
  const regimeMn = regimeInfo.mn;
  const regimeColor = regimeInfo.color;

  document.getElementById('data-grid').innerHTML = `
    <div class="data-cell">
      <div class="data-cell-lbl">${d.ticker} Үнэ</div>
      <div class="data-cell-val">$${d.currentPrice?.toFixed(2)}</div>
      <div class="data-cell-sub" style="color:${chgColor}">${chgSign}${d.change?.toFixed(2)}%</div>
    </div>
    <div class="data-cell">
      <div class="data-cell-lbl">VIX</div>
      <div class="data-cell-val ${d.vixPrice < 15 ? '' : d.vixPrice < 25 ? 'warn' : 'danger'}">${d.vixPrice?.toFixed(2)}</div>
      <div class="data-cell-sub">${d.vixPrice < 15 ? 'Тайван' : d.vixPrice < 25 ? 'Хэвийн' : 'Аюул'}</div>
    </div>
    <div class="data-cell">
      <div class="data-cell-lbl">RSI (14)</div>
      <div class="data-cell-val ${d.rsi14 > 70 ? 'danger' : d.rsi14 > 50 ? '' : 'warn'}">${d.rsi14}</div>
      <div class="data-cell-sub">${d.rsi14 > 70 ? 'Хэт өндөр' : d.rsi14 > 50 ? 'Бычийн' : 'Ведмеж'}</div>
    </div>
    <div class="data-cell">
      <div class="data-cell-lbl">ATR (14)</div>
      <div class="data-cell-val">$${d.atr14?.toFixed(2)}</div>
      <div class="data-cell-sub">${(d.atr14/d.currentPrice*100).toFixed(1)}% of price</div>
    </div>
    <div class="data-cell">
      <div class="data-cell-lbl">EMA 21</div>
      <div class="data-cell-val ${d.currentPrice > d.ema21 ? '' : 'danger'}">$${d.ema21?.toFixed(2)}</div>
      <div class="data-cell-sub">${d.currentPrice > d.ema21 ? '▲ Дээр' : '▼ Доор'}</div>
    </div>
    <div class="data-cell">
      <div class="data-cell-lbl">EMA 50</div>
      <div class="data-cell-val ${d.currentPrice > d.ema50 ? '' : 'danger'}">$${d.ema50?.toFixed(2)}</div>
      <div class="data-cell-sub">${d.currentPrice > d.ema50 ? '▲ Дээр' : '▼ Доор'}</div>
    </div>
    <div class="data-cell">
      <div class="data-cell-lbl">EMA 200</div>
      <div class="data-cell-val ${d.currentPrice > d.ema200 ? '' : 'danger'}">$${d.ema200?.toFixed(2)}</div>
      <div class="data-cell-sub">${d.currentPrice > d.ema200 ? '▲ Дээр' : '▼ Доор'}</div>
    </div>
    <div class="data-cell">
      <div class="data-cell-lbl">52W High зай</div>
      <div class="data-cell-val ${d.distFrom52High < 15 ? '' : d.distFrom52High < 30 ? 'warn' : 'danger'}">${d.distFrom52High?.toFixed(1)}%</div>
      <div class="data-cell-sub">High: $${d.weekHigh52?.toFixed(2)}</div>
    </div>
    <div class="data-cell">
      <div class="data-cell-lbl">Volume Ratio</div>
      <div class="data-cell-val ${d.volRatio > 1.5 ? '' : d.volRatio > 0.7 ? 'warn' : 'danger'}">${d.volRatio?.toFixed(2)}x</div>
      <div class="data-cell-sub">${(d.curVol/1e6).toFixed(1)}M / ${(d.avgVol/1e6).toFixed(1)}M avg</div>
    </div>
    <div class="data-cell">
      <div class="data-cell-lbl">SPY</div>
      <div class="data-cell-val ${d.spyAbove200 ? '' : 'danger'}">$${d.spyPrice?.toFixed(2)}</div>
      <div class="data-cell-sub">${d.spyAbove200 ? '▲ 200MA дээр' : '▼ 200MA доор'}</div>
    </div>
    <div class="data-cell">
      <div class="data-cell-lbl">SL (ATR x2)</div>
      <div class="data-cell-val warn">$${(d.currentPrice - d.atr14 * 2)?.toFixed(2)}</div>
      <div class="data-cell-sub">-${(d.atr14*2/d.currentPrice*100).toFixed(1)}%</div>
    </div>
    <div class="data-cell">
      <div class="data-cell-lbl">Татсан цаг</div>
      <div class="data-cell-val" style="font-size:13px;color:var(--gold);">${d.fetchTime}</div>
      <div class="data-cell-sub">${liveData.dataSource==='MARKET_CLOSED_LAST_DATA'?'⏸ Сүүлийн хаалтын үнэ':liveData.dataSource==='SAMPLE_DATA'?'🧪 Sample data':'Yahoo Finance'}</div>
    </div>
    <div class="data-cell">
      <div class="data-cell-lbl">Regime</div>
      <div class="data-cell-val" style="font-size:12px;color:${regimeColor};">${regimeMn}</div>
      <div class="data-cell-sub">${d.short_term||''} / ${d.long_term||''}</div>
    </div>
    <div class="data-cell">
      <div class="data-cell-lbl">Momentum</div>
      <div class="data-cell-val" style="font-size:13px;color:${d.momentum==='Хүчтэй эрч'?'var(--red)':d.momentum==='Хэт зарагдсан'?'var(--green)':'var(--yellow)'};">${d.momentum}</div>
      <div class="data-cell-sub">EMA align: ${d.ema_align||0}/3</div>
    </div>
  `;
}

// ════════════════════════════════════
// AUTO-FILL FUNCTIONS
// ════════════════════════════════════
function autoSelect(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) { el.checked = true; el.classList.add('auto-selected'); }
}

function autoFillRegime() {
  const d = liveData;
  document.getElementById('r-auto-tag').innerHTML = '<span class="auto-tag">AUTO</span>';

  // S&P500 position
  if (d.spyAbove200) autoSelect('r_idx', '2');
  else autoSelect('r_idx', '0');

  // VIX
  if (d.vixPrice < 15) autoSelect('r_vix', '2');
  else if (d.vixPrice < 25) autoSelect('r_vix', '1');
  else if (d.vixPrice < 35) autoSelect('r_vix', '0.5');
  else autoSelect('r_vix', '0');

  document.getElementById('vix-live').textContent = `[${d.vixPrice?.toFixed(1)}]`;

  // SPY above 200 → percent above estimate
  if (d.spyAbove200) {
    const pctAbove = ((d.spyPrice - d.spyEMA200) / d.spyEMA200 * 100);
    if (pctAbove > 5) autoSelect('r_pct', '2');
    else autoSelect('r_pct', '1');
  } else {
    autoSelect('r_pct', '0');
  }

  // AUTO MACRO SCORE
  const macroScore = calculateMacroScore(d.vixPrice, d.spyPrice, d.spyEMA200, 'up');
  const macroRegime = getMarketRegime(macroScore);
  liveData.macroScore = macroScore;
  liveData.macroRegime = macroRegime;
  const macroEl = document.getElementById('macro-auto-result');
  if (macroEl) macroEl.innerHTML =
    `<span class="auto-tag">AUTO</span> Macro: <b>${macroScore}/8</b> — ${macroRegime}`;

  // AUTO SECTOR RANKING
  const sectorEl = document.getElementById('sector-auto-result');
  if (sectorEl && d.sectorRanked && d.sectorRanked.length > 0) {
    const rows = d.sectorRanked.map((s, i) => {
      const medal = i === 0 ? '🥇' : i <= 2 ? '🟢' : '🔴';
      const label = i === 0 ? 'Тэргүүлэгч' : i <= 2 ? 'Хүчтэй' : 'Сул';
      return `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:12px;">
        <span>${medal} ${s.name}</span>
        <span style="color:${i===0?'var(--green)':i<=2?'var(--yellow)':'var(--red)'}">${label} (${s.rs.toFixed(3)})</span>
      </div>`;
    }).join('');
    sectorEl.innerHTML = `<span class="auto-tag">AUTO</span>${rows}`;
  }

  // Auto-select sector radio based on top sector
  if (d.sectorRanked && d.sectorRanked.length > 0) {
    const top = d.sectorRanked[0];
    if (top.sym === 'XLK') autoSelect('r_sec', '1');
    else if (top.sym === 'XLF' || top.sym === 'XLE') autoSelect('r_sec', '0.5');
    else autoSelect('r_sec', '0.5');

    // My sector rank
    const mySector = d.sector || '';
    const sectorMap = { Technology: 'XLK', Financials: 'XLF', Energy: 'XLE',
      Healthcare: 'XLV', 'Consumer Discretionary': 'XLY' };
    const myEtf = Object.entries(sectorMap).find(([k]) => mySector.includes(k))?.[1];
    if (myEtf) {
      const myRank = d.sectorRanked.findIndex(s => s.sym === myEtf);
      if (myRank === 0) autoSelect('r_ms', '2');
      else if (myRank <= 2) autoSelect('r_ms', '1.5');
      else autoSelect('r_ms', '0.5');
    }
  }
}

function autoFillSetup() {
  const d = liveData;
  document.getElementById('setup-auto-tag').innerHTML = '<span class="auto-tag">AUTO</span>';

  // 52W depth from high
  if (d.distFrom52High < 15) autoSelect('s_dep', '2');
  else if (d.distFrom52High < 30) autoSelect('s_dep', '1');
  else if (d.distFrom52High < 50) autoSelect('s_dep', '0.5');
  else autoSelect('s_dep', '0');
  document.getElementById('depth-live').textContent = `[${d.distFrom52High?.toFixed(1)}%]`;

  // Volume pattern
  if (d.volRatio < 0.8) autoSelect('s_vol', '2');
  else if (d.volRatio < 1.3) autoSelect('s_vol', '1');
  else autoSelect('s_vol', '0');

  // Auto-fill entry price & ATR
  document.getElementById('ps-entry').value = d.currentPrice?.toFixed(2);
  document.getElementById('ps-entry').classList.add('auto-filled');
  document.getElementById('ep-auto').style.display = 'inline';

  document.getElementById('ps-atr').value = d.atr14?.toFixed(2);
  document.getElementById('ps-atr').classList.add('auto-filled');
  document.getElementById('atr-auto').style.display = 'inline';

  // Auto SL = ATR x2
  const sl = (d.currentPrice - d.atr14 * 2).toFixed(2);
  document.getElementById('ps-sl').value = sl;
  document.getElementById('ps-sl').classList.add('auto-filled');

  // Setup tab: pivot dist auto-calc
  const pivot = parseFloat(document.getElementById('pivot-price').value);
  if (pivot > 0) {
    const dist = ((d.currentPrice - pivot) / pivot * 100);
    document.getElementById('pivot-dist-val').textContent = `${dist.toFixed(2)}%`;
    document.getElementById('cur-price-setup').textContent = `$${d.currentPrice?.toFixed(2)}`;
    if (dist >= 0 && dist < 3) autoSelect('s_dist', '2');
    else if (dist >= 0 && dist < 5) autoSelect('s_dist', '1');
    else if (dist >= 0 && dist < 8) autoSelect('s_dist', '0.5');
    else if (dist < 0) { document.getElementById('pivot-dist-val').textContent = `Pivot дутсан ${Math.abs(dist).toFixed(1)}%`; }
    else autoSelect('s_dist', '0');
    document.getElementById('pivot-auto-tag').innerHTML = '<span class="auto-tag">AUTO</span>';
  } else {
    document.getElementById('cur-price-setup').textContent = `$${d.currentPrice?.toFixed(2)}`;
  }
}

function autoFillTimeframe() {
  const d = liveData;
  document.getElementById('tf-auto-tag').innerHTML = '<span class="auto-tag">AUTO</span>';

  // EMA 21 relationship
  if (d.currentPrice > d.ema21) {
    // Check if rising: price > ema21 and ema21 > ema50 → strongly bullish
    if (d.ema21 > d.ema50) autoSelect('tf_d2', '2');
    else autoSelect('tf_d2', '1');
  } else {
    autoSelect('tf_d2', '0');
  }

  // EMA alignment
  if (d.ema21 > d.ema50) autoSelect('tf_de', '2');
  else if (Math.abs(d.ema21 - d.ema50) / d.ema50 < 0.005) autoSelect('tf_de', '1');
  else autoSelect('tf_de', '0');

  // Volume dry-up (daily)
  if (d.volRatio < 0.7) autoSelect('tf_dv', '2');
  else if (d.volRatio < 1.2) autoSelect('tf_dv', '1');
  else autoSelect('tf_dv', '0');

  // Monthly 200MA
  if (d.currentPrice > d.ema200) autoSelect('tf_m2', '1');
  else autoSelect('tf_m2', '0');

  // Monthly trend (price vs 200 EMA → rough)
  if (d.currentPrice > d.ema200 * 1.05) autoSelect('tf_mt', '2');
  else if (d.currentPrice > d.ema200) autoSelect('tf_mt', '1');
  else autoSelect('tf_mt', '0');

  // RSI auto
  const rsi = d.rsi14;
  document.getElementById('rsi-live').textContent = `[RSI:${rsi}]`;
  if (rsi > 50 && rsi < 70) autoSelect('tf_4r', '2');
  else if (rsi >= 70) autoSelect('tf_4r', '0.5');
  else autoSelect('tf_4r', '0');
}

function autoFillPosition() {
  const d = liveData;
  document.getElementById('pos-auto-tag').innerHTML = '<span class="auto-tag">AUTO</span>';
  entryPrice = d.currentPrice;
  calcPos();
}

// ════════════════════════════════════
// WATCHLIST FETCH
// ════════════════════════════════════
async function fetchWatchStock(ticker) {
  try {
    const data = await yahooFetch(ticker);
    const result = data.chart.result[0];
    const closes = result.indicators.quote[0].close.filter(Boolean);
    const price = result.meta.regularMarketPrice;
    const high52 = result.meta.fiftyTwoWeekHigh || Math.max(...closes);
    const dist = ((high52 - price) / high52 * 100);
    const rsi = calcRSI(closes);
    const vols = result.indicators.quote[0].volume.filter(Boolean);
    const avgVol = vols.slice(-20).reduce((a,b)=>a+b,0)/20;
    const curVol = vols[vols.length-1];
    const volRatio = curVol/avgVol;

    return { price, dist, rsi, volRatio };
  } catch(e) {
    return null;
  }
}

async function fetchAllWatchlist() {
  for (const w of watchlist) {
    const wdata = await fetchWatchStock(w.ticker);
    if (wdata) {
      w.liveData = wdata;
      // Auto-select some radio
      autoSelectWatch(w.ticker, wdata);
    }
  }
  renderWatchlist();
}

function autoSelectWatch(ticker, d) {
  // 52W high dist
  if (d.dist < 15) setWatchRadio(ticker, 'high52', '2');
  else if (d.dist < 30) setWatchRadio(ticker, 'high52', '1');
  else setWatchRadio(ticker, 'high52', '0');
}

function setWatchRadio(ticker, key, val) {
  const el = document.querySelector(`input[name="w_${key}_w_${ticker}"][value="${val}"]`);
  if (el) { el.checked = true; el.classList.add('auto-selected'); }
}

// ════════════════════════════════════
// WATCHLIST UI
// ════════════════════════════════════
function addWatch() {
  const inp = document.getElementById('new-ticker');
  const t = inp.value.trim().toUpperCase();
  if (!t) return;
  if (watchlist.length >= 10) { alert('Дээд тал нь 10!'); return; }
  if (watchlist.find(w => w.ticker === t)) { alert('Аль хэдийн байна!'); return; }
  watchlist.push({ ticker: t, liveData: null });
  inp.value = '';
  renderWatchlist();
  save();
}

function removeWatch(ticker) {
  watchlist = watchlist.filter(w => w.ticker !== ticker);
  renderWatchlist(); save();
}

function renderWatchlist() {
  const c = document.getElementById('wlist');
  document.getElementById('wcount').textContent = watchlist.length;
  if (!watchlist.length) { c.innerHTML = '<div style="color:var(--txt3);text-align:center;padding:30px;font-size:12px;">Watchlist хоосон</div>'; return; }
  c.innerHTML = watchlist.map(w => `
    <div class="witem" id="wi-${w.ticker}">
      <div class="wticker">⬡ ${w.ticker}
        ${w.liveData ? `<span style="font-family:var(--mono);font-size:12px;color:var(--green);margin-left:10px;">$${w.liveData.price?.toFixed(2)}</span>
        <span style="font-family:var(--mono);font-size:10px;color:var(--txt2);">RSI:${w.liveData.rsi} | ${w.liveData.dist?.toFixed(1)}% from 52H</span>` : ''}
      </div>
      <button class="btn btn-red btn-sm" style="position:absolute;top:10px;right:10px;" onclick="removeWatch('${w.ticker}')">✕</button>
      <div class="wscore" id="wscore-${w.ticker}">0/7</div>
      ${watchRadioRows(w.ticker)}
    </div>
  `).join('');
  c.querySelectorAll('input[type=radio]').forEach(r => {
    r.addEventListener('change', () => { calcWatchScore(r.name.split('_w_')[1]); save(); });
  });
  watchlist.forEach(w => calcWatchScore(w.ticker));
}

function watchRadioRows(t) {
  const rows = [
    ['EPS өсөлт','eps',['25%+ ✅✅|2','15-25% ✅|1','<15% ❌|0']],
    ['Revenue өсөлт','rev',['15%+ ✅✅|2','10-15% ✅|1','<10% ❌|0']],
    ['RS Rating','rs',['90+ ✅✅|2','80-90 ✅|1','<80 ❌|0']],
    ['52W high зай','high52',['0-15% ✅✅|2','15-30% ✅|1','30%+ ❌|0']],
    ['Sector байдал','sect',['Тэргүүлэгч ✅✅|2','Дунд ⚠️|1','Сул ❌|0']],
    ['Институц','inst',['Нэмэгдэж байна ✅|1','Хэвээр ⚠️|0.5','Буурч байна ❌|0']],
    ['Earnings date','earn',['3+ долоо хоног ✅|2','1-3 долоо хоног ⚠️|1','7 хоногт ойр ❌|0']],
  ];
  return rows.map(([lbl, key, opts]) => `
    <div class="rrow">
      <div class="rlbl">${lbl}</div>
      <div class="ropts">
        ${opts.map((o,i) => {
          const [txt,val] = o.split('|');
          const cls = txt.includes('✅')?'g':txt.includes('❌')?'r':txt.includes('⚠️')?'y':'';
          return `<div class="ropt ${cls}"><input type="radio" name="w_${key}_w_${t}" value="${val}" id="w${key}${i}${t}"><label for="w${key}${i}${t}">${txt}</label></div>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function calcWatchScore(ticker) {
  let s = 0;
  ['eps','rev','rs','high52','sect','inst','earn'].forEach(k => {
    const el = document.querySelector(`input[name="w_${k}_w_${ticker}"]:checked`);
    if (el) s += parseFloat(el.value);
  });
  const norm = Math.round((s/13)*7*10)/10;
  const el = document.getElementById(`wscore-${ticker}`);
  if (el) {
    el.textContent = norm.toFixed(1)+'/7';
    el.style.color = norm>=5?'var(--green)':norm>=3.5?'var(--yellow)':'var(--red)';
  }
}

// ════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════