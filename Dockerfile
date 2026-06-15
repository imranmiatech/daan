# --- Stage 1: Dependencies ---
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package configurations
COPY package.json package-lock.json ./
# Copy prisma schema to generate client
COPY prisma ./prisma

# Install dependencies and generate Prisma client
RUN npm ci

# --- Stage 2: Builder ---
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependency tree and source code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the NestJS application
RUN npm run build

# Prune dev dependencies to minimize final image footprint
RUN npm prune --omit=dev

# --- Stage 3: Production Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create secure system group and user, assign ownership
RUN mkdir -p /app && chown -R node:node /app

# Switch to non-root user
USER node

# Copy build artifacts and pruned dependencies
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
# Prisma engines and schema required at runtime for migrations/queries
COPY --from=builder --chown=node:node /app/prisma ./prisma

# Expose NestJS port
EXPOSE 3000

# Configure healthcheck using wget (pre-installed in Alpine)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Graceful shutdown handling using dumb-init or direct node runner
CMD ["node", "dist/main.js"]
