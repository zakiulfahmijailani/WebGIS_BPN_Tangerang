# TangerangLandUse-WebGIS

WebGIS application for managing land-use data in Kota Tangerang, Banten, Indonesia.  
Built with **FastAPI + Supabase PostgreSQL** (backend) and **React + Vite + Leaflet** (frontend).  
Deployable on **Vercel**.

---

## Architecture

```
/api/index.py       → FastAPI serverless function (Vercel Python runtime)
/frontend/          → React + Vite + Leaflet SPA
/vercel.json        → Routes /api/* → Python, /* → frontend static
```

All data lives in **Supabase PostgreSQL** (table: `land_use_polygons`).

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Supabase project with PostGIS enabled

### 1. Set up environment

```bash
cp .env.example .env
# Edit .env and set your DATABASE_URL
```

### 2. Create database table (first time only)

Connect to your Supabase SQL Editor and run:

```sql
CREATE TABLE IF NOT EXISTS land_use_polygons (
    id          SERIAL PRIMARY KEY,
    zone_id     VARCHAR(50)   NOT NULL,
    category    VARCHAR(50)   NOT NULL,
    area_ha     REAL          NOT NULL DEFAULT 0,
    district    VARCHAR(100)  NOT NULL DEFAULT '',
    description TEXT          DEFAULT '',
    geometry    TEXT          NOT NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

### 3. Start the backend

```bash
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173 (proxies /api to localhost:8000)
```

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Set **Root Directory** to `.` (repo root).
4. Add environment variable: `DATABASE_URL` = your Supabase connection string.
5. Deploy — Vercel auto-detects the Python function and frontend build.

---

## API Endpoints

| Method   | Path                   | Description                |
|----------|------------------------|----------------------------|
| `GET`    | `/api/landuse`         | List all polygons (GeoJSON)|
| `POST`   | `/api/landuse`         | Create polygon(s)          |
| `PUT`    | `/api/landuse/{id}`    | Update polygon             |
| `DELETE` | `/api/landuse/{id}`    | Delete polygon             |
| `POST`   | `/api/landuse/upload`  | Upload GeoJSON file        |
| `POST`   | `/api/report`          | Generate PNG map report    |

---

## Tech Stack

- **Backend**: FastAPI, psycopg2, Supabase PostgreSQL
- **Frontend**: React 19, Vite 7, Leaflet, Chart.js
- **Deployment**: Vercel (Python serverless + static frontend)
