// ════════════════════════════════════
// CALCS
// ════════════════════════════════════
function getVal(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? parseFloat(el.value) : 0;
}

function calcRegime() {
  // Compute macroScore directly from liveData
  const macro = liveData?.vixPrice !== undefined
    ? calculateMacroScore(liveData.vixPrice, liveData.spyPrice, liveData.spyEMA200, 'up')
    : 4;
  liveData.macroScore = macro;
  // Set hidden fields
  const setH = (id, v) => { const e=document.getElementById(id); if(e) e.value=String(v); };
  setH('r_fed_h', macro>=6?'1':macro>=4?'0.5':'0');
  setH('r_yc_h',  macro>=5?'1':macro>=3?'0.5':'0');
  setH('r_cyc_h', macro>=7?'2':macro>=5?'1.5':macro>=3?'0.5':'0');
  // Auto-set idx/vix/ad from liveData
  if (liveData.spyAbove200 !== undefined) {
    const getEl = (n,v) => document.querySelector(`input[name="${n}"][value="${v}"]`);
    if (liveData.spyAbove200) { const e=getEl('r_idx','2'); if(e) e.checked=true; }
    else { const e=getEl('r_idx','0'); if(e) e.checked=true; }
    const vix=liveData.vixPrice||20;
    const vv=vix<15?'2':vix<25?'1':vix<35?'0.5':'0';
    const ve=getEl('r_vix',vv); if(ve) ve.checked=true;
  }
  const vals = ['r_idx','r_vix','r_ad','r_pct'].map(n=>{
    const e=document.querySelector(`input[name="${n}"]:checked`); return e?parseFloat(e.value)||0:0;
  }).concat(['r_fed_h','r_yc_h','r_cyc_h','r_sec_h','r_ms_h'].map(n=>{
    const e=document.getElementById(n); return e?parseFloat(e.value)||0:0;
  }));
  const raw = vals.reduce((a,b)=>a+b,0);
  const score = Math.min(10, Math.round((raw/7)*100)/10);
  document.getElementById('rscore').textContent = score.toFixed(1);

  const bear = document.getElementById('rc4');
  document.getElementById('bear-banner').classList.toggle('vis', bear?.checked);

  const v = document.getElementById('rverdict');
  if (score >= 7) { v.className='banner b-g vis'; v.textContent='✅ Зах зээл хүчтэй'; }
  else if (score >= 4) { v.className='banner b-y vis'; v.textContent='⚠️ Нейтрал — Болгоомжтой'; }
  else { v.className='banner b-r vis'; v.textContent='❌ Зах зээл сул'; }

  const badge = document.getElementById('h-regime');
  if (liveData && liveData.short_term && liveData.long_term) {
    const regime = getRegime(liveData.short_term, liveData.long_term);
    if (regime === 'BULL_TREND') { badge.className='badge b-bull'; badge.textContent='BULL'; }
    else if (regime === 'PULLBACK' || regime === 'COUNTER_TREND_RALLY') { badge.className='badge b-neutral'; badge.textContent='NEUTRAL'; }
    else { badge.className='badge b-bear'; badge.textContent='BEAR'; }
  } else {
    if (score>=7){badge.className='badge b-bull';badge.textContent='BULL';}
    else if(score>=4){badge.className='badge b-neutral';badge.textContent='NEUTRAL';}
    else{badge.className='badge b-bear';badge.textContent='BEAR';}
  }
  return score;
}

function calcSetup() {
  let cf=0;
  for(let i=1;i<=5;i++) if(document.getElementById('cf'+i)?.checked) cf++;
  document.getElementById('setup-snum').textContent=cf;
  const r=document.getElementById('setup-result');
  if(cf>=5){r.style.cssText='border-color:var(--green);color:var(--green);background:rgba(0,214,143,.08)';r.textContent='✅ 5/5 — TRADE БЭЛЭН';}
  else if(cf>=4){r.style.cssText='border-color:var(--yellow);color:var(--yellow);background:rgba(255,209,102,.08)';r.textContent='⚠️ 4/5 — ХҮЛЭЭ';}
  else{r.style.cssText='border-color:var(--red);color:var(--red);background:rgba(255,64,96,.08)';r.textContent=`❌ ${cf}/5 — ОРОХГҮЙ`;}
  return cf;
}

