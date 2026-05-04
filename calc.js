// ════════════════════════════════════════════════════════════════
// LAYER 2: CALCULATION LAYER (pure functions, no DOM touch)
// ════════════════════════════════════════════════════════════════

function getTrend(price, ema21, ema50, ema200) {
  const shortTerm = (price > ema21 && price > ema50) ? 'BULL' : 'BEAR';
  const longTerm  = (price > ema200) ? 'BULL' : 'BEAR';
  return { shortTerm, longTerm };
}

function getMomentum(rsi) {
  if (rsi >= 65) return 'Хүчтэй эрч';
  if (rsi <= 30) return 'Хэт зарагдсан';
  return 'Тэнцвэртэй';
}

function getRegime(shortTerm, longTerm) {
  if (shortTerm === 'BULL' && longTerm === 'BULL') return 'BULL_TREND';
  if (shortTerm === 'BEAR' && longTerm === 'BEAR') return 'BEAR_TREND';
  if (shortTerm === 'BULL' && longTerm === 'BEAR') return 'COUNTER_TREND_RALLY';
  if (shortTerm === 'BEAR' && longTerm === 'BULL') return 'PULLBACK';
  return 'UNKNOWN';
}

function calculateMacroScore(vix, spy, ema200, adTrend) {
  let s = 0;
  if (vix < 15) s += 3; else if (vix <= 25) s += 2; else if (vix <= 35) s += 1;
  if (spy > ema200) s += 3;
  if (adTrend === 'up') s += 2; else if (adTrend === 'flat') s += 1;
  return s; // max 8
}

function getMarketRegime(macroScore) {
  if (macroScore >= 7) return '🟢 Strong Bull';
  if (macroScore >= 5) return '🟡 Neutral Bull';
  return '🔴 Weak / Risk Off';
}

function calculateScore(shortTerm, longTerm, momentum, market) {
  let s = 0;
  if (shortTerm === 'BULL') s += 25;
  if (longTerm  === 'BULL') s += 20;
  if (momentum  === 'Хүчтэй эрч') s += 15;
  else if (momentum === 'Тэнцвэртэй') s += 8;
  if (market.spyAbove200) s += 10;
  if (market.vixNormal)   s += 10;
  if (market.volumeOk)    s += 10;
  return Math.min(70, s);
}

// ════════════════════════════════════════════════════════════════
// LAYER 3: DECISION LAYER (single source of truth)
// ════════════════════════════════════════════════════════════════

function getFinalDecision(score, regimeScore) {
  if (score >= 60 && regimeScore >= 6) return '🟢 BUY / TRADE';
  if (score >= 40 && regimeScore >= 5) return '🟡 WATCH / SMALL POSITION';
  return '🔴 CASH / NO TRADE';
}