# ITS Pro — Institutional Trading System

## Архитектур
- **Frontend**: GitHub Pages (`trading-auto.html`)
- **Backend**: Render.com (`server.py`)
- **Data**: Finnhub API

## Deploy заавар

### 1. GitHub Repository үүсгэх
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/its-pro.git
git push -u origin main
```

### 2. Render.com deploy
1. https://render.com → New → Web Service
2. GitHub repo холбох
3. Environment Variables → `FINNHUB_KEY` нэмэх
4. Deploy → URL авах (жнь: `https://its-pro-api.onrender.com`)

### 3. GitHub Pages асаах
1. GitHub repo → Settings → Pages
2. Source: main branch
3. URL: `https://USERNAME.github.io/its-pro`

## API Endpoints
- `GET /health` — Server status
- `GET /quote/NVDA` — Stock quote + technicals
- `GET /cache/clear` — Clear cache
