FROM node:20-alpine3.20

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only using the modern npm flag
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY src ./src

EXPOSE 3000

USER node

CMD ["node", "src/index.js"]