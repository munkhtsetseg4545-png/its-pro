from flask import Flask, jsonify
from flask_cors import CORS
import requests, time, os

app = Flask(__name__)
CORS(app)

CACHE = {}
CACHE_TTL = 300

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
}

def yf_get(ticker):
    sym = ticker.upper().replace('%5E', '^')
    url = f'https://query2.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=1y'
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()

def calc_rsi(closes, p=14):
    if len(closes) < p + 1: return 50
    gains = losses = 0
    for i in range(len(closes) - p, len(closes)):
        d = closes[i] - closes[i-1]
        if d > 0: gains += d
        else: losses -= d
    ag = gains / p; al = losses / p
    if al == 0: return 100
    return round(100 - (100 / (1 + ag / al)), 1)

def calc_ema(data, p):
    if len(data) < p: p = len(data)
    k = 2 / (p + 1)
    e = sum(data[:p]) / p
    for v in data[p:]: e = v * k + e * (1 - k)
    return round(e, 2)

def calc_atr(h, l, c, p=14):
    trs = [max(h[i]-l[i], abs(h[i]-c[i-1]), abs(l[i]-c[i-1])) for i in range(1, len(c))]
    return round(sum(trs[-p:]) / min(p, len(trs)), 2) if trs else 0

def get_quote(sym):
    now = time.time()
    if sym in CACHE and now - CACHE[sym]['ts'] < CACHE_TTL:
        return CACHE[sym]['data']

    data = yf_get(sym)
    res = data['chart']['result'][0]
    meta = res['meta']
    q = res['indicators']['quote'][0]

    closes = [float(x) for x in q['close'] if x is not None]
    highs  = [float(x) for x in q['high']  if x is not None]
    lows   = [float(x) for x in q['low']   if x is not None]
    vols   = [float(x) for x in q['volume'] if x is not None]

    cur  = float(meta.get('regularMarketPrice', closes[-1]))
    prev = float(meta.get('previousClose', closes[-2] if len(closes)>1 else cur))
    h52  = float(meta.get('fiftyTwoWeekHigh', max(closes)))
    l52  = float(meta.get('fiftyTwoWeekLow', min(closes)))
    chg  = round((cur-prev)/prev*100, 2) if prev else 0
    dist = round((h52-cur)/h52*100, 2) if h52 else 0

    ema21  = calc_ema(closes, 21)
    ema50  = calc_ema(closes, 50)
    ema200 = calc_ema(closes, min(200, len(closes)))
    rsi    = calc_rsi(closes)
    atr    = calc_atr(highs, lows, closes)
    avgvol = round(sum(vols[-20:]) / min(20, len(vols)))
    curvol = int(vols[-1]) if vols else 0
    volr   = round(curvol/avgvol, 2) if avgvol else 1.0

    result = {
        'ticker': sym, 'price': round(cur,2), 'prev_close': round(prev,2),
        'change_pct': chg, 'high_52w': round(h52,2), 'low_52w': round(l52,2),
        'dist_from_52h': dist, 'ema21': ema21, 'ema50': ema50, 'ema200': ema200,
        'rsi14': rsi, 'atr14': atr, 'avg_vol': avgvol, 'cur_vol': curvol,
        'vol_ratio': volr, 'sector': 'N/A', 'industry': 'N/A',
        'eps_growth': None, 'rev_growth': None, 'next_earnings': 'N/A',
        'cache_time': time.strftime('%H:%M:%S')
    }
    CACHE[sym] = {'data': result, 'ts': time.time()}
    print(f"OK: {sym} ${cur} RSI:{rsi} EMA200:{ema200}")
    return result

@app.route('/')
def index():
    return jsonify({'status': 'ITS Pro API', 'version': '2.0', 'source': 'Yahoo Finance'})

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'cached': list(CACHE.keys())})

@app.route('/quote/<ticker>')
def quote(ticker):
    sym = ticker.upper().replace('%5E', '^')
    try:
        return jsonify(get_quote(sym))
    except Exception as e:
        print(f"ERR {sym}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/cache/clear')
def clear():
    CACHE.clear()
    return jsonify({'status': 'cleared'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5050))
    app.run(host='0.0.0.0', port=port)
