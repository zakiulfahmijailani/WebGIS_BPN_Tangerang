# Tangerang Buildings WebGIS

A production-ready WebGIS application for visualizing building footprints in Tangerang City. Built with Supabase (PostGIS), Node.js, and React.

## 🚀 Tech Stack

- **Frontend**: React (Vite), React-Leaflet, TailwindCSS
- **Backend**: Node.js, Express.js, `pg` (node-postgres)
- **Database**: Supabase (PostgreSQL + PostGIS)

## 📁 Project Structure

```text
/
├── backend/          # Node.js/Express server
├── frontend/         # React/Vite application
└── README.md         # Documentation
```

## 🛠️ Setup Instructions

### 1. Database Setup (Supabase)

1. Create a new project on [Supabase](https://supabase.com/).
2. Enable PostGIS extension by running this in the SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Upload your `tangerang_buildings.geojson` using `ogr2ogr`. Run the following command locally (ensure you have GDAL installed):
   ```bash
   ogr2ogr -f "PostgreSQL" PG:"host=db.[your-project-ref].supabase.co user=postgres password=[your-password] dbname=postgres" "tangerang_buildings.geojson" -nln tangerang_buildings -nlt PROMOTE_TO_MULTI
   ```
   > [!NOTE]
   > Replace `[your-project-ref]` and `[your-password]` with your Supabase credentials.

### 2. Backend Setup

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and add your Supabase `DATABASE_URL`.
4. Start the server:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:5000`.

### 3. Frontend Setup

1. Navigate to the `frontend` folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` (usually `VITE_API_URL=http://localhost:5000/api/buildings`).
4. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

## 🚀 Deployment to Vercel

1.  Push your code to a GitHub repository.
2.  Connect the repository to **Vercel**.
3.  Add the following **Environment Variable** in Vercel settings:
    - `DATABASE_URL`: Your Supabase connection string.
4.  Vercel will automatically detect the `vercel.json` and deploy both the frontend and backend under a single URL.

## 📍 API Endpoints

- `GET /api/buildings`: Returns building footprints as a GeoJSON FeatureCollection.

## 🎨 Design Features

- **Dark Mode UI**: Sleek, modern interface using Slate and Emerald color palettes.
- **Interactive Map**: Hover effects, smooth popups, and custom styling for building layers.
- **Performance**: Optimized SQL query using PostGIS `ST_AsGeoJSON` for efficient data transfer.
