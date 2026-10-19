# Syntax = docker/dockerfile:1

# Stage 1: Build Stage
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install native compilation dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy root and workspace package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy configuration and source files
COPY tsconfig.base.json ./
COPY shared/ ./shared/
COPY client/ ./client/
COPY server/ ./server/

# Build client and server
RUN npm run build

# Stage 2: Production Runner
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/reviewsite.db

# Install build dependencies required to build native better-sqlite3 in prod
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist

# Create persistent storage mount directory
RUN mkdir -p /data

EXPOSE 3001

# Run server
CMD ["node", "server/dist/index.js"]