function calcTF() {
  const names=['tf_mt','tf_m2','tf_ms','tf_w1','tf_wv','tf_wr','tf_d2','tf_de','tf_dv','tf_4t','tf_4r','tf_4tr'];
  let s=0; names.forEach(n=>s+=getVal(n));
  const sc=Math.min(20,Math.round(s));
  document.getElementById('tf-snum').textContent=sc;
  const tt=document.getElementById('tf-type'), al=document.getElementById('tf-align');
  if(sc>=16){tt.textContent='POSITION';tt.style.color='var(--green)';al.textContent='НИЙЦСЭН';al.style.color='var(--green)';}
  else if(sc>=10){tt.textContent='SWING';tt.style.color='var(--yellow)';al.textContent='ХЭСЭГЧЛЭН';al.style.color='var(--yellow)';}
  else{tt.textContent='ХҮЛЭЭ';tt.style.color='var(--red)';al.textContent='ЗӨРЧИЛДСӨН';al.style.color='var(--red)';}
  return sc;
}

function calcPos() {
  const nav=parseFloat(document.getElementById('ps-nav').value)||0;
  const rPct=parseFloat(document.getElementById('ps-risk').value)||1.5;
  entryPrice=parseFloat(document.getElementById('ps-entry').value)||0;
  const sl=parseFloat(document.getElementById('ps-sl').value)||0;
  const atr=parseFloat(document.getElementById('ps-atr').value)||0;
  riskDollar=nav*(rPct/100);
  const slDist=entryPrice>0&&sl>0?entryPrice-sl:0;
  const slPct=entryPrice>0?slDist/entryPrice*100:0;
  totalShares=slDist>0?Math.floor(riskDollar/slDist):0;
  const posVal=totalShares*entryPrice;
  const navPct=nav>0?posVal/nav*100:0;
  const atrSL=entryPrice-atr*2;

  document.getElementById('r-mr').textContent='$'+riskDollar.toFixed(0);
  document.getElementById('r-sl').textContent=slPct.toFixed(2)+'%';
  document.getElementById('r-sh').textContent=totalShares.toLocaleString();
  document.getElementById('r-pv').textContent='$'+posVal.toLocaleString(undefined,{maximumFractionDigits:0});
  const npEl=document.getElementById('r-np');
  npEl.textContent=navPct.toFixed(1)+'%';
  npEl.className='cval'+(navPct>10?' danger':navPct>7?' warn':'');
  document.getElementById('r-at').textContent='$'+atrSL.toFixed(2);

  document.getElementById('pw-nav').classList.toggle('vis',navPct>10);
  document.getElementById('pw-risk').classList.toggle('vis',rPct>2);

  const s1=Math.floor(totalShares*.4),s2=Math.floor(totalShares*.3),s3=Math.floor(totalShares*.3);
  document.getElementById('tr-t1').textContent=s1;
  document.getElementById('tr-t2').textContent=s2;
  document.getElementById('tr-t3').textContent=s3;
  document.getElementById('et1s').textContent=s1;
  document.getElementById('et2s').textContent=s2;
  document.getElementById('et3s').textContent=s3;

  calcTranches();
  calcConviction();
}

function calcTranches() {
  const t1p=parseFloat(document.getElementById('tr-t1p').value)||entryPrice;
  const t2p=parseFloat(document.getElementById('tr-t2p').value)||entryPrice;
  const t3p=parseFloat(document.getElementById('tr-t3p').value)||entryPrice;
  const s1=Math.floor(totalShares*.4),s2=Math.floor(totalShares*.3),s3=Math.floor(totalShares*.3);
  document.getElementById('tr-t1v').textContent='$'+(s1*t1p).toLocaleString(undefined,{maximumFractionDigits:0});
  document.getElementById('tr-t2v').textContent='$'+(s2*t2p).toLocaleString(undefined,{maximumFractionDigits:0});
  document.getElementById('tr-t3v').textContent='$'+(s3*t3p).toLocaleString(undefined,{maximumFractionDigits:0});
}

function calcConviction() {
  const ss=parseFloat(document.getElementById('setup-snum').textContent)||0;
  const ts=parseFloat(document.getElementById('tf-snum').textContent)||0;
  const rs=parseFloat(document.getElementById('rscore').textContent)||0;
  document.getElementById('conv-s').textContent=ss+'/5';
  document.getElementById('conv-tf').textContent=ts+'/20';
  document.getElementById('conv-r').textContent=rs+'/10';
  const m=((ss/5*.3)+(ts/20*.4)+(rs/10*.3)+0.5).toFixed(2);
  document.getElementById('conv-m').textContent=m+'x';
}

function calcSLDist() {
  const ep=entryPrice||parseFloat(document.getElementById('ps-entry').value)||0;
  const slp=parseFloat(document.getElementById('sl-p').value)||0;
  const d=ep>0&&slp>0?((ep-slp)/ep*100):0;
  document.getElementById('sl-dist').textContent=d.toFixed(2)+'%';
}

