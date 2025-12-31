# Stage 1: Build
FROM node:lts-bookworm AS builder

WORKDIR /app

COPY package*.json ./
COPY worker/package*.json ./worker/

RUN npm ci
RUN cd worker && npm ci

# Copy all source files
COPY . .

# Build the Next.js application
RUN npx @cloudflare/next-on-pages

# Stage 2: Production
FROM node:lts-bookworm AS production

# Install bash and curl for runtime
RUN apt-get update && apt-get install -y curl cron

# Copy runtime dependencies from builder stage
COPY --from=builder /app/ /app/
COPY --from=builder /app/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Expose the Pages port
EXPOSE 8788

ENTRYPOINT ["/entrypoint.sh"]