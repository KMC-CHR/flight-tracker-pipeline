# AeroPulse Concierge — Tactical Telemetry & Flight Tracker Pipeline

A production-ready, real-time flight tracking application and automated CI/CD pipeline built with **Fastify (Node.js 20)**, **HTML5 Canvas**, **Tailwind CSS**, and **PostgreSQL**.

---

## Overview

**AeroPulse** provides real-time airspace telemetry with an interactive world radar display and physical luxury boarding pass cards. It integrates live ADS-B flight feeds (via OpenSky Network) with high-availability fallback simulation, strict API ingestion validation, and an automated GitHub Actions CI/CD pipeline.

### Highlights
- **Interactive Telemetry Map**: Custom HTML5 Canvas flight corridor rendering, quadratic Bézier trajectories, retina/mobile DPR scaling, and smooth airplane animations.
- **Concierge Boarding Pass Card**: Interactive flight telemetry drawer featuring dynamic IATA standard barcodes (Code 128 via JsBarcode), custom PNR generation, route details, and squawk codes.
- **Enterprise Security**: Hardened HTTP security headers (`@fastify/helmet`), rate limiting (`@fastify/rate-limit`), and authenticated schema-validated ingestion endpoints (`/api/telemetry`).
- **Resilient Data Ingestion**: Live OpenSky Network ADS-B telemetry stream with non-blocking timeouts and autonomous fallback telemetry engine.
- **Hardened CI/CD Pipeline**: Multi-track GitHub Actions workflow with ESLint, dependency security auditing (`npm audit`), Vitest integration testing with PostgreSQL service container, and cached Docker image builds.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js (v20 ESM), Fastify 5, PostgreSQL (`pg`) |
| **Security** | `@fastify/helmet`, `@fastify/rate-limit`, JSON Schema Validation |
| **Frontend** | HTML5 Canvas, Tailwind CSS, JsBarcode, Google Fonts |
| **Testing** | Vitest (Integration with DB container) |
| **CI/CD & DevOps** | GitHub Actions, Docker (Multi-stage / Alpine), Docker Buildx |

---

## Project Structure

```
flight-tracker-pipeline/
├── .github/
│   └── workflows/
│       └── pipeline.yml       # GitHub Actions CI/CD Pipeline
├── public/
│   ├── index.html             # Frontend interface & HTML5 Canvas telemetry map
│   └── world.svg              # World vector base map
├── src/
│   ├── config.js              # Environment variable configurations
│   ├── db.js                  # PostgreSQL connection pool & health checks
│   ├── index.js               # Application entry point
│   └── server.js              # Fastify server, routes, rate limits, & telemetry engine
├── tests/
│   └── integration.test.js    # Vitest integration tests for API & database health
├── scripts/
│   ├── ai-audit.js            # Git diff analyzer / SLM security scanner script
│   └── ai-pr-reviewer.js      # Automated PR review script
├── Dockerfile                 # Minimal production Dockerfile (node:20-alpine3.20)
├── eslint.config.js           # ESLint configuration
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- [PostgreSQL](https://www.postgresql.org/) (optional for standalone local demo, required for `/health` endpoint and integration tests)
- [Docker](https://www.docker.com/) (optional, for containerized deployment)

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd flight-tracker-pipeline
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory (optional defaults provided in `src/config.js`):

```env
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/app_test
INGESTION_API_KEY=aeropulse_secret_key_2026
```

### 3. Running the Server

Start the application:

```bash
npm start
```

Visit **`http://localhost:3000`** in your browser.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Starts the production server (`node src/index.js`) |
| `npm run lint` | Runs ESLint over the `src/` codebase |
| `npm run test:integration` | Executes Vitest integration test suite |

---

## API Endpoints

### 1. Live Flight Stream
- **`GET /api/live-flights`**
  - Fetches live airspace telemetry from OpenSky Network or falls back to synthetic data if the external service is unavailable.
  - Rate limited to 30 requests per minute per IP.

### 2. Telemetry Ingestion (Protected)
- **`POST /api/telemetry`**
  - Ingests real-time custom telemetry data with strict JSON schema validation.
  - Headers: `x-api-key: <INGESTION_API_KEY>`
  - Body:
    ```json
    {
      "flight_id": "UAE-091",
      "lat": 25.2532,
      "lng": 55.3644,
      "status": "In-Flight",
      "altitude": 38000,
      "speed": 485
    }
    ```

### 3. Health Check
- **`GET /health`**
  - Verifies PostgreSQL database connectivity and service readiness.
  - Returns `200 OK` (`{"status": "healthy", "db": "connected"}`) or `503 Service Unavailable`.

---

## Docker Deployment

Build and run the container locally:

```bash
# Build the Docker image
docker build -t aeropulse-app:latest .

# Run the container
docker run -p 3000:3000 -e PORT=3000 aeropulse-app:latest
```

---

## CI/CD Pipeline

The automated GitHub Actions workflow (`.github/workflows/pipeline.yml`) executes on every push and pull request to `master`:

1. **Parallel Track A: Quality & Security Gate**
   - ESLint code quality checks.
   - High-severity vulnerability scan via `npm audit`.
2. **Parallel Track B: Integration Testing**
   - Spins up a live PostgreSQL 15 service container.
   - Executes Vitest integration test suite.
3. **Container Build & Cache**
   - Builds the production Docker image with GitHub Actions caching enabled.