function calcTP() {
  const ep=entryPrice||parseFloat(document.getElementById('ps-entry').value)||0;
  const sl=parseFloat(document.getElementById('ps-sl').value)||0;
  const risk=ep-sl;
  ['tp1','tp2','tp3'].forEach((id,i) => {
    const tp=parseFloat(document.getElementById(id+'p').value)||0;
    const rr=risk>0&&tp>0?((tp-ep)/risk).toFixed(2):'—';
    document.getElementById(id+'rr').textContent=rr!=='—'?rr+'R':'—';
    const el=document.getElementById('rr'+(i+1));
    if(el) el.textContent=rr!=='—'?rr+'R':'—';
  });
  const t1=parseFloat(document.getElementById('tp1p').value)||0;
  const t2=parseFloat(document.getElementById('tp2p').value)||0;
  const t3=parseFloat(document.getElementById('tp3p').value)||0;
  const s1=Math.floor(totalShares*.3),s2=Math.floor(totalShares*.3),s3=Math.floor(totalShares*.4);
  const pnl=(t1>0?(t1-ep)*s1:0)+(t2>0?(t2-ep)*s2:0)+(t3>0?(t3-ep)*s3:0);
  document.getElementById('ex-pnl').textContent='$'+pnl.toFixed(0);
  const ret=ep>0?pnl/(ep*totalShares)*100:0;
  document.getElementById('ex-ret').textContent=ret.toFixed(2)+'%';
}

function showTP1Remind() {
  document.getElementById('tp1-remind').classList.toggle('vis', document.getElementById('tp1fill').checked);
}

function calcPara() {
  const s=['par_s','par_v','par_p'].map(n=>getVal(n)).reduce((a,b)=>a+b,0);
  const el=document.getElementById('para-res');
  if(s>=3){el.style.cssText='border-color:var(--red);color:var(--red);background:rgba(255,64,96,.1)';el.textContent='🔴 3/3 — НЭН ДАРУЙ ГАР';}
  else if(s>=2){el.style.cssText='border-color:var(--yellow);color:var(--yellow);background:rgba(255,209,102,.08)';el.textContent='🟡 2/3 — 50% ЗАРНА';}
  else if(s>=1){el.style.cssText='border-color:#FF9940;color:#FF9940;background:rgba(255,153,64,.08)';el.textContent='🟠 1/3 — TRAILING ЧАНГАЛНА';}
  else{el.style.cssText='border-color:var(--green);color:var(--green);background:rgba(0,214,143,.08)';el.textContent='🟢 0/3 — БАРЬЖ БАЙНА';}
}

function checkDef() {
  const any=['def1','def2','def3','def4','def5'].some(id=>document.getElementById(id)?.checked);
  document.getElementById('def-warn').classList.toggle('vis',any);
}

// ════════════════════════════════════
// JOURNAL
// ════════════════════════════════════
function setEmo(type,btn,cls) {
  document.querySelectorAll('.ebtn').forEach(b=>b.className='ebtn');
  btn.classList.add(cls); selectedEmo=type;
}

function calcJ() {
  const en=parseFloat(document.getElementById('j-en').value)||0;
  const ex=parseFloat(document.getElementById('j-ex').value)||0;
  const sh=parseFloat(document.getElementById('j-sh').value)||0;
  const pnl=(ex-en)*sh, ret=en>0?(ex-en)/en*100:0;
  const pe=document.getElementById('j-pnl'), re=document.getElementById('j-ret');
  pe.textContent='$'+pnl.toFixed(2); pe.style.color=pnl>=0?'var(--green)':'var(--red)';
  re.textContent=ret.toFixed(2)+'%'; re.style.color=ret>=0?'var(--green)':'var(--red)';
}

