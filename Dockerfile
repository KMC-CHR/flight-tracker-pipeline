FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src ./src

EXPOSE 3000

USER node

CMD ["node", "src/index.js"]