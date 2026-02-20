const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Supabase Connection using DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// GET endpoint for buildings
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

app.get('/', (req, res) => {
    res.send('WebGIS Backend is running');
});

app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
});