function saveJournal() {
  const en=parseFloat(document.getElementById('j-en').value)||0;
  const ex=parseFloat(document.getElementById('j-ex').value)||0;
  const sh=parseFloat(document.getElementById('j-sh').value)||0;
  if(!en||!ex||!sh){alert('Entry, Exit, Shares оруулна уу');return;}
  const pnl=(ex-en)*sh, ret=en>0?(ex-en)/en*100:0;
  journalEntries.push({
    id:Date.now(),
    ticker:document.getElementById('h-ticker').value||'???',
    date:new Date().toLocaleDateString(),
    en,ex,sh,
    pnl:pnl.toFixed(2),ret:ret.toFixed(2),
    emotion:selectedEmo,
    thesis:document.getElementById('j-th').value,
    lesson:document.getElementById('j-le').value
  });
  renderJournal(); save();
  ['j-en','j-ex','j-sh','j-dy','j-dd','j-th','j-in','j-le','j-nx'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.querySelectorAll('.ebtn').forEach(b=>b.className='ebtn');
  calcJ();
}

function renderJournal() {
  const list=document.getElementById('j-hist');
  if(!journalEntries.length){list.innerHTML='<div style="color:var(--txt3);font-size:12px;text-align:center;padding:20px;">Trade history хоосон</div>';return;}
  list.innerHTML=journalEntries.slice().reverse().map(e=>`
    <div class="hitem">
      <div style="color:var(--gold);font-family:var(--mono);font-size:13px;">${e.ticker}</div>
      <div style="color:var(--txt2)">${e.date}</div>
      <div style="color:${parseFloat(e.pnl)>=0?'var(--green)':'var(--red)'}">$${parseFloat(e.pnl).toFixed(0)}</div>
      <div style="color:${parseFloat(e.ret)>=0?'var(--green)':'var(--red)'}">${e.ret}%</div>
      <button class="btn btn-red btn-sm" onclick="delJ(${e.id})">✕</button>
    </div>
  `).join('');
  const n=journalEntries.length;
  document.getElementById('st-t').textContent=n;
  if(n>0){
    const wins=journalEntries.filter(e=>parseFloat(e.pnl)>0).length;
    const tot=journalEntries.reduce((a,e)=>a+parseFloat(e.pnl),0);
    const best=Math.max(...journalEntries.map(e=>parseFloat(e.pnl)));
    const worst=Math.min(...journalEntries.map(e=>parseFloat(e.pnl)));
    document.getElementById('st-w').textContent=Math.round(wins/n*100)+'%';
    document.getElementById('st-r').textContent=((wins/n)*2.5).toFixed(1)+'R';
    const tp=document.getElementById('st-p'); tp.textContent='$'+tot.toFixed(0); tp.style.color=tot>=0?'var(--green)':'var(--red)';
    document.getElementById('st-b').textContent='$'+best.toFixed(0);
    document.getElementById('st-wo').textContent='$'+worst.toFixed(0);
  }
}

function delJ(id){journalEntries=journalEntries.filter(e=>e.id!==id);renderJournal();save();}

function autoFillFundamentals() {
  const d = liveData;
  if (!d.epsGrowth && !d.revGrowth) return;
  // EPS growth auto-select in watchlist if ticker matches
  const wItem = watchlist.find(w => w.ticker === d.ticker);
  if (!wItem) return;
  // EPS
  if (d.epsGrowth !== null) {
    if (d.epsGrowth >= 25) setWatchRadio(d.ticker, 'eps', '2');
    else if (d.epsGrowth >= 15) setWatchRadio(d.ticker, 'eps', '1');
    else setWatchRadio(d.ticker, 'eps', '0');
  }
  // Revenue
  if (d.revGrowth !== null) {
    if (d.revGrowth >= 15) setWatchRadio(d.ticker, 'rev', '2');
    else if (d.revGrowth >= 10) setWatchRadio(d.ticker, 'rev', '1');
    else setWatchRadio(d.ticker, 'rev', '0');
  }
}

// ════════════════════════════════════
// CALC ALL
// ════════════════════════════════════
function calcAll() {
  calcRegime(); calcSetup(); calcTF(); calcPos(); calcTP();
  const rs=parseFloat(document.getElementById('rscore').textContent)||0;
  const ss=parseFloat(document.getElementById('setup-snum').textContent)||0;
  const ts=parseFloat(document.getElementById('tf-snum').textContent)||0;
  let finalScore;
  if (liveData && liveData.short_term) {
    finalScore = calculateScore(liveData.short_term, liveData.long_term, liveData.momentum, {
      spyAbove200: liveData.spyAbove200,
      vixNormal: liveData.vixPrice < 25,
      volumeOk: liveData.volRatio < 1.3
    });
  } else {
    finalScore = Math.round(rs*2+ss*2+ts);
  }
  finalScore = Math.min(70, Math.max(0, finalScore));
  document.getElementById('h-score').textContent=finalScore;
  // Unified final decision using macroScore
  const macroForDecision = liveData?.macroScore ?? 4;
  const regimeForDecision = parseFloat(((macroForDecision / 8) * 10).toFixed(1));
  const rs2 = parseFloat(document.getElementById('rscore').textContent) || regimeForDecision;
  const decision = getFinalDecision(finalScore, Math.max(rs2, regimeForDecision));
  const v2 = document.getElementById('rverdict');
  if (decision.startsWith('🟢')) { v2.className='banner b-g vis'; v2.textContent=decision; }
  else if (decision.startsWith('🟡')) { v2.className='banner b-y vis'; v2.textContent=decision; }
  else { v2.className='banner b-r vis'; v2.textContent=decision; }
  // Progress
  const checks=[rs>0,ss>0,ts>0,parseFloat(document.getElementById('ps-nav').value)>0,
    document.querySelector('input[name="e_t"]:checked'),
    document.querySelector('input[name="trm"]:checked'),
    document.getElementById('j-th').value.length>0];
  const pct=Math.round(checks.filter(Boolean).length/7*100);
  document.getElementById('prog-fill').style.width=pct+'%';
  document.getElementById('h-pct').textContent=pct;
}

// ════════════════════════════════════
// LOCALSTORAGE
// ════════════════════════════════════
function save() {
  const state={
    ticker:document.getElementById('h-ticker').value,
    radios:{},checks:{},inputs:{},
    watchlist,journalEntries,liveData
  };
  document.querySelectorAll('input[type=radio]:checked').forEach(r=>{state.radios[r.name]=r.value;});
  document.querySelectorAll('input[type=checkbox]').forEach(c=>{if(c.id)state.checks[c.id]=c.checked;});
  document.querySelectorAll('input[type=number],select,textarea').forEach(i=>{if(i.id)state.inputs[i.id]=i.value;});
  try{localStorage.setItem('its_pro_v2',JSON.stringify(state));}catch(e){}
}

function loadState() {
  try {
    const raw=localStorage.getItem('its_pro_v2');
    if(!raw) return;
    const s=JSON.parse(raw);
    if(s.ticker) document.getElementById('h-ticker').value=s.ticker;
    Object.entries(s.radios||{}).forEach(([n,v])=>{const e=document.querySelector(`input[name="${n}"][value="${v}"]`);if(e)e.checked=true;});
    Object.entries(s.checks||{}).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.checked=v;});
    Object.entries(s.inputs||{}).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.value=v;});
    if(s.watchlist){watchlist=s.watchlist;renderWatchlist();}
    if(s.journalEntries){journalEntries=s.journalEntries;renderJournal();}
    if(s.liveData&&s.liveData.currentPrice){
      liveData=s.liveData;
      updateDataPanel();
      document.getElementById('h-last-fetch').textContent=`📦 ${liveData.fetchTime||'Хуучин'}`;
    }
    calcAll();
  }catch(e){}
}

