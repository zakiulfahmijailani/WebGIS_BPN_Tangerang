const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS allowing all origins and JSON parsing
app.use(cors({
  origin: '*'
}));
app.use(express.json());

// Supabase Connection using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 1. GET endpoint for buildings
app.get('/api/buildings', async (req, res) => {
  try {
    const geojsonQuery = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(feature)
      ) 
      FROM (
        SELECT jsonb_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(geom)::jsonb,
          'properties', to_jsonb(inputs) - 'geom'
        ) AS feature 
        FROM (SELECT * FROM tangerang_buildings LIMIT 1000) inputs
      ) features;
    `;

    const result = await pool.query(geojsonQuery);
    res.json(result.rows[0].jsonb_build_object || { type: 'FeatureCollection', features: [] });
  } catch (err) {
    console.error('Error fetching buildings:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. GET endpoint for metrics (Mock Data for Step 1)
app.get('/api/metrics', (req, res) => {
  res.json({
    totalBuildings: 5000,
    totalArea: "1500 sq km"
  });
});

// 3. POST endpoint for chat (Mock Data for Step 1)
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  res.json({
    reply: "I am the WebGIS Agent. I see your message."
  });
});

app.get('/', (req, res) => {
  res.send('WebGIS Backend is running');
});

// Only listen if running locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
  });
}

// Export the app for Vercel Serverless
module.exports = app;
