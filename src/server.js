import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDatabaseConnection } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HUBS = [
    [-73.7781, 40.6413],  // JFK (New York)
    [-0.4543, 51.4700],   // LHR (London)
    [2.5500, 49.0097],    // CDG (Paris)
    [55.3644, 25.2532],   // DXB (Dubai)
    [103.9915, 1.3644],   // SIN (Singapore)
    [139.7798, 35.5494],  // HND (Tokyo)
    [151.1772, -33.9461], // SYD (Sydney)
    [-118.4085, 33.9416], // LAX (Los Angeles)
    [-23.5505, -46.6333], // GRU (São Paulo)
    [28.2460, -26.1367]   // JNB (Johannesburg)
];

function hubDistance(a, b) {
    const dLon = a[0] - b[0];
    const dLat = a[1] - b[1];
    return Math.sqrt(dLon * dLon + dLat * dLat);
}

function pickCorridorForPlane(lon, lat, headingDeg) {
    const pos = [lon, lat];

    let nearestHub = HUBS[0];
    let nearestDist = Infinity;
    HUBS.forEach(hub => {
        const d = hubDistance(pos, hub);
        if (d < nearestDist) {
            nearestDist = d;
            nearestHub = hub;
        }
    });

    const headingRad = (headingDeg * Math.PI) / 180;
    const headingVec = [Math.sin(headingRad), -Math.cos(headingRad)];

    let bestHub = null;
    let bestScore = -Infinity;
    HUBS.forEach(hub => {
        if (hub === nearestHub) return;
        const toHub = [hub[0] - pos[0], hub[1] - pos[1]];
        const mag = Math.sqrt(toHub[0] * toHub[0] + toHub[1] * toHub[1]) || 1;
        const alignment = (toHub[0] * headingVec[0] + toHub[1] * headingVec[1]) / mag;
        const score = alignment * 2 + mag * 0.01;
        if (score > bestScore) {
            bestScore = score;
            bestHub = hub;
        }
    });

    if (!bestHub) {
        bestHub = HUBS[(HUBS.indexOf(nearestHub) + 1) % HUBS.length];
    }

    return { origin: nearestHub, destination: bestHub };
}

function generateFallbackFlights(count = 40) {
    const airlines = ['Delta', 'United', 'Emirates', 'Lufthansa', 'Qatar', 'Cathay', 'Singapore', 'ANA', 'Qantas'];
    const hubs = HUBS;
    const flights = [];

    for (let i = 0; i < count; i++) {
        const origin = hubs[i % hubs.length];
        const dest = hubs[(i + 1 + Math.floor(Math.random() * (hubs.length - 1))) % hubs.length];

        const startX = (origin[0] + 180) / 360;
        const startY = (90 - origin[1]) / 180;
        const endX = (dest[0] + 180) / 360;
        const endY = (90 - dest[1]) / 180;

        const isOnGround = i % 8 === 0;

        flights.push({
            id: `${airlines[i % airlines.length].substring(0, 2).toUpperCase()}-${100 + Math.floor(Math.random() * 900)}`,
            airline: `${airlines[i % airlines.length]} Airways`,
            route: `Sector GT-${10 + i}`,
            status: isOnGround ? 'On-Ground' : 'In-Flight',
            alt: isOnGround ? 'Ground Level' : `${(28000 + Math.floor(Math.random() * 12000)).toLocaleString()} ft`,
            speed: isOnGround ? '0 kts' : `${420 + Math.floor(Math.random() * 120)} kts`,
            start: [startX, startY],
            end: [endX, endY],
            progress: Math.random(),
            speedVal: 0.0003 + Math.random() * 0.0004,
            color: isOnGround ? '#F59E0B' : '#06B6D4'
        });
    }

    return flights;
}

