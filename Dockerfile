FROM node:22-slim

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files and install
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and data
COPY tsconfig.json ./
COPY src/ src/
COPY web/ web/
COPY data/tools/ data/tools/
COPY data/changelog.db data/changelog.db
COPY scripts/ scripts/

# Build TypeScript
RUN npx tsc

# Expose port
EXPOSE 3001

# Start web server
CMD ["node", "dist/web/server.js"]
