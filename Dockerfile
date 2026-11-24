# ==============================================================================
# Koroush Barber — Production Multi-Stage Dockerfile
# Optimized for Next.js 14 Standalone Output with Node.js 20 Alpine & PostgreSQL
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Base Layer
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl wget curl
RUN npm install -g npm@latest

# ------------------------------------------------------------------------------
# 2. Dependencies Layer
# ------------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ------------------------------------------------------------------------------
# 3. Builder Layer
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client for PostgreSQL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate

# Build Next.js in standalone mode
RUN npm run build

# ------------------------------------------------------------------------------
# 4. Production Runner Layer
# ------------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Install Prisma CLI globally for standalone migration deployment
RUN npm install -g prisma@5.21.1

# Create non-root system user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets and standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Make entrypoint script executable
RUN chmod +x ./docker-entrypoint.sh

# Change ownership of app directory
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Docker Healthcheck targeting the application health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
