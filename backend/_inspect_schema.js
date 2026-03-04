require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    const tables = [
        'kota_tangerang_kelurahan_boundary',
        'kota_tangerang_kecamatan_boundary',
        'kota_tangerang_city_boundary',
        'tangerang_buildings',
        'uploaded_layers',
        'semantic_query_cache',
        'ai_map_updates'
    ];

    for (const t of tables) {
        const res = await pool.query(
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`,
            [t]
        );
        console.log(`\n--- ${t} (${res.rows.length} cols) ---`);
        res.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));
    }
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
