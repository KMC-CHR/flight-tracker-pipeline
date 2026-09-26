import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({
    connectionString: config.databaseUrl,
});

export async function checkDatabaseConnection() {
    try {
        const client = await pool.connect();
        client.release();
        return true;
    } catch {
        return false;
    }
}