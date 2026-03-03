import { Pool } from 'pg';

// Server-side only: direct PostgreSQL/PostGIS connection via pg Pool
// This is used in API routes for executing raw PostGIS SQL queries
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

export default pool;
