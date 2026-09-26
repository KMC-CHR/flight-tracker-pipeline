import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.js';
import { pool } from '../src/db.js';

describe('Integration Tests: System Health', () => {
    const app = buildServer();

    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
        await pool.end();
    });

    it('GET /health returns 200 and healthy status when DB is connected', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/health',
        });

        expect(response.statusCode).toBe(200);
        const payload = JSON.parse(response.payload);
        expect(payload.status).toBe('healthy');
        expect(payload.db).toBe('connected');
    });
});