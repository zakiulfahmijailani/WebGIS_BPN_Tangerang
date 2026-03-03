import { NextResponse } from 'next/server';
import pool from '@/lib/postgres';

export async function GET() {
  try {
    const geojsonQuery = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(feature), '[]'::jsonb)
      ) AS result
      FROM (
        SELECT jsonb_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(geom)::jsonb,
          'properties', to_jsonb(inputs) - 'geom'
        ) AS feature 
        FROM (SELECT * FROM tangerang_buildings LIMIT 2000) inputs
      ) features;
    `;

    const result = await pool.query(geojsonQuery);
    const geojson = result.rows[0]?.result || { type: 'FeatureCollection', features: [] };
    return NextResponse.json(geojson);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error fetching buildings:', msg);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