function newTrade() {
  if(!confirm('Шинэ trade эхлэх үү?')) return;
  document.querySelectorAll('input[type=radio]').forEach(r=>r.checked=false);
  document.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked=false);
  document.querySelectorAll('input[type=number],textarea').forEach(i=>i.value='');
  document.getElementById('h-ticker').value='';
  document.getElementById('ps-risk').value='1.5';
  watchlist=[];renderWatchlist();
  liveData={};
  document.getElementById('data-panel').classList.remove('visible');
  document.getElementById('h-last-fetch').textContent='МЭДЭЭЛЭЛ БАЙХГҮЙ';
  calcAll();
  switchTab(1,document.querySelector('.tab-btn'));
  save();
}

// ════════════════════════════════════
// EVENT LISTENERS
// ════════════════════════════════════
document.addEventListener('change', e => {
  if(e.target.type==='radio'||e.target.type==='checkbox') { calcAll(); save(); }
});
document.addEventListener('input', e => {
  if(e.target.matches('input[type=number],select,textarea')) { calcAll(); save(); }
});

// Pivot dist live calc
document.getElementById('pivot-price')?.addEventListener('input', () => {
  if(liveData.currentPrice && document.getElementById('pivot-price').value) {
    const p=parseFloat(document.getElementById('pivot-price').value);
    const dist=((liveData.currentPrice-p)/p*100);
    document.getElementById('pivot-dist-val').textContent=dist.toFixed(2)+'%';
    document.getElementById('cur-price-setup').textContent='$'+liveData.currentPrice.toFixed(2);
    if(dist>=0&&dist<3) autoSelect('s_dist','2');
    else if(dist>=0&&dist<5) autoSelect('s_dist','1');
    else if(dist>=0&&dist<8) autoSelect('s_dist','0.5');
    else autoSelect('s_dist','0');
  }
});

// Auto-refresh every 5 minutes if ticker is set
setInterval(() => {
  const t = document.getElementById('h-ticker').value;
  if(t) fetchAllData();
}, 5 * 60 * 1000);

// ════════════════════════════════════
// INIT
// ════════════════════════════════════
loadState();
renderWatchlist();
renderJournal();
calcAll();