export function buildServer() {
    const server = Fastify({ logger: false });

    // 1. Protection Against Common Web Vulnerabilities (Security Headers)
    server.register(fastifyHelmet, {
        contentSecurityPolicy: false,
    });

    // 2. Protection Against DoS / Spam (Rate Limit: Max 30 Requests Per Minute Per IP)
    server.register(fastifyRateLimit, {
        max: 30,
        timeWindow: '1 minute',
    });

    server.register(fastifyStatic, {
        root: path.join(__dirname, '../public'),
        prefix: '/',
    });

    // 3. Strict Input Validation Schema for Ingesting Custom Flight Data
    const telemetryIngestionSchema = {
        body: {
            type: 'object',
            required: ['flight_id', 'lat', 'lng', 'status'],
            properties: {
                flight_id: { type: 'string', minLength: 3, maxLength: 10 },
                lat: { type: 'number', minimum: -90, maximum: 90 },
                lng: { type: 'number', minimum: -180, maximum: 180 },
                status: { type: 'string', enum: ['In-Flight', 'On-Ground', 'Delayed'] },
                altitude: { type: 'number', minimum: 0, maximum: 60000 },
                speed: { type: 'number', minimum: 0, maximum: 1000 },
            },
            additionalProperties: false, // Rejects unauthorized or unknown fields
        },
    };

    // 4. Protected Route: Requires Secret API Key
    server.post('/api/telemetry', { schema: telemetryIngestionSchema }, async (request, reply) => {
        const apiKey = request.headers['x-api-key'];
        const validKey = process.env.INGESTION_API_KEY || 'aeropulse_secret_key_2026';

        if (!apiKey || apiKey !== validKey) {
            return reply.status(401).send({ error: 'Unauthorized', message: 'Missing or invalid API key' });
        }

        return reply.status(201).send({ status: 'success', data: request.body });
    });

    // Read-Only Flight Data Stream
    server.get('/api/live-flights', async (request, reply) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch('https://opensky-network.org/api/states/all', {
                signal: controller.signal
            }).catch(() => null);

            clearTimeout(timeoutId);

            if (response && response.ok) {
                const data = await response.json();
                const rawStates = (data.states || []).filter(state =>
                    state[5] !== null &&
                    state[6] !== null &&
                    state[5] >= -180 && state[5] <= 180 &&
                    state[6] >= -85 && state[6] <= 85
                );

                if (rawStates.length > 0) {
                    const formattedFlights = rawStates.slice(0, 60).map((state) => {
                        const lon = state[5];
                        const lat = state[6];
                        const heading = state[10] !== null ? state[10] : Math.random() * 360;

                        const { origin, destination } = pickCorridorForPlane(lon, lat, heading);

                        const startX = (origin[0] + 180) / 360;
                        const startY = (90 - origin[1]) / 180;
                        const endX = (destination[0] + 180) / 360;
                        const endY = (90 - destination[1]) / 180;

                        const realX = (lon + 180) / 360;
                        const totalDx = endX - startX;
                        const totalDy = endY - startY;
                        const segLenSq = totalDx * totalDx + totalDy * totalDy || 1;
                        const t = ((realX - startX) * totalDx + ((90 - lat) / 180 - startY) * totalDy) / segLenSq;
                        const progress = Math.max(0.02, Math.min(0.98, t));

                        return {
                            id: state[1] ? state[1].trim() : state[0].toUpperCase(),
                            airline: state[2] || 'Global Sector Carrier',
                            route: `${state[2] || 'International'} Track`,
                            status: state[8] ? 'On-Ground' : 'In-Flight',
                            alt: state[7] ? `${Math.round(state[7] * 3.28084).toLocaleString()} ft` : 'Ground Level',
                            speed: state[9] ? `${Math.round(state[9] * 1.94384)} kts` : '0 kts',
                            start: [startX, startY],
                            end: [endX, endY],
                            progress: progress,
                            speedVal: 0.0003 + Math.random() * 0.0003,
                            color: state[8] ? '#F59E0B' : '#06B6D4'
                        };
                    });

                    return reply.status(200).send({
                        timestamp: new Date().toISOString(),
                        source: 'OpenSky Network Live API',
                        total_active: formattedFlights.length,
                        data: formattedFlights
                    });
                }
            }

            const fallbackData = generateFallbackFlights(40);
            return reply.status(200).send({
                timestamp: new Date().toISOString(),
                source: 'Telemetry Data Engine (Fallback Stream)',
                total_active: fallbackData.length,
                data: fallbackData
            });

        } catch (error) {
            const fallbackData = generateFallbackFlights(35);
            return reply.status(200).send({
                timestamp: new Date().toISOString(),
                source: 'Telemetry Data Engine (Recovery Mode)',
                total_active: fallbackData.length,
                data: fallbackData
            });
        }
    });

    server.get('/', async (request, reply) => {
        return reply.sendFile('index.html');
    });

    server.get('/health', async (request, reply) => {
        const dbHealthy = await checkDatabaseConnection();
        if (!dbHealthy) {
            return reply.status(503).send({ status: 'unhealthy', db: 'disconnected' });
        }
        return reply.status(200).send({ status: 'healthy', db: 'connected' });
    });

    return server;
}