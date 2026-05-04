from flask import Flask, jsonify
from flask_cors import CORS
import requests, time, os, random
try:
    import yfinance as yf
    HAS_YF = True
except:
    HAS_YF = False

app = Flask(__name__)
CORS(app)

FINNHUB_KEY = os.environ.get('FINNHUB_KEY', '')
BASE = 'https://finnhub.io/api/v1'
CACHE = {}
CACHE_TTL = 300

def fh(endpoint, params={}):
    params['token'] = FINNHUB_KEY
    r = requests.get(BASE + endpoint, params=params, timeout=15)
    r.raise_for_status()
    return r.json()

def get_candles_yfinance(sym):
    """yfinance ашиглан candle татах"""
    ticker = yf.Ticker(sym)
    hist = ticker.history(period='1y', interval='1d')
    if hist.empty:
        return None
    closes = hist['Close'].tolist()
    highs  = hist['High'].tolist()
    lows   = hist['Low'].tolist()
    vols   = hist['Volume'].tolist()
    return closes, highs, lows, vols

def get_candles_yahoo_direct(sym):
    """Yahoo Finance direct API"""
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    ]
    headers = {
        'User-Agent': random.choice(user_agents),
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com/',
    }
    for base_url in ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']:
        try:
            r = requests.get(
                f'{base_url}/v8/finance/chart/{sym}',
                params={'range': '1y', 'interval': '1d', 'includePrePost': 'false'},
                headers=headers, timeout=15
            )
            if r.status_code == 200:
                data = r.json()
                result = data.get('chart', {}).get('result', [])
                if result:
                    q = result[0]['indicators']['quote'][0]
                    zipped = [(c,h,l,v) for c,h,l,v in zip(
                        q.get('close',[]), q.get('high',[]),
                        q.get('low',[]), q.get('volume',[])
                    ) if c and h and l]
                    if zipped:
                        return ([x[0] for x in zipped], [x[1] for x in zipped],
                                [x[2] for x in zipped], [x[3] or 0 for x in zipped])
        except Exception as e:
            print(f'Yahoo direct {base_url} failed: {e}')
    return None

def get_yahoo_candles(sym):
    """yfinance эхлээд, дараа direct API"""
    if HAS_YF:
        try:
            result = get_candles_yfinance(sym)
            if result:
                return result
        except Exception as e:
            print(f'yfinance failed: {e}')
    return get_candles_yahoo_direct(sym)

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

    q = fh('/quote', {'symbol': sym})
    if not q or q.get('c', 0) == 0:
        raise Exception(f'Ticker олдсонгүй: {sym}')

    cur = float(q['c']); prev = float(q['pc'])
    chg = round((cur - prev) / prev * 100, 2) if prev else 0

    try:
        candle_data = get_yahoo_candles(sym)
    except:
        candle_data = None

    if candle_data:
        closes, highs, lows, vols = candle_data
        h52 = max(closes); l52 = min(closes)
        dist = round((h52 - cur) / h52 * 100, 2)
        ema21  = calc_ema(closes, 21)
        ema50  = calc_ema(closes, 50)
        ema200 = calc_ema(closes, min(200, len(closes)))
        rsi    = calc_rsi(closes)
        atr    = calc_atr(highs, lows, closes)
        avgvol = round(sum(vols[-20:]) / min(20, len(vols))) if vols else 0
        curvol = int(vols[-1]) if vols else 0
        volr   = round(curvol / avgvol, 2) if avgvol else 1.0
    else:
        h52 = l52 = cur; dist = 0
        ema21 = ema50 = ema200 = cur
        rsi = 50; atr = round(cur * 0.02, 2)
        avgvol = curvol = 0; volr = 1.0

    sector = 'N/A'
    try:
        p2 = fh('/stock/profile2', {'symbol': sym})
        sector = p2.get('finnhubIndustry', 'N/A')
    except: pass

    short_term = "bullish" if cur > ema21 and cur > ema50 else "bearish"
    long_term  = "bullish" if cur > ema200 else "bearish"
    if rsi > 70: momentum = "strong"
    elif rsi < 30: momentum = "weak"
    else: momentum = "neutral"
    if short_term == "bullish" and long_term == "bullish": regime = "strong_uptrend"
    elif short_term == "bullish" and long_term == "bearish": regime = "counter_trend_rally"
    elif short_term == "bearish" and long_term == "bullish": regime = "pullback"
    else: regime = "downtrend"
    ema_align = sum([cur > ema21, cur > ema50, cur > ema200])

    result = {
        'ticker': sym, 'price': round(cur, 2), 'prev_close': round(prev, 2),
        'change_pct': chg, 'high_52w': round(h52, 2), 'low_52w': round(l52, 2),
        'dist_from_52h': dist, 'ema21': ema21, 'ema50': ema50, 'ema200': ema200,
        'rsi14': rsi, 'atr14': atr, 'avg_vol': avgvol, 'cur_vol': curvol,
        'vol_ratio': volr, 'sector': sector, 'industry': 'N/A',
        'eps_growth': None, 'rev_growth': None, 'next_earnings': 'N/A',
        'cache_time': time.strftime('%H:%M:%S'),
        'short_term': short_term, 'long_term': long_term,
        'momentum': momentum, 'regime': regime, 'ema_align': ema_align,
        'data_source': 'yfinance' if HAS_YF else 'yahoo_direct',
    }
    CACHE[sym] = {'data': result, 'ts': time.time()}
    return result

@app.route('/')
def index():
    return jsonify({'status': 'ITS Pro API', 'version': '2.2', 'yfinance': HAS_YF})

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'cached': list(CACHE.keys()), 'yfinance': HAS_YF})

@app.route('/quote/<ticker>')
def quote(ticker):
    sym = ticker.upper().replace('%5E', '^')
    if sym in ('^VIX', 'VIX', '%5EVIX'):
        try:
            q = fh('/quote', {'symbol': '^VIX'})
            return jsonify({'ticker': 'VIX', 'price': float(q.get('c', 20)), 'ema200': 20.0})
        except:
            return jsonify({'ticker': 'VIX', 'price': 20.0, 'ema200': 20.0})
    try:
        return jsonify(get_quote(sym))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/cache/clear')
def clear_cache():
    CACHE.clear()
    return jsonify({'status': 'cleared'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5050))
    app.run(host='0.0.0.0', port=port)
