import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/postgres';

const VALID_LAYERS: Record<string, string> = {
  city: 'kota_tangerang_city_boundary',
  kecamatan: 'kota_tangerang_kecamatan_boundary',
  kelurahan: 'kota_tangerang_kelurahan_boundary',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ layer: string }> }
) {
  const { layer } = await params;
  const tableName = VALID_LAYERS[layer];

  if (!tableName) {
    return NextResponse.json({ error: 'Invalid boundary layer type' }, { status: 400 });
  }

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
        FROM (SELECT * FROM ${tableName}) inputs
      ) features;
    `;
    const result = await pool.query(geojsonQuery);
    const geojson = result.rows[0]?.result || { type: 'FeatureCollection', features: [] };
    return NextResponse.json(geojson);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error fetching boundary ${layer}:`, msg);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